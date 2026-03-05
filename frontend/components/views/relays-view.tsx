'use client';

import { Plus, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Relay {
  id: string;
  name: string;
  host: string;
  status: 'active' | 'inactive' | 'testing';
  last_used_at?: string;
  created_at: string;
}

export function RelaysView() {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRelays = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/relays');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch relays: ${response.status}`);
        }
        
        const data = await response.json();
        setRelays(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load relays';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRelays();
  }, [toast]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SMTP Relays</h1>
          <p className="text-muted-foreground mt-1">Manage SMTP relay configurations</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
          <Plus className="w-5 h-5" />
          Add Relay
        </button>
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          Loading relays...
        </div>
      ) : error ? (
        <div className="bg-card border border-red-500/30 rounded-lg p-6 text-red-400">
          <p>Error: {error}</p>
        </div>
      ) : relays.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No SMTP relays configured yet. Create your first relay to get started.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                  Host
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                  Last Used
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {relays.map((relay) => (
                <tr key={relay.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-4 font-medium text-foreground">{relay.name}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground font-mono">{relay.host}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${relay.status === 'active' ? 'text-green-400' : 'text-gray-400'}`} />
                      <span className={`text-sm font-medium ${relay.status === 'active' ? 'text-green-300' : 'text-gray-300'}`}>
                        {relay.status.charAt(0).toUpperCase() + relay.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(relay.last_used_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
