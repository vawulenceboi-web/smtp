'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function DebugPage() {
  const [config, setConfig] = useState<any>({});
  const [tested, setTested] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Check environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    setConfig({
      apiUrl: apiUrl || '(not set)',
      isSet: !!apiUrl,
      nodeEnv: process.env.NODE_ENV,
      location: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    });
  }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      // Simple health check
      const response = await fetch(
        `${config.apiUrl}/health` || '/health'
      );
      const data = await response.json();
      setResult({
        status: response.status,
        ok: response.ok,
        data,
      });
    } catch (err) {
      setResult({
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
      setTested(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Frontend API Configuration Debug</h1>

        {/* Environment Configuration */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">📋 Configuration</h2>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <span>NEXT_PUBLIC_API_URL:</span>
              <div className="flex items-center gap-2">
                {config.isSet ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <code className="bg-slate-700 px-3 py-1 rounded text-green-400">
                      {config.apiUrl}
                    </code>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-400">NOT SET</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between">
              <span>Frontend URL:</span>
              <code className="bg-slate-700 px-3 py-1 rounded">{config.location}</code>
            </div>

            <div className="flex items-start justify-between">
              <span>Environment:</span>
              <code className="bg-slate-700 px-3 py-1 rounded">{config.nodeEnv}</code>
            </div>
          </div>
        </div>

        {/* Test Connection */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-semibold mb-4">🧪 Test Backend Connection</h2>

          <button
            onClick={testConnection}
            disabled={testing || !config.isSet}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded font-medium flex items-center gap-2 transition"
          >
            {testing && <Loader className="w-4 h-4 animate-spin" />}
            {testing ? 'Testing...' : 'Test Backend Health Check'}
          </button>

          {tested && result && (
            <div className="mt-4 p-4 rounded border border-slate-700 bg-slate-900">
              {result.error ? (
                <div className="text-red-400">
                  <p className="font-semibold">❌ Error:</p>
                  <code className="text-sm">{result.error}</code>
                </div>
              ) : (
                <div className={result.ok ? 'text-green-400' : 'text-yellow-400'}>
                  <p className="font-semibold">
                    {result.ok ? '✅ Success' : '⚠️ Response received but not OK'}
                  </p>
                  <pre className="text-sm mt-2 bg-slate-800 p-2 rounded overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-slate-800 rounded-lg p-6 border border-blue-600 border-dashed">
          <h2 className="text-xl font-semibold mb-4">📖 Setup Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
            <li>Create <code className="bg-slate-700 px-2 py-1 rounded">frontend/.env.local</code></li>
            <li>Add: <code className="bg-slate-700 px-2 py-1 rounded">NEXT_PUBLIC_API_URL=http://localhost:8000</code></li>
            <li>Kill Next.js: <code className="bg-slate-700 px-2 py-1 rounded">pkill -f "next dev"</code></li>
            <li>Restart: <code className="bg-slate-700 px-2 py-1 rounded">cd frontend && pnpm dev</code></li>
            <li>Refresh this page</li>
          </ol>
        </div>

        {/* Debug Info */}
        <div className="text-xs text-slate-400 p-4 bg-slate-800 rounded border border-slate-700">
          <p>If NEXT_PUBLIC_API_URL shows "(not set)": Restart the dev server</p>
          <p>If test fails with connection error: Check backend is running on port 8000</p>
        </div>
      </div>
    </div>
  );
}
