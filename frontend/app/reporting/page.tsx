'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ReportingView } from '@/components/views/reporting-view';

export default function ReportingPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            <ReportingView />
          </div>
        </div>
      </main>
    </div>
  );
}
