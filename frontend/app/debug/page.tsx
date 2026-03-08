'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Copy } from 'lucide-react';

export default function DebugPage() {
  const [apiUrl, setApiUrl] = useState('');
  const [nodeEnv, setNodeEnv] = useState('');
  const [location, setLocation] = useState('');
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL;
    setApiUrl(url || '❌ NOT SET');
    setNodeEnv(process.env.NODE_ENV || 'unknown');
    setLocation(typeof window !== 'undefined' ? window.location.href : 'N/A');

    setTestLog([
      `🚀 Debug page loaded: ${new Date().toISOString()}`,
      `📍 Location: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      `🌍 NEXT_PUBLIC_API_URL: ${url || '❌ NOT SET'}`,
      `📦 NODE_ENV: ${process.env.NODE_ENV || 'unknown'}`,
    ]);
  }, []);

  const addLog = (message: string) => {
    setTestLog(prev => [...prev, message]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(''), 2000);
  };

  const testEndpoint = async (path: string, label: string) => {
    if (!apiUrl || apiUrl === '❌ NOT SET') {
      addLog('❌ Cannot test - NEXT_PUBLIC_API_URL not set');
      return;
    }

    setIsTesting(true);
    addLog(`\n🧪 Testing ${label}...`);

    try {
      const fullUrl = `${apiUrl}${path}`;
      addLog(`   URL: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });

      addLog(`   Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        try {
          const data = await response.json();
          addLog(`   ✅ Success: ${JSON.stringify(data).substring(0, 100)}`);
        } catch {
          const text = await response.text();
          addLog(`   ✅ Success (text): ${text.substring(0, 100)}`);
        }
      } else {
        addLog(`   ❌ Failed: Got ${response.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`   ❌ Error: ${message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const hasApiUrl = apiUrl && apiUrl !== '❌ NOT SET';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">🔧 API Debug Console</h1>
          <p className="text-slate-300">Check your API configuration and test endpoints</p>
        </div>

        {/* Main Config Status */}
        <div className={`rounded-lg border-2 p-6 ${hasApiUrl ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                {hasApiUrl ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    API URL Configured ✅
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    API URL NOT SET ❌
                  </>
                )}
              </h2>
              <p className={hasApiUrl ? 'text-green-300' : 'text-red-300'}>
                {hasApiUrl ? 'Backend URL is configured' : 'Frontend cannot reach backend'}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 rounded p-4 border border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Value:</p>
            <div className="flex items-center gap-2">
              <code className={`flex-1 font-mono text-sm break-all ${hasApiUrl ? 'text-green-400' : 'text-red-400'}`}>
                {apiUrl}
              </code>
              {hasApiUrl && (
                <button
                  onClick={() => copyToClipboard(apiUrl)}
                  className="p-2 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                  title="Copy"
                >
                  {copied === apiUrl ? '✓' : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fix Instructions */}
        {!hasApiUrl && (
          <div className="rounded-lg bg-yellow-500/20 border-2 border-yellow-500/50 p-6">
            <h3 className="font-bold text-yellow-300 mb-3 flex items-center gap-2">
              ⚠️ How to Fix
            </h3>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">1.</span>
                Go to <code className="bg-slate-900 px-2 py-1 rounded text-xs">Vercel.com</code> → Dashboard
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">2.</span>
                Select <code className="bg-slate-900 px-2 py-1 rounded text-xs">smtp</code> project
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">3.</span>
                Go to <code className="bg-slate-900 px-2 py-1 rounded text-xs">Settings</code> → <code className="bg-slate-900 px-2 py-1 rounded text-xs">Environment Variables</code>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">4.</span>
                Click <strong>Add</strong>, then fill in:
                <div className="bg-slate-900 p-3 rounded border border-slate-600 text-xs font-mono mt-1 w-full">
                  <div>Key: <span className="text-blue-300">NEXT_PUBLIC_API_URL</span></div>
                  <div>Value: <span className="text-blue-300">https://smtp-production-2752.up.railway.app</span></div>
                  <div>Select: <span className="text-blue-300">Production</span></div>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">5.</span>
                Go to <code className="bg-slate-900 px-2 py-1 rounded text-xs">Deployments</code> → Click latest commit → <code className="bg-slate-900 px-2 py-1 rounded text-xs">Redeploy</code>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">6.</span>
                Wait for deployment (2-3 min, look for ✅ checkmark)
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-400 font-bold shrink-0">7.</span>
                Refresh this page: <kbd className="bg-slate-900 px-2 py-1 rounded text-xs">Ctrl+Shift+R</kbd>
              </li>
            </ol>
          </div>
        )}

        {/* Test Buttons */}
        {hasApiUrl && (
          <div className="rounded-lg border/20 border-2 p-6 space-y-3">
            <h3 className="font-bold mb-3">Test Endpoints</h3>
            <button
              onClick={() => testEndpoint('/health', 'Health Check')}
              disabled={isTesting}
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition-colors"
            >
              🏥 Test /health
            </button>
            <button
              onClick={() => testEndpoint('/api/relays', 'List Relays')}
              disabled={isTesting}
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition-colors"
            >
              🔗 Test /api/relays
            </button>
            <button
              onClick={() => testEndpoint('/api/templates', 'List Templates')}
              disabled={isTesting}
              className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded font-medium transition-colors"
            >
              📄 Test /api/templates
            </button>
          </div>
        )}

        {/* Log Output */}
        <div className="rounded-lg border border-slate-600 bg-slate-950 p-6">
          <h3 className="font-bold mb-3">Debug Log</h3>
          <div className="bg-black rounded p-4 font-mono text-xs text-slate-300 overflow-auto max-h-64 space-y-1">
            {testLog.map((log, i) => (
              <div
                key={i}
                className={`${
                  log.includes('✅')
                    ? 'text-green-400'
                    : log.includes('❌')
                    ? 'text-red-400'
                    : log.includes('🧪')
                    ? 'text-yellow-400'
                    : 'text-slate-300'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/50 p-6 space-y-2 text-sm">
          <p>
            <strong>Current Setup:</strong> Your frontend on Vercel must know where your backend (Railway) is located.
          </p>
          <p>
            <strong>Problem:</strong> Without NEXT_PUBLIC_API_URL, requests go to Vercel instead of Railway → 404 errors
          </p>
          <p>
            <strong>Solution:</strong> Set the environment variable to tell frontend where backend lives: <code className="bg-slate-800 px-2 py-1 rounded text-xs">https://smtp-production-2752.up.railway.app</code>
          </p>
        </div>
      </div>
    </div>
  );
}
