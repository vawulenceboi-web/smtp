'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CampaignContextType,
  SMTPRelayConfig,
  SenderDetails,
  EmailTarget,
  EmailTemplate,
  EmailExecutionStatus,
} from './types';

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

const initialRelayConfig: SMTPRelayConfig = {
  name: '',
  host: '',
  port: 587,
  useTLS: true,
  username: '',
  password: '',
};

const initialSenderDetails: SenderDetails = {
  fromName: '',
  fromEmail: '',
};

const initialTemplate: EmailTemplate = {
  subject: '',
  replyTo: '',
  inReplyToId: '',
  bodyContent: '',
};

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [relayConfig, setRelayConfig] = useState<SMTPRelayConfig>(initialRelayConfig);
  const [senderDetails, setSenderDetails] = useState<SenderDetails>(initialSenderDetails);
  const [targets, setTargets] = useState<EmailTarget[]>([]);
  const [template, setTemplate] = useState<EmailTemplate>(initialTemplate);
  const [executionStatus, setExecutionStatus] = useState<EmailExecutionStatus[]>([]);

  // Load from localStorage on mount (only in browser) - but only if explicitly saved
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('campaignState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setCurrentStep(state.currentStep || 1);
        setRelayConfig(state.relayConfig || initialRelayConfig);
        setSenderDetails(state.senderDetails || initialSenderDetails);
        setTargets(state.targets || []);
        setTemplate(state.template || initialTemplate);
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

  const updateRelayConfig = (config: Partial<SMTPRelayConfig>) => {
    setRelayConfig((prev) => ({ ...prev, ...config }));
  };

  const updateSenderDetails = (details: Partial<SenderDetails>) => {
    setSenderDetails((prev) => ({ ...prev, ...details }));
  };

  const updateTargets = (newTargets: EmailTarget[]) => {
    setTargets(newTargets);
  };

  const updateTemplate = (newTemplate: Partial<EmailTemplate>) => {
    setTemplate((prev) => ({ ...prev, ...newTemplate }));
  };

  const saveCampaignState = () => {
    const state = {
      currentStep,
      relayConfig,
      senderDetails,
      targets,
      template,
    };
    localStorage.setItem('campaignState', JSON.stringify(state));
    console.log('💾 Campaign state saved to localStorage');
  };

  const reset = () => {
    setCurrentStep(1);
    setRelayConfig(initialRelayConfig);
    setSenderDetails(initialSenderDetails);
    setTargets([]);
    setTemplate(initialTemplate);
    setExecutionStatus([]);
    localStorage.removeItem('campaignState');
    console.log('🗑️ Campaign state cleared');
  };

  const value: CampaignContextType = {
    currentStep,
    relayConfig,
    senderDetails,
    targets,
    template,
    executionStatus,
    setStep: setCurrentStep,
    updateRelayConfig,
    updateSenderDetails,
    updateTargets,
    updateTemplate,
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
