'use client';

import { TrendingUp, Calendar } from 'lucide-react';

export function ReportingView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reporting & Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Campaign performance metrics and delivery statistics.
        </p>
      </div>

      {/* Placeholder for real analytics backend */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Campaign reports</h2>
        </div>

        <div className="p-8 text-center text-muted-foreground">
          Analytics will appear here once your backend is recording campaign results.
        </div>
      </div>
    </div>
  );
}
