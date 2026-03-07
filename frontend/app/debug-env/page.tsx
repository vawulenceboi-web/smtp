'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [info, setInfo] = useState<{
    apiUrl: string;
    origin: string;
    pathname: string;
    nodeEnv: string;
    timestamp: string;
    testResult?: { status: number; data?: any; error?: string };
  } | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT SET';
    const info = {
      apiUrl,
      origin: window.location.origin,
      pathname: window.location.pathname,
      nodeEnv: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
    };

    setInfo(info as any);

    // Log to console
    console.clear();
    console.log('%c🔧 FRONTEND DEBUG INFO', 'font-size: 16px; font-weight: bold; color: #0066cc;');
    console.log('%c🌍 Environment', 'font-size: 14px; font-weight: bold; color: #0066cc;');
    console.log(`  NEXT_PUBLIC_API_URL: ${apiUrl}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`  Browser Origin: ${window.location.origin}`);
    console.log('%c📍 What this means:', 'font-size: 12px; font-weight: bold;');
    if (apiUrl === 'NOT SET') {
      console.warn('%c❌ API URL NOT SET', 'color: red; font-weight: bold;');
      console.log('   → API requests will be RELATIVE (e.g., /api/relays/test-connection)');
      console.log('   → This means requests go to:', window.location.origin + '/api/relays/test-connection');
      console.log('   → This will FAIL with 404 because the frontend host is not the backend!');
      console.log('%cFIX:', 'color: red; font-weight: bold;');
      console.log('   In Vercel: Set NEXT_PUBLIC_API_URL environment variable');
      console.log('   Example: https://your-backend-railway-url.railway.app');
    } else {
      console.log('%c✅ API URL IS SET', 'color: green; font-weight: bold;');
      console.log('   → API requests will be sent to:', apiUrl);
    }
  }, []);

  const testHealthEndpoint = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      alert('❌ NEXT_PUBLIC_API_URL is not set. Cannot test.');
      return;
    }

    try {
      console.log('🧪 Testing health endpoint...');
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setInfo({
        ...info!,
        testResult: { status: response.status, data },
      });
      console.log('✅ Health check success:', { status: response.status, data });
    } catch (error) {
      setInfo({
        ...info!,
        testResult: {
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      console.error('❌ Health check failed:', error);
    }
  };

  const testRelaysEndpoint = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      alert('❌ NEXT_PUBLIC_API_URL is not set. Cannot test.');
      return;
    }

    try {
      console.log('🧪 Testing relays endpoint...');
      const response = await fetch(`${apiUrl}/api/relays/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: 'smtp.gmail.com',
          port: 587,
          username: 'test@example.com',
          password: 'test123',
          use_tls: true,
        }),
      });
      const data = await response.json();
      setInfo({
        ...info!,
        testResult: { status: response.status, data },
      });
      console.log('Response:', { status: response.status, data });
    } catch (error) {
      setInfo({
        ...info!,
        testResult: {
          status: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      console.error('❌ Test connection failed:', error);
    }
  };

  if (!info) return <div className="p-8">Loading...</div>;

  const apiUrlSet = info.apiUrl !== 'NOT SET';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border border-slate-700 rounded-lg p-6 bg-slate-900">
          <h1 className="text-3xl font-bold text-white mb-6">🔧 Frontend Debug Dashboard</h1>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">NEXT_PUBLIC_API_URL</p>
              <p className={`font-mono text-sm break-all ${apiUrlSet ? 'text-green-400' : 'text-red-400'}`}>
                {info.apiUrl}
              </p>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">NODE_ENV</p>
              <p className="font-mono text-sm">{info.nodeEnv}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Browser Origin</p>
              <p className="font-mono text-sm break-all">{info.origin}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Timestamp</p>
              <p className="font-mono text-sm">{info.timestamp}</p>
            </div>
          </div>

          {!apiUrlSet && (
            <div className="bg-red-900 border border-red-700 rounded p-4 mb-6">
              <div className="text-red-200 font-semibold mb-2">❌ CRITICAL: NEXT_PUBLIC_API_URL Not Set</div>
              <div className="text-red-100 text-sm space-y-2">
                <p>This is why you're getting 404 errors!</p>
                <p className="font-mono bg-red-950 p-2 rounded">
                  Requests will go to: {info.origin}/api/relays/test-connection (WRONG!)
                </p>
                <p className="font-semibold mt-3">Fix for Vercel:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
                  <li>Add: <span className="font-mono bg-slate-800 px-2 py-1">NEXT_PUBLIC_API_URL</span></li>
                  <li>Value: Your Railway backend URL (e.g., https://smtp-backend-xxx.railway.app)</li>
                  <li>Redeploy the frontend</li>
                </ol>
              </div>
            </div>
          )}

          {apiUrlSet && (
            <div className="bg-green-900 border border-green-700 rounded p-4 mb-6">
              <div className="text-green-200 font-semibold">✅ API URL is configured</div>
              <p className="text-green-100 text-sm mt-2">Requests will be sent to: {info.apiUrl}</p>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-lg font-semibold mb-3">Test Endpoints</h2>
            <button
              onClick={testHealthEndpoint}
              disabled={!apiUrlSet}
              className={`w-full py-2 px-4 rounded font-semibold transition ${
                apiUrlSet
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              🏥 Test /health Endpoint
            </button>
            <button
              onClick={testRelaysEndpoint}
              disabled={!apiUrlSet}
              className={`w-full py-2 px-4 rounded font-semibold transition ${
                apiUrlSet
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              📧 Test /api/relays/test-connection
            </button>
          </div>

          {info.testResult && (
            <div className="mt-6 bg-slate-800 p-4 rounded border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Last Test Result:</p>
              <div className="font-mono text-xs bg-slate-950 p-3 rounded overflow-auto max-h-48 text-slate-300">
                <p>Status: {info.testResult.status || 'Failed'}</p>
                {info.testResult.error && <p className="text-red-400">Error: {info.testResult.error}</p>}
                {info.testResult.data && (
                  <pre>{JSON.stringify(info.testResult.data, null, 2)}</pre>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-900 border border-blue-700 rounded p-4">
            <p className="font-semibold text-blue-200 mb-2">💡 How to debug further:</p>
            <ol className="text-blue-100 text-sm space-y-1 list-decimal list-inside">
              <li>Open browser DevTools: Press F12</li>
              <li>Go to Console tab</li>
              <li>You'll see all API requests logged there</li>
              <li>Click the test buttons above - watch the console for detailed logs</li>
              <li>Check Network tab to see actual HTTP requests/responses</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
