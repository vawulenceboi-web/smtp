import { z } from 'zod';

export const relayConfigSchema = z.object({
  name: z.string().min(1, 'Relay name is required').max(100),
  host: z.string().min(1, 'SMTP host is required').min(3, 'Invalid host'),
  port: z.number().min(1).max(65535),
  useTLS: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const senderDetailsSchema = z.object({
  fromName: z.string().min(1, 'Sender name is required').max(100),
  fromEmail: z.string().email('Invalid email address'),
});

export const emailListSchema = z.string().min(1, 'Email list is required');

export const emailSchema = z.string().email('Invalid email address');

export const templateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  replyTo: z.string().email('Invalid email address').or(z.string().length(0)),
  inReplyToId: z.string().max(500).default(''),
  bodyContent: z.string().min(1, 'Body content is required'),
});

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validateEmailList(text: string): { emails: string[]; invalid: string[] } {
  const lines = text.split(/[\r\n]+/).filter((line) => line.trim());
  const emails: string[] = [];
  const invalid: string[] = [];

  lines.forEach((line) => {
    const email = line.trim();
    if (validateEmail(email)) {
      emails.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { emails, invalid };
}

export type RelayConfigInput = z.infer<typeof relayConfigSchema>;
export type SenderDetailsInput = z.infer<typeof senderDetailsSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
