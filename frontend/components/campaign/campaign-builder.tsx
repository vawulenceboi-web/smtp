'use client';

import { useCampaign } from '@/lib/campaign-context';
import { Step1RelayConfig } from './step1-relay-config';
import { Step2SenderDetails } from './step2-sender-details';
import { Step3TargetImport } from './step3-target-import';
import { Step4TemplateEditor } from './step4-template-editor';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';

export function CampaignBuilder() {
  const { currentStep, setStep, targets, relayConfig, senderDetails, template, reset } = useCampaign();

  const steps = [
    { number: 1, title: 'SMTP Relay', isComplete: !!relayConfig.host },
    { number: 2, title: 'Sender Details', isComplete: !!senderDetails.fromEmail },
    { number: 3, title: 'Target Import', isComplete: targets.length > 0 },
    { number: 4, title: 'Template', isComplete: !!template.subject },
  ];

  const canGoToStep = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return steps[0].isComplete;
    if (stepNumber === 3) return steps[0].isComplete && steps[1].isComplete;
    if (stepNumber === 4) return steps[0].isComplete && steps[1].isComplete && steps[2].isComplete;
    return false;
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar Stepper */}
      <div className="hidden lg:flex flex-col w-64 flex-shrink-0">
        <div className="sticky top-24 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Campaign Setup
          </h3>

          <div className="space-y-3">
            {steps.map((step, idx) => {
              const isActive = currentStep === step.number;
              const isComplete = step.isComplete && !isActive;
              const isDisabled = !canGoToStep(step.number);

              return (
                <button
                  key={step.number}
                  onClick={() => canGoToStep(step.number) && setStep(step.number)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isComplete
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                    <span className="absolute text-xs font-bold">{step.number}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs opacity-70">
                      {isComplete ? 'Complete' : 'Pending'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Progress</span>
              <span className="text-xs font-bold text-foreground">
                {Math.round(((currentStep - 1) / 4) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              />
            </div>
            
            {/* Clear Data Button */}
            <button
              onClick={() => {
                if (confirm('Are you sure? This will clear all campaign data and reload the form.')) {
                  reset();
                  window.location.reload();
                }
              }}
              className="mt-4 w-full text-xs text-destructive hover:text-destructive/90 flex items-center justify-center gap-2 py-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Stepper */}
        <div className="lg:hidden mb-6">
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => canGoToStep(step.number) && setStep(step.number)}
                  disabled={!canGoToStep(step.number)}
                  className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-colors ${
                    currentStep === step.number
                      ? 'bg-primary text-primary-foreground'
                      : step.isComplete
                      ? 'bg-green-500 text-white'
                      : 'bg-secondary text-secondary-foreground'
                  } ${!canGoToStep(step.number) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {step.isComplete && currentStep !== step.number ? '✓' : step.number}
                </button>
                {idx < steps.length - 1 && (
                  <div className="w-8 h-1 bg-secondary" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card border border-border rounded-lg p-6 lg:p-8">
          {currentStep === 1 && <Step1RelayConfig />}
          {currentStep === 2 && <Step2SenderDetails />}
          {currentStep === 3 && <Step3TargetImport />}
          {currentStep === 4 && <Step4TemplateEditor />}

          {/* Navigation Buttons for Mobile */}
          <div className="lg:hidden flex gap-3 pt-6 mt-6 border-t border-border">
            {currentStep > 1 && (
              <button
                onClick={() => setStep(currentStep - 1)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
              >
                Back
              </button>
            )}
            {currentStep < 4 && (
              <button
                onClick={() => setStep(currentStep + 1)}
                disabled={!canGoToStep(currentStep + 1)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ml-auto"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
