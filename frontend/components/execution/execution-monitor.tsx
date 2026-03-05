'use client';

import { useEffect, useState } from 'react';
import { useCampaign } from '@/lib/campaign-context';
import { EmailExecutionStatus } from '@/lib/types';
import { Play, Pause, RotateCcw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { EmailStatusTable } from './email-status-table';

export function ExecutionMonitor() {
  const { targets, executionStatus, setExecutionStatus, relayConfig, senderDetails, template } =
    useCampaign();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const stats = {
    total: targets.length,
    sent: executionStatus.filter((s) => s.status === 'sent').length,
    pending: executionStatus.filter((s) => s.status === 'pending').length,
    failed: executionStatus.filter((s) => s.status === 'failed').length,
  };

  const progressPercent = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;

  const handleStartExecution = async () => {
    if (targets.length === 0) {
      alert('No targets to execute');
      return;
    }

    if (!relayConfig.host || !senderDetails.fromEmail || !template.subject || !template.bodyContent) {
      alert('Please complete the campaign builder before starting execution.');
      return;
    }

    const newCampaignId = crypto.randomUUID();

    // optimistic local state
    const initialStatus: EmailExecutionStatus[] = targets.map((target) => ({
      email: target.email,
      status: 'pending',
    }));

    setExecutionStatus(initialStatus);
    setIsRunning(true);
    setIsPaused(false);
    setCampaignId(newCampaignId);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: newCampaignId,
          recipients: targets.map((t) => ({ email: t.email, metadata: {} })),
          subject: template.subject,
          body: template.bodyContent,
          headers: {},
          provider_config: {
            provider_type: 'smtp',
            smtp_host: relayConfig.host,
            smtp_port: relayConfig.port,
            smtp_username: relayConfig.username,
            smtp_password: relayConfig.password,
            from_email: senderDetails.fromEmail,
            extra: {},
          },
          proxy_config: null,
          sender_ip: null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('Failed to enqueue campaign', data);
        alert('Failed to enqueue campaign. See console for details.');
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Error enqueuing campaign', error);
      alert('Error enqueuing campaign. See console for details.');
      setIsRunning(false);
    }
  };

  // Poll backend for real execution status while campaign is running
  useEffect(() => {
    if (!campaignId || !isRunning) return;

    const interval = setInterval(async () => {
      if (isPaused) {
        return;
      }

      try {
        const res = await fetch(`/api/campaigns/${campaignId}/status`, { cache: 'no-store' });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const recipients = data.recipients || {};

        const statuses: EmailExecutionStatus[] = Object.keys(recipients).map((email) => {
          const rec = recipients[email] as { status?: string; provider?: string };
          let status: EmailExecutionStatus['status'] = 'pending';
          if (rec.status === 'sent') status = 'sent';
          else if (rec.status === 'failed' || rec.status === 'error') status = 'failed';
          else if (rec.status === 'delayed') status = 'pending';

          return {
            email,
            status,
          };
        });

        if (statuses.length > 0) {
          setExecutionStatus(statuses);
          const allDone = statuses.every((s) => s.status !== 'pending');
          if (allDone) {
            setIsRunning(false);
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling campaign status', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [campaignId, isRunning, isPaused, setExecutionStatus]);

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setExecutionStatus([]);
    setCampaignId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Campaign Execution Monitor</h2>
        <p className="text-muted-foreground">Real-time monitoring of email campaign delivery</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Targets</div>
          <div className="text-2xl font-bold text-foreground">{stats.total}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <div className="text-sm text-muted-foreground">Sent</div>
          </div>
          <div className="text-2xl font-bold text-green-400">{stats.sent}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Campaign Progress</h3>
          <span className="text-sm text-muted-foreground font-mono">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleStartExecution}
          disabled={isRunning || executionStatus.length > 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Play className="w-4 h-4" />
          Start Campaign
        </button>

        <button
          onClick={handlePause}
          disabled={!isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Pause className="w-4 h-4" />
          {isPaused ? 'Resume' : 'Pause'}
        </button>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Email Status Table */}
      <EmailStatusTable statuses={executionStatus} />
    </div>
  );
}
