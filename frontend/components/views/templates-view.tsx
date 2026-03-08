'use client';

import { Plus, AlertCircle, CheckCircle, Code } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiPost, apiGet } from '@/lib/api-client';

interface Template {
  id: string;
  name: string;
  category?: string;
  subject: string;
  body_content: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface NewTemplateForm {
  name: string;
  subject: string;
  body_content: string;
  category: string;
}

export function TemplatesView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formData, setFormData] = useState<NewTemplateForm>({
    name: '',
    subject: '',
    body_content: '',
    category: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await apiGet<Template[]>('/api/templates');
        
        if (error) {
          throw new Error(error);
        }
        
        setTemplates(data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load templates';
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

    fetchTemplates();
  }, [toast]);

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.subject || !formData.body_content) {
      setError('Name, subject, and body are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const { data, error } = await apiPost('/api/templates', {
        name: formData.name,
        subject: formData.subject,
        body_content: formData.body_content,
        category: formData.category || null,
      });

      if (error) {
        throw new Error(error);
      }

      setSuccessMessage('Template created successfully');
      setShowNewTemplateModal(false);
      setFormData({ name: '', subject: '', body_content: '', category: '' });
      const { data: templates } = await apiGet<Template[]>('/api/templates');
      if (templates) {
        setTemplates(templates);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground mt-1">Manage campaign email templates. Create templates here or use the campaign wizard (Step 4) to create templates while building campaigns.</p>
        </div>

        <Button onClick={() => setShowNewTemplateModal(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Template
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-secondary rounded mb-2 w-3/4"></div>
              <div className="h-3 bg-secondary rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          <p>No email templates defined yet. Create your first template to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors group"
            >
              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              {template.category && (
                <p className="text-sm text-muted-foreground mb-4">{template.category}</p>
              )}
              <div className="space-y-2 mb-4">
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium">Subject:</span> {template.subject}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Used {template.usage_count} times
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowViewModal(true);
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Template Modal */}
      <Dialog open={showNewTemplateModal} onOpenChange={setShowNewTemplateModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Email Template</DialogTitle>
            <DialogDescription>Create a reusable email template for your campaigns</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <input
                id="template-name"
                placeholder="e.g., Security Alert Template"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-category">Category (Optional)</Label>
              <input
                id="template-category"
                placeholder="e.g., Security, Marketing, Notification"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject Line</Label>
              <input
                id="template-subject"
                placeholder="e.g., Important Security Update Required"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-body">Email Body (HTML or Plain Text)</Label>
              <textarea
                id="template-body"
                placeholder={'<html>\n<body>\n<p>Hello {{.Email}},</p>\n<p>Please update your password.</p>\n<p>Click here: {{.URL}}</p>\n</body>\n</html>'}
                value={formData.body_content}
                onChange={(e) => setFormData({ ...formData, body_content: e.target.value })}
                className="w-full h-40 px-3 py-2 border border-border rounded-lg text-sm bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>

            <div className="p-3 bg-secondary rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Available Variables:</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <code className="px-2 py-1 bg-input rounded text-xs font-mono">{'{{.Email}}'}</code>
                <code className="px-2 py-1 bg-input rounded text-xs font-mono">{'{{.URL}}'}</code>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowNewTemplateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Template Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Template: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.category && `Category: ${selectedTemplate.category}`}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Subject Line</Label>
                <div className="p-3 bg-input rounded-lg border border-border text-sm text-foreground font-mono break-words">
                  {selectedTemplate.subject}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Email Body</Label>
                <div className="p-4 bg-input rounded-lg border border-border text-sm text-foreground font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {selectedTemplate.body_content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-foreground">
                    {new Date(selectedTemplate.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Usage Count</Label>
                  <p className="text-foreground">{selectedTemplate.usage_count} times</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
