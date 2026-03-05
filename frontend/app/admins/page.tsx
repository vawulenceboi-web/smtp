'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', name: '', role: 'admin' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admins');
      if (!response.ok) throw new Error('Failed to fetch admins');
      const data = await response.json();
      setAdmins(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.email || !formData.name) {
      setError('Email and name are required');
      return;
    }

    try {
      if (editingId) {
        const response = await fetch(`/api/admins/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, role: formData.role }),
        });
        if (!response.ok) throw new Error('Failed to update admin');
      } else {
        const response = await fetch('/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error('Failed to create admin');
      }
      await fetchAdmins();
      setFormData({ email: '', name: '', role: 'admin' });
      setEditingId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this admin?')) return;

    try {
      const response = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to deactivate admin');
      await fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const response = await fetch(`/api/admins/${id}/activate`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to activate admin');
      await fetchAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate');
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingId(admin.id);
    setFormData({
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      moderator: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.viewer;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Management</h1>
        <p className="text-sm text-muted-foreground">Manage administrator accounts and permissions</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Admin' : 'Add New Admin'}</CardTitle>
          <CardDescription>Create or modify administrator accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingId}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="admin">Admin (Full Access)</option>
              <option value="moderator">Moderator (Manage Content)</option>
              <option value="viewer">Viewer (Read Only)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'} Admin</Button>
            {editingId && (
              <Button variant="outline" onClick={() => {
                setEditingId(null);
                setFormData({ email: '', name: '', role: 'admin' });
              }}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading admins...</div>
      ) : admins.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No administrators configured yet</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
            <CardDescription>{admins.length} admin accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{admin.name}</h3>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(admin.role)}`}>
                        {admin.role}
                      </span>
                      {admin.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-700">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                      {admin.last_login && (
                        <span className="text-xs text-muted-foreground">
                          Last login: {new Date(admin.last_login).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(admin)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {admin.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(admin.id)}
                      >
                        <XCircle className="w-4 h-4 text-destructive" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActivate(admin.id)}
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
