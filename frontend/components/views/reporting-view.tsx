'use client';

import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { apiGet } from '@/lib/api-client';

type Campaign = {
  id: string;
  name?: string;
  status?: string;
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  created_at?: string;
  updated_at?: string;
};

type RecipientStatus = {
  status?: string;
  provider?: string;
};

type CampaignStatusResponse = {
  campaign_id: string;
  campaign: Campaign | null;
  recipients: Record<string, RecipientStatus>;
};

type CampaignStatusEntry = {
  recipients: Record<string, RecipientStatus>;
  campaign?: Campaign | null;
  error?: string | null;
};

const statusBadgeClass = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'running':
      return 'bg-blue-500/20 text-blue-300';
    case 'completed':
      return 'bg-green-500/20 text-green-300';
    case 'failed':
      return 'bg-red-500/20 text-red-300';
    case 'paused':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'draft':
      return 'bg-slate-500/20 text-slate-300';
    default:
      return 'bg-slate-500/20 text-slate-300';
  }
};

const normalizeRecipientStatus = (status?: string) => {
  const val = (status || '').toLowerCase();
  if (val === 'sent') return 'sent';
  if (val === 'failed' || val === 'error') return 'failed';
  if (val === 'delayed') return 'pending';
  return 'pending';
};

export function ReportingView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [statusByCampaign, setStatusByCampaign] = useState<Record<string, CampaignStatusEntry>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReportingData = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: listError } = await apiGet<{ campaigns: Campaign[] }>('/api/campaigns');
    if (listError || !data) {
      setError(listError || 'Failed to load campaigns');
      setCampaigns([]);
      setStatusByCampaign({});
      setIsLoading(false);
      return;
    }

    const list = data.campaigns || [];
    setCampaigns(list);

    const statusEntries = await Promise.all(
      list.map(async (campaign) => {
        const { data: statusData, error: statusError } = await apiGet<CampaignStatusResponse>(
          `/api/campaigns/${campaign.id}/status`
        );

        if (statusError || !statusData) {
          return [
            campaign.id,
            {
              recipients: {},
              campaign,
              error: statusError || 'Failed to load status',
            },
          ] as const;
        }

        return [
          campaign.id,
          {
            recipients: statusData.recipients || {},
            campaign: statusData.campaign || campaign,
            error: null,
          },
        ] as const;
      })
    );

    const nextStatus: Record<string, CampaignStatusEntry> = {};
    for (const [id, entry] of statusEntries) {
      nextStatus[id] = entry;
    }
    setStatusByCampaign(nextStatus);
    setIsLoading(false);
  };

  useEffect(() => {
    loadReportingData();
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const summarizeRecipients = (recipients: Record<string, RecipientStatus>, fallbackTotal?: number) => {
    let sent = 0;
    let failed = 0;
    let pending = 0;
    const emails = Object.keys(recipients || {});

    emails.forEach((email) => {
      const status = normalizeRecipientStatus(recipients[email]?.status);
      if (status === 'sent') sent += 1;
      else if (status === 'failed') failed += 1;
      else pending += 1;
    });

    const total = emails.length || fallbackTotal || 0;
    return { total, sent, failed, pending };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Campaign performance metrics and delivery statistics.
          </p>
        </div>
        <button
          onClick={loadReportingData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Campaign reports</h2>
        </div>

        {error && (
          <div className="p-6 text-sm text-red-300 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading campaign reports...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No campaigns found.</div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((campaign) => {
              const statusEntry = statusByCampaign[campaign.id];
              const recipients = statusEntry?.recipients || {};
              const summary = summarizeRecipients(recipients, campaign.total_recipients);
              const isExpanded = expandedId === campaign.id;
              const effectiveCampaign = statusEntry?.campaign || campaign;

              return (
                <div key={campaign.id} className="p-6 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {effectiveCampaign.name || 'Untitled Campaign'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(effectiveCampaign.status)}`}>
                          {effectiveCampaign.status || 'unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {campaign.id}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>Sent: {summary.sent}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>Failed: {summary.failed}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span>Pending: {summary.pending}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Total: {summary.total}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <span>Created: {formatDate(effectiveCampaign.created_at)}</span>
                    <span>Updated: {formatDate(effectiveCampaign.updated_at)}</span>
                  </div>

                  {statusEntry?.error && (
                    <div className="text-xs text-red-300">
                      Status fetch error: {statusEntry.error}
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : campaign.id)}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide recipients
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        View recipients
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-3 bg-secondary/40 text-xs font-semibold text-muted-foreground px-4 py-2">
                        <span>Email</span>
                        <span>Status</span>
                        <span>Provider</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-border">
                        {Object.keys(recipients).length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">
                            No recipients recorded for this campaign.
                          </div>
                        ) : (
                          Object.entries(recipients).map(([email, rec]) => {
                            const status = normalizeRecipientStatus(rec?.status);
                            return (
                              <div key={email} className="grid grid-cols-1 md:grid-cols-3 px-4 py-2 text-sm">
                                <span className="text-foreground">{email}</span>
                                <span className="text-muted-foreground">{status}</span>
                                <span className="text-muted-foreground">{rec?.provider || '—'}</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
