'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '', category: 'general', description: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.key || !formData.value) {
      setError('Key and value are required');
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
      } else {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to create setting');
      }
      await fetchSettings();
      setFormData({ key: '', value: '', category: 'general', description: '' });
      setEditingId(null);
      setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleEdit = (setting: Setting) => {
    setEditingId(setting.id);
    setFormData({
      key: setting.key,
      value: setting.value,
      category: setting.category,
      description: setting.description || '',
    });
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, Setting[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage application configuration and preferences</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Setting' : 'Add New Setting'}</CardTitle>
          <CardDescription>Create or modify application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="key">Setting Key</Label>
              <input
                id="key"
                placeholder="e.g., smtp_timeout"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                disabled={!!editingId}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="general">General</option>
                <option value="security">Security</option>
                <option value="performance">Performance</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <textarea
              id="value"
              placeholder="Setting value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <input
              id="description"
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'} Setting</Button>
            {editingId && (
              <Button variant="outline" onClick={() => {
                setEditingId(null);
                setFormData({ key: '', value: '', category: 'general', description: '' });
              }}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
      ) : Object.keys(groupedSettings).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No settings configured yet</p>
        </div>
      ) : (
        Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground capitalize">{category}</h2>
            <div className="space-y-2">
              {categorySettings.map((setting) => (
                <Card key={setting.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-foreground">{setting.key}</h3>
                      <p className="text-sm text-muted-foreground mt-1 break-all">{setting.value}</p>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground mt-2">{setting.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(setting)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(setting.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
