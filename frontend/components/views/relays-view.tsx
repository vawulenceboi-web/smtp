'use client';

import { Plus, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Relay {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  use_tls: boolean;
  status: 'active' | 'inactive' | 'testing';
  last_used_at?: string;
  created_at: string;
}

interface AddRelayForm {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  useTLS: boolean;
}

export function RelaysView() {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AddRelayForm>({
    name: '',
    host: '',
    port: 587,
    username: '',
    password: '',
    useTLS: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRelays();
  }, [toast]);

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

  const handleAddRelay = async () => {
    if (!formData.name || !formData.host || !formData.port || !formData.username || !formData.password) {
      setError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch('/api/relays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          host: formData.host,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          use_tls: formData.useTLS,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create relay');
      }

      setSuccessMessage('Relay added successfully');
      setShowAddModal(false);
      setFormData({
        name: '',
        host: '',
        port: 587,
        username: '',
        password: '',
        useTLS: true,
      });
      await fetchRelays();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add relay';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Relay
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-600 dark:text-green-400">{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          Loading relays...
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
                  <td className="px-4 py-4 text-sm text-muted-foreground font-mono">{relay.host}:{relay.port}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${relay.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${relay.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`}>
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

      {/* Add Relay Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New SMTP Relay</DialogTitle>
            <DialogDescription>Configure a new SMTP relay for sending campaigns</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="relay-name">Relay Name</Label>
              <input
                id="relay-name"
                placeholder="e.g., Gmail SMTP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relay-host">SMTP Host</Label>
                <input
                  id="relay-host"
                  placeholder="smtp.gmail.com"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relay-port">Port</Label>
                <input
                  id="relay-port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relay-username">Username</Label>
              <input
                id="relay-username"
                placeholder="your-email@gmail.com"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relay-password">Password/API Key</Label>
              <input
                id="relay-password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <input
                id="relay-tls"
                type="checkbox"
                checked={formData.useTLS}
                onChange={(e) => setFormData({ ...formData, useTLS: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="relay-tls" className="text-sm cursor-pointer flex-1">
                Use TLS/SSL encryption
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddRelay} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? 'Creating...' : 'Create Relay'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
