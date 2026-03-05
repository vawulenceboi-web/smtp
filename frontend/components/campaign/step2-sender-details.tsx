'use client';

import { useCampaign } from '@/lib/campaign-context';
import { senderDetailsSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Mail } from 'lucide-react';

export function Step2SenderDetails() {
  const { senderDetails, updateSenderDetails } = useCampaign();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(senderDetailsSchema),
    defaultValues: senderDetails,
  });

  const fromName = watch('fromName');
  const fromEmail = watch('fromEmail');

  const onSubmit = (data: any) => {
    updateSenderDetails(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Sender Details</h2>
        <p className="text-muted-foreground">Configure the sender information for emails</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* From Name */}
        <div>
          <label htmlFor="fromName" className="block text-sm font-medium text-foreground mb-2">
            Sender Name
          </label>
          <input
            id="fromName"
            type="text"
            placeholder="e.g., CEO, Support Team"
            {...register('fromName')}
            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.fromName && (
            <p className="mt-1 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.fromName.message}
            </p>
          )}
        </div>

        {/* From Email */}
        <div>
          <label htmlFor="fromEmail" className="block text-sm font-medium text-foreground mb-2">
            Sender Email Address
          </label>
          <input
            id="fromEmail"
            type="email"
            placeholder="sender@example.com"
            {...register('fromEmail')}
            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.fromEmail && (
            <p className="mt-1 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.fromEmail.message}
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="p-4 bg-secondary rounded-lg border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {fromName || 'Sender Name'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {fromEmail || 'email@example.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> These details will appear as the sender in recipient email clients.
            Ensure they align with your campaign objectives.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium ml-auto"
          >
            Continue to Next Step
          </button>
        </div>
      </form>
    </div>
  );
}
