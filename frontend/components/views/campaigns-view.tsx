'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Trash2 } from 'lucide-react';
import { apiGet } from '@/lib/api-client';

type CampaignSummary = {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed';
  targets: number;
  sent: number;
  created: string;
};

export function CampaignsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const { data, error: apiError } = await apiGet<{ campaigns: any[] }>('/api/campaigns');
        if (apiError) {
          setError(apiError);
          console.error('API Error:', apiError);
          return;
        }
        if (!data) {
          setError('No data received from server');
          return;
        }
        const items = (data.campaigns || []) as any[];
        const mapped: CampaignSummary[] = items.map((c) => ({
          id: String(c.id),
          name: c.name || c.subject || 'Unnamed campaign',
          status: (c.status as CampaignSummary['status']) || 'completed',
          targets: Number(c.target_count || 0),
          sent: Number(c.sent_count || 0),
          created: c.created_at || '',
        }));
        setCampaigns(mapped);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        console.error('Error loading campaigns', err);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const filteredCampaigns = campaigns
    .filter((c) => filterStatus === 'all' || c.status === filterStatus)
    .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'draft':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage and review outbound email campaigns.
          </p>
        </div>

        <Link href="/campaigns/new">
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Campaigns Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {error && (
          <div className="p-6 bg-destructive/10 border-b border-destructive/20">
            <p className="text-destructive font-medium">Failed to load campaigns</p>
            <p className="text-destructive/80 text-sm mt-1">{error}</p>
            <p className="text-destructive/70 text-xs mt-2">
              Verify that NEXT_PUBLIC_API_URL environment variable is set correctly and backend is running.
            </p>
          </div>
        )}
        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">Loading campaigns…</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              No campaigns found. New campaigns appear here after they are created and executed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Campaign Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-secondary/20 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Link href={`/campaigns/${campaign.id}`}>
                        <p className="text-sm font-medium text-accent hover:text-accent/80 cursor-pointer">
                          {campaign.name}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 w-40">
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${
                                campaign.targets > 0
                                  ? (campaign.sent / campaign.targets) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {campaign.sent}/{campaign.targets}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {campaign.created}
                    </td>
                    <td className="px-4 py-4">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
