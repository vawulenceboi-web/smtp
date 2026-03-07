'use client';

import { useCampaign } from '@/lib/campaign-context';
import { templateSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Code } from 'lucide-react';

export function Step4TemplateEditor() {
  const { template, updateTemplate } = useCampaign();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: template,
  });

  const bodyContent = watch('bodyContent');

  const onSubmit = (data: any) => {
    updateTemplate(data);
  };

  const placeholderVariables = [
    { var: '{{.Email}}', desc: 'Recipient email address' },
    { var: '{{.URL}}', desc: 'Campaign tracking URL' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Email Template</h2>
        <p className="text-muted-foreground">Configure email headers and body content</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Pane - Headers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Email Headers</h3>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-2">
                Subject Line
              </label>
              <input
                id="subject"
                type="text"
                placeholder="Important Security Update Required"
                {...register('subject')}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.subject && (
                <p className="mt-1 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.subject.message}
                </p>
              )}
            </div>

            {/* Reply-To */}
            <div>
              <label htmlFor="replyTo" className="block text-sm font-medium text-foreground mb-2">
                Reply-To (Optional)
              </label>
              <input
                id="replyTo"
                type="email"
                placeholder="reply@example.com"
                {...register('replyTo')}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.replyTo && (
                <p className="mt-1 text-sm text-destructive">{errors.replyTo.message}</p>
              )}
            </div>

            {/* In-Reply-To ID */}
            <div>
              <label
                htmlFor="inReplyToId"
                className="block text-sm font-medium text-foreground mb-2"
              >
                In-Reply-To ID (Optional)
              </label>
              <input
                id="inReplyToId"
                type="text"
                placeholder="Message-ID reference"
                {...register('inReplyToId')}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Placeholder Variables Info */}
            <div className="p-4 bg-secondary rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Available Variables</p>
              </div>
              <div className="space-y-2">
                {placeholderVariables.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <code className="px-2 py-1 bg-input rounded text-xs font-mono text-accent">
                      {item.var}
                    </code>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Pane - Body Editor */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Email Body</h3>

            <div>
              <label htmlFor="bodyContent" className="block text-sm font-medium text-foreground mb-2">
                HTML/Plain Text Body
              </label>
              <textarea
                id="bodyContent"
                {...register('bodyContent')}
                placeholder={'<html>\n<body>\n<p>Hello {{.Email}},</p>\n<p>Click here: {{.URL}}</p>\n</body>\n</html>'}
                className="w-full h-64 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              />
              {errors.bodyContent && (
                <p className="mt-1 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.bodyContent.message}
                </p>
              )}

              <div className="mt-2 text-xs text-muted-foreground">
                Character count: {bodyContent?.length || 0}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-secondary rounded-lg border border-border max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground mb-2">HTML Preview</p>
              {bodyContent ? (
                <div 
                  className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary [&_a]:underline [&_p]:my-2 [&_img]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: bodyContent.replace(/\{\{\.Email\}\}/g, 'recipient@example.com').replace(/\{\{\.URL\}\}/g, 'https://example.com/campaign') }}
                />
              ) : (
                <div className="text-xs text-muted-foreground">Email body preview will appear here...</div>
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Tip:</strong> Use HTML for rich formatting. Plain text is supported too. Variables
            will be replaced with actual values during campaign execution.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium ml-auto"
          >
            Save & Review Campaign
          </button>
        </div>
      </form>
    </div>
  );
}
