'use client';

import { EmailExecutionStatus } from '@/lib/types';
import { CheckCircle, AlertCircle, Clock, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface EmailStatusTableProps {
  statuses: EmailExecutionStatus[];
}

export function EmailStatusTable({ statuses }: EmailStatusTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStatuses = statuses
    .filter((s) => filterStatus === 'all' || s.status === filterStatus)
    .filter((s) => s.email.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-border bg-secondary/20 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      {filteredStatuses.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">
            {statuses.length === 0
              ? 'No execution data yet. Start a campaign to begin.'
              : 'No results match your search filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40">
                  Email Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <div className="flex items-center gap-2">
                    Timestamp
                    {sortOrder === 'desc' ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStatuses.map((status, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <code className="text-sm text-accent font-mono">{status.email}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status.status)}
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                          status.status
                        )}`}
                      >
                        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {status.timestamp
                      ? new Date(status.timestamp).toLocaleTimeString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                    {status.message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {filteredStatuses.length > 0 && (
        <div className="px-4 py-3 bg-secondary/20 border-t border-border text-xs text-muted-foreground">
          Showing {filteredStatuses.length} of {statuses.length} records
        </div>
      )}
    </div>
  );
}
