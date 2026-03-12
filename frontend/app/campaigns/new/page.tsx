'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CampaignBuilder } from '@/components/campaign/campaign-builder';
import { AccessGuard } from '@/components/auth/access-guard';

export default function NewCampaignPage() {
  return (
    <AccessGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8">
              <CampaignBuilder />
            </div>
          </div>
        </main>
      </div>
    </AccessGuard>
  );
}
