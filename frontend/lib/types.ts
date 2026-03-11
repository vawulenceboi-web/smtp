// Sender Details
export interface SenderDetails {
  fromName: string;
  fromEmail: string;
}

// Email Target
export interface EmailTarget {
  email: string;
  isValid: boolean;
}

// Email Template
export interface EmailTemplate {
  subject: string;
  replyTo: string;
  inReplyToId: string;
  bodyContent: string;
}

// Campaign Data
export interface Campaign {
  id: string;
  name: string;
  createdAt: Date;
  senderDetails: SenderDetails;
  targets: EmailTarget[];
  template: EmailTemplate;
  status: 'draft' | 'running' | 'completed' | 'paused';
}

// Execution Status
export interface EmailExecutionStatus {
  email: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp?: Date;
  message?: string;
}

// Campaign Context Type
export interface CampaignContextType {
  currentStep: number;
  senderDetails: SenderDetails;
  targets: EmailTarget[];
  template: EmailTemplate;
  executionStatus: EmailExecutionStatus[];
  setStep: (step: number) => void;
  updateSenderDetails: (details: Partial<SenderDetails>) => void;
  updateTargets: (targets: EmailTarget[]) => void;
  updateTemplate: (template: Partial<EmailTemplate>) => void;
  setExecutionStatus: (statuses: EmailExecutionStatus[]) => void;
  reset: () => void;
  saveCampaignState: () => void;
}
