'use client';

import Link from 'next/link';

export function DashboardView() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor email campaigns and delivery performance.
        </p>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/campaigns">
          <div className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 rounded-lg hover:border-blue-500/50 transition-colors cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">New Campaign</h3>
            <p className="text-sm text-muted-foreground">
              Create and launch a new outbound email campaign using your configured providers.
            </p>
          </div>
        </Link>

        <Link href="/templates">
          <div className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-colors cursor-pointer">
            <h3 className="text-lg font-semibold text-foreground mb-2">Email Templates</h3>
            <p className="text-sm text-muted-foreground">
              Manage and customize email templates for campaigns
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
