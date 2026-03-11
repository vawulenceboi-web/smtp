'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api-client';
import { getAccessToken, setAccessToken } from '@/lib/access';
import { AlertCircle, Loader } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!accessKey.trim()) {
      setError('Access key is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error: apiError } = await apiPost<{ token?: string }>('/api/access/verify', {
        access_key: accessKey.trim(),
      });

      if (apiError) {
        throw new Error(apiError);
      }

      const token = data?.token || `session_${Date.now()}`;
      setAccessToken(token);
      router.replace('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Access denied';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-lg">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Access Required</h1>
          <p className="text-sm text-muted-foreground">
            Enter the access key to continue to the dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="accessKey" className="text-sm font-medium text-foreground">
              Access Key
            </label>
            <input
              id="accessKey"
              type="password"
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder="Enter access key"
              className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
