'use client';

import { useState } from 'react';
import { useCampaign } from '@/lib/campaign-context';
import { validateEmailList } from '@/lib/validators';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

export function Step3TargetImport() {
  const { targets, updateTargets, setStep } = useCampaign();
  const [emailText, setEmailText] = useState(
    targets.map((t) => t.email).join('\n')
  );
  const [validationResult, setValidationResult] = useState<{
    emails: string[];
    invalid: string[];
  } | null>(null);
  const [hasValidated, setHasValidated] = useState(false);

  const handleValidate = () => {
    const result = validateEmailList(emailText);
    setValidationResult(result);
    setHasValidated(true);

    if (result.emails.length > 0) {
      const emailTargets = result.emails.map((email) => ({
        email,
        isValid: true,
      }));
      updateTargets(emailTargets);
    }
  };

  const handleContinue = () => {
    if (validationResult && validationResult.emails.length > 0) {
      const emailTargets = validationResult.emails.map((email) => ({
        email,
        isValid: true,
      }));
      updateTargets(emailTargets);
      setStep(4);
    }
  };

  const lineCount = emailText.split('\n').filter((line) => line.trim()).length;
  const validCount = validationResult?.emails.length || 0;
  const invalidCount = validationResult?.invalid.length || 0;

  const canContinue = validationResult && validationResult.emails.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Target Email Import</h2>
        <p className="text-muted-foreground">Paste email addresses (one per line, max 100)</p>
      </div>

      <div className="space-y-4">
        {/* Textarea */}
        <div>
          <label htmlFor="emails" className="block text-sm font-medium text-foreground mb-2">
            Email List
          </label>
          <textarea
            id="emails"
            value={emailText}
            onChange={(e) => {
              setEmailText(e.target.value);
              setHasValidated(false);
              setValidationResult(null);
            }}
            placeholder={
              'email1@example.com\nemail2@example.com\nemail3@example.com'
            }
            className="w-full h-64 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
          />

          <div className="mt-2 text-xs text-muted-foreground">
            Lines: {lineCount} • Max: 100 emails
          </div>
        </div>

        {/* Validation Result */}
        {hasValidated && validationResult && (
          <div className="space-y-3">
            {/* Valid Emails */}
            {validationResult.emails.length > 0 && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <p className="font-medium text-green-300">
                    {validationResult.emails.length} Valid Email(s)
                  </p>
                </div>
                <div className="max-h-24 overflow-y-auto">
                  <div className="space-y-1">
                    {validationResult.emails.slice(0, 3).map((email, idx) => (
                      <p key={idx} className="text-xs text-green-200">
                        ✓ {email}
                      </p>
                    ))}
                    {validationResult.emails.length > 3 && (
                      <p className="text-xs text-green-200">
                        + {validationResult.emails.length - 3} more...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Invalid Emails */}
            {validationResult.invalid.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="font-medium text-red-300">
                    {validationResult.invalid.length} Invalid Email(s)
                  </p>
                </div>
                <div className="max-h-24 overflow-y-auto">
                  <div className="space-y-1">
                    {validationResult.invalid.slice(0, 3).map((email, idx) => (
                      <p key={idx} className="text-xs text-red-200">
                        ✗ {email}
                      </p>
                    ))}
                    {validationResult.invalid.length > 3 && (
                      <p className="text-xs text-red-200">
                        + {validationResult.invalid.length - 3} more...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Empty Warning */}
            {validationResult.emails.length === 0 && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <p className="text-sm text-yellow-300">
                  No valid emails found. Please check your input format.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Format:</strong> One email address per line. Empty lines are ignored.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
          >
            Validate Format
          </button>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium ml-auto"
          >
            Continue to Next Step
          </button>
        </div>
      </div>
    </div>
  );
}
