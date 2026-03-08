'use client';

import { useCampaign } from '@/lib/campaign-context';
import { relayConfigSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';

export function Step1RelayConfig() {
  const { relayConfig, updateRelayConfig, setStep } = useCampaign();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setError,
  } = useForm({
    resolver: zodResolver(relayConfigSchema),
    defaultValues: relayConfig,
  });

  const useTLS = watch('useTLS');

  const onSubmit = (data: any) => {
    updateRelayConfig(data);
    setStep(2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">SMTP Relay Configuration</h2>
        <p className="text-muted-foreground">Configure your SMTP server connection details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Relay Name */}
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-foreground mb-2">
            Relay Name (display name only)
          </label>
          <input
            id="name"
            type="text"
            placeholder="e.g., Gmail SMTP, SendGrid, etc."
            {...register('name')}
            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-muted-foreground">Give this relay a friendly name to identify it</p>
        </div>

        {/* Host */}
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-foreground mb-2">
            SMTP Host <span className="text-destructive">*</span>
          </label>
          <input
            id="host"
            type="text"
            placeholder="smtp.gmail.com"
            {...register('host')}
            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.host && (
            <p className="mt-1 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.host.message}
            </p>
          )}
        </div>

        {/* Port and TLS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="port" className="block text-sm font-medium text-foreground mb-2">
              Port <span className="text-destructive">*</span>
            </label>
            <input
              id="port"
              type="number"
              placeholder="587"
              {...register('port', { valueAsNumber: true })}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.port && (
              <p className="mt-1 text-sm text-destructive">{errors.port.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">TLS/SSL</label>
            <div className="flex items-center gap-3 h-10 px-4 bg-input border border-border rounded-lg">
              <input
                type="checkbox"
                id="useTLS"
                {...register('useTLS')}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="useTLS" className="flex-1 cursor-pointer text-foreground text-sm">
                {useTLS ? 'Enabled' : 'Disabled'}
              </label>
            </div>
          </div>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
            Username <span className="text-destructive">*</span>
          </label>
          <input
            id="username"
            type="text"
            placeholder="your-email@example.com"
            {...register('username')}
            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
            Password/API Key <span className="text-destructive">*</span>
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> Make sure your SMTP credentials are correct. The connection will be tested when you send the campaign. All fields marked with (*) are required.
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
