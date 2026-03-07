'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Edit2, Trash2, Info } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const COMMON_SETTINGS = [
  { key: 'email_timeout', category: 'Email', description: 'Email send timeout in seconds' },
  { key: 'max_recipients_per_campaign', category: 'Email', description: 'Maximum recipients per campaign' },
  { key: 'rate_limit_emails_per_minute', category: 'Performance', description: 'Rate limit for emails per minute' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.key || !formData.value) {
      setError('Both key and value are required');
      return;
    }

    try {
      if (editingId) {
        const response = await fetch(`/api/settings/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formData.value, description: formData.description }),
        });
        if (!response.ok) throw new Error('Failed to update setting');
        setSuccessMessage('Setting updated successfully');
      } else {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: formData.key, value: formData.value, category: 'general', description: formData.description }),
        });
        if (!response.ok) throw new Error('Failed to create setting');
        setSuccessMessage('Setting created successfully');
      }
      await fetchSettings();
      setFormData({ key: '', value: '', description: '' });
      setEditingId(null);
      setError(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;

    try {
      const response = await fetch(`/api/settings/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete setting');
      await fetchSettings();
      setSuccessMessage('Setting deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleEdit = (setting: Setting) => {
    setEditingId(setting.id);
    setFormData({
      key: setting.key,
      value: setting.value,
      description: setting.description || '',
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ key: '', value: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure application settings and parameters</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <span className="text-sm text-green-600 dark:text-green-400">{successMessage}</span>
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Common Settings</p>
              <p className="text-xs text-blue-800 dark:text-blue-400">
                Common settings you can configure: email_timeout, max_recipients_per_campaign, rate_limit_emails_per_minute
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Setting Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Setting' : 'Add New Setting'}</CardTitle>
          <CardDescription>Create or modify application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key">Setting Key</Label>
            <input
              id="key"
              placeholder="e.g., email_timeout"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              disabled={!!editingId}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {!editingId && <p className="text-xs text-muted-foreground">Setting key cannot be changed after creation</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <textarea
              id="value"
              placeholder="e.g., 30 or 100"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <input
              id="description"
              placeholder="Optional description of what this setting does"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              {editingId ? 'Update Setting' : 'Create Setting'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Existing Settings */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No settings configured yet. Create one using the form above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Configured Settings</h2>
          <div className="space-y-2">
            {settings.map((setting) => (
              <Card key={setting.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground break-all">{setting.key}</h3>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                        {setting.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground break-all">{setting.value}</p>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{setting.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(setting)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(setting.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
