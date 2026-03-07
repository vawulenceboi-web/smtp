'use client';

import { useEffect, useState } from 'react';

export default function TestApiUrlPage() {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL;
    setApiUrl(url || 'NOT SET');
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setTestResult('Testing...');

    try {
      const fullUrl = `${apiUrl}/health`;
      console.log('🔍 Testing connection to:', fullUrl);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      setTestResult(`✅ Success! Status: ${response.status}\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setTestResult(`❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-6">API URL Debug</h1>

        <div className="space-y-4">
          <div className="bg-slate-700 p-4 rounded border border-slate-600">
            <p className="text-sm text-slate-400">NEXT_PUBLIC_API_URL:</p>
            <p className="text-lg font-mono text-green-400 break-all">{apiUrl}</p>
          </div>

          <button
            onClick={testConnection}
            disabled={loading || !apiUrl || apiUrl === 'NOT SET'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded transition"
          >
            {loading ? '⏳ Testing...' : '🧪 Test Backend Health'}
          </button>

          {testResult && (
            <div className="bg-slate-700 p-4 rounded border border-slate-600">
              <p className="text-sm text-slate-400 mb-2">Result:</p>
              <pre className="text-sm text-yellow-300 whitespace-pre-wrap break-words font-mono overflow-auto max-h-96">
                {testResult}
              </pre>
            </div>
          )}

          <div className="bg-blue-900 border border-blue-700 p-4 rounded text-sm text-blue-100">
            <p className="font-semibold mb-2">ℹ️ Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>If API URL shows "NOT SET", restart the Next.js dev server</li>
              <li>Make sure .env.local file exists with NEXT_PUBLIC_API_URL set</li>
              <li>Next.js requires a dev server restart to pick up new env vars</li>
              <li>Environment variables must start with NEXT_PUBLIC_ to be exposed to browser</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
