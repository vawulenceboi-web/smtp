'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CampaignContextType,
  SenderDetails,
  EmailTarget,
  EmailTemplate,
  EmailExecutionStatus,
  RelayConfig,
} from './types';

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

const initialSenderDetails: SenderDetails = {
  fromName: '',
  fromEmail: '',
};

const initialTemplate: EmailTemplate = {
  subject: '',
  replyTo: '',
  inReplyToId: '',
  bodyContent: '',
  templateId: '',
};

const initialRelayConfig: RelayConfig = {
  port: 0,
};

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [senderDetails, setSenderDetails] = useState<SenderDetails>(initialSenderDetails);
  const [targets, setTargets] = useState<EmailTarget[]>([]);
  const [template, setTemplate] = useState<EmailTemplate>(initialTemplate);
  const [executionStatus, setExecutionStatus] = useState<EmailExecutionStatus[]>([]);
  const [relayConfig, setRelayConfig] = useState<RelayConfig>(initialRelayConfig);

  // Load from localStorage on mount (only in browser) - but only if explicitly saved
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('campaignState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setCurrentStep(state.currentStep || 1);
        setSenderDetails(state.senderDetails || initialSenderDetails);
        setTargets(state.targets || []);
        setTemplate(state.template || initialTemplate);
        setRelayConfig(state.relayConfig || initialRelayConfig);
        console.log('📂 Loaded campaign state from localStorage');
      } catch (error) {
        console.error('Failed to load campaign state:', error);
        // Clear corrupted localStorage
        localStorage.removeItem('campaignState');
      }
    }
  }, []);

  // Only save to localStorage when explicitly saving (not on every change)
  // This prevents excessive storage writes and reduces cache persistence issues

  const updateSenderDetails = (details: Partial<SenderDetails>) => {
    setSenderDetails((prev) => ({ ...prev, ...details }));
  };

  const updateTargets = (newTargets: EmailTarget[]) => {
    setTargets(newTargets);
  };

  const updateTemplate = (newTemplate: Partial<EmailTemplate>) => {
    setTemplate((prev) => ({ ...prev, ...newTemplate }));
  };

  const updateRelayConfig = (config: Partial<RelayConfig>) => {
    setRelayConfig((prev) => ({ ...prev, ...config }));
  };

  const saveCampaignState = () => {
    const state = {
      currentStep,
      senderDetails,
      targets,
      template,
      relayConfig,
    };
    localStorage.setItem('campaignState', JSON.stringify(state));
    console.log('💾 Campaign state saved to localStorage');
  };

  const reset = () => {
    setCurrentStep(1);
    setSenderDetails(initialSenderDetails);
    setTargets([]);
    setTemplate(initialTemplate);
    setExecutionStatus([]);
    setRelayConfig(initialRelayConfig);
    localStorage.removeItem('campaignState');
    console.log('🗑️ Campaign state cleared');
  };

  const value: CampaignContextType = {
    currentStep,
    senderDetails,
    targets,
    template,
    executionStatus,
    relayConfig,
    setStep: setCurrentStep,
    updateSenderDetails,
    updateTargets,
    updateTemplate,
    updateRelayConfig,
    setExecutionStatus,
    reset,
    saveCampaignState,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within CampaignProvider');
  }
  return context;
}
