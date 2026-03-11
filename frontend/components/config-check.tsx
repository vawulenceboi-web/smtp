'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

export function ConfigCheck() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<{
    apiUrl: string | undefined;
    hasIssue: boolean;
    message: string;
  }>({ apiUrl: undefined, hasIssue: false, message: '' });

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      setConfig({
        apiUrl,
        hasIssue: true,
        message: 'NEXT_PUBLIC_API_URL is not configured. All API calls will fail with 404 errors.',
      });
    } else {
      setConfig({
        apiUrl,
        hasIssue: false,
        message: `API Backend: ${apiUrl}`,
      });
    }
    
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!config.hasIssue) {
    return null; // Only show warnings, not success messages
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 p-4">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Configuration Error</h3>
          <p className="text-red-800 text-sm mt-1">{config.message}</p>
          <details className="mt-2 text-red-700 text-xs">
            <summary className="cursor-pointer font-medium">How to fix</summary>
            <div className="mt-2 bg-red-100 p-2 rounded font-mono text-red-900">
              <p>For Vercel: Add environment variable in project settings</p>
              <p className="mt-1">Key: <code>NEXT_PUBLIC_API_URL</code></p>
              <p>Value: <code>https://your-backend.example.com</code></p>
              <p className="mt-1">Then redeploy the project</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
