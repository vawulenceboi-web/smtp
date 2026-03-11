'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { CampaignBuilder } from '@/components/campaign/campaign-builder';
import { ExecutionMonitor } from '@/components/execution/execution-monitor';
import { useCampaign } from '@/lib/campaign-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessGuard } from '@/components/auth/access-guard';

export default function NewCampaignPage() {
  const { currentStep, template } = useCampaign();
  const isTemplateComplete = template.subject && template.bodyContent;

  return (
    <AccessGuard>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8">
              <Tabs defaultValue="builder" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="builder">Campaign Builder</TabsTrigger>
                  <TabsTrigger value="monitor" disabled={!isTemplateComplete}>
                    Execution Monitor
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="builder" className="space-y-6">
                  <CampaignBuilder />
                </TabsContent>

                <TabsContent value="monitor" className="space-y-6">
                  {isTemplateComplete ? (
                    <ExecutionMonitor />
                  ) : (
                    <div className="bg-card border border-border rounded-lg p-8 text-center">
                      <p className="text-muted-foreground">
                        Complete the campaign builder to access the execution monitor.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </AccessGuard>
  );
}
