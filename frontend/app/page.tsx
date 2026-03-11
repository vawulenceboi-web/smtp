'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashboardView } from '@/components/views/dashboard-view';
import { AccessGuard } from '@/components/auth/access-guard';

export default function Home() {
  return (
    <AccessGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8">
              <DashboardView />
            </div>
          </div>
        </main>
      </div>
    </AccessGuard>
  );
}
