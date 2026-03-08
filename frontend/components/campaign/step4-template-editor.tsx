'use client';

import { useState } from 'react';
import { useCampaign } from '@/lib/campaign-context';
import { templateSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Code, CheckCircle, Loader } from 'lucide-react';
import { apiPost } from '@/lib/api-client';

export function Step4TemplateEditor() {
  const { template, updateTemplate, relayConfig, senderDetails, targets } = useCampaign();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

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

  const onSubmit = async (data: any) => {
    // First save the template data
    updateTemplate(data);
    
    // Validate all required data is present
    if (!relayConfig.host || !senderDetails.fromEmail || targets.length === 0 || !data.subject) {
      setSubmitStatus('error');
      setSubmitMessage('Please complete all steps: SMTP relay, sender details, target emails, and template');
      return;
    }

    // Validate SMTP credentials format
    const smtpErrors: string[] = [];
    if (!relayConfig.host) smtpErrors.push('SMTP Host is required');
    if (!relayConfig.port || relayConfig.port < 1 || relayConfig.port > 65535) smtpErrors.push('Valid SMTP Port is required (1-65535)');
    if (!relayConfig.username) smtpErrors.push('SMTP Username is required');
    if (!relayConfig.password) smtpErrors.push('SMTP Password is required');
    
    if (smtpErrors.length > 0) {
      setSubmitStatus('error');
      setSubmitMessage(`Invalid SMTP credentials: ${smtpErrors.join(', ')}`);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitStatus('idle');
      setSubmitMessage('');

      console.log('📧 Submitting campaign with SMTP credentials:', {
        host: relayConfig.host,
        port: relayConfig.port,
        username: relayConfig.username,
        use_tls: relayConfig.useTLS,
      });

      // Generate a campaign ID
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare campaign request
      const campaignRequest = {
        campaign_id: campaignId,
        recipients: targets.map(t => ({
          email: t.email,
          metadata: {},
        })),
        subject: data.subject,
        body: data.bodyContent,
        headers: {
          'From': senderDetails.fromEmail,
          'From-Name': senderDetails.fromName,
          ...(data.replyTo && { 'Reply-To': data.replyTo }),
          ...(data.inReplyToId && { 'In-Reply-To': data.inReplyToId }),
        },
        provider_config: {
          provider_type: 'smtp',
          smtp_host: relayConfig.host,
          smtp_port: relayConfig.port,
          smtp_username: relayConfig.username,
          smtp_password: relayConfig.password,
          from_email: senderDetails.fromEmail,
          extra: {
            use_tls: relayConfig.useTLS,
            relay_name: relayConfig.name,
          },
        },
      };

      console.log('📨 Sending campaign request:', { campaign_id: campaignId, recipients: targets.length });

      // Submit campaign to backend
      const { data, error: apiError } = await apiPost('/api/campaigns', campaignRequest);

      if (apiError) {
        console.error('❌ API Error:', apiError);
        throw new Error(apiError);
      }

      const result = data;
      setSubmitStatus('success');
      setSubmitMessage(`Campaign successfully queued! ID: ${campaignId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to submit campaign';
      console.error('❌ Campaign submission error:', errMsg);
      setSubmitStatus('error');
      setSubmitMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
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
                {placeholderVariables.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
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
            <strong>Note:</strong> Your SMTP credentials will be validated when you submit the campaign. If there are any connection issues, you'll see an error message here. Use HTML for rich formatting or plain text.
          </p>
        </div>

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-400">Campaign Submitted Successfully!</p>
              <p className="text-xs text-green-300 mt-1">{submitMessage}</p>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-400">Failed to Submit Campaign</p>
              <p className="text-xs text-red-300 mt-1">{submitMessage}</p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium ml-auto disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Submitting Campaign...
              </>
            ) : (
              'Save & Review Campaign'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
