'use client';

import { useState } from 'react';
import { useCampaign } from '@/lib/campaign-context';
import { relayConfigSchema } from '@/lib/validators';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

export function Step1RelayConfig() {
  const { relayConfig, updateRelayConfig } = useCampaign();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(relayConfigSchema),
    defaultValues: relayConfig,
  });

  const useTLS = watch('useTLS');

  const onSubmit = (data: any) => {
    updateRelayConfig(data);
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    // Simulate connection test
    setTimeout(() => {
      if (relayConfig.host && relayConfig.username && relayConfig.password) {
        setConnectionStatus('success');
        setConnectionMessage('Connection successful! SMTP relay is responding.');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Please fill in all required fields first.');
      }
      setTestingConnection(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">SMTP Relay Configuration</h2>
        <p className="text-muted-foreground">Configure your SMTP server connection details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Host */}
        <div>
          <label htmlFor="host" className="block text-sm font-medium text-foreground mb-2">
            SMTP Host
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
              Port
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
              <label htmlFor="useTLS" className="flex-1 cursor-pointer text-foreground">
                {useTLS ? 'Enabled' : 'Disabled'}
              </label>
            </div>
          </div>
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
            Username
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
            Password
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

        {/* Connection Status */}
        {connectionStatus !== 'idle' && (
          <div
            className={`p-4 rounded-lg border flex items-center gap-3 ${
              connectionStatus === 'success'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {connectionStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{connectionMessage}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            {testingConnection && <Loader className="w-4 h-4 animate-spin" />}
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>

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
