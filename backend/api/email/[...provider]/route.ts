// app/api/email/[...provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendEmailWithRelay } from '@/lib/relay-manager';
import { generateThreadHeaders } from '@/lib/thread-hijacker';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const {
      provider, // 'brevo', 'mailgun', 'zoho', 'smtp'
      smtpConfig, // { host, port, user, pass, secure }
      senderDomain,
      targets, // array of emails
      subject,
      body,
      replyTo,
      inReplyTo,
      references
    } = json;

    // Generate BEC-specific thread hijacking headers
    const threadHeaders = generateThreadHeaders({
      senderDomain,
      replyTo,
      inReplyTo,
      references
    });

    // Send batch through relay with rotation
    const results = await sendEmailWithRelay({
      provider,
      smtpConfig,
      senderDomain,
      targets,
      subject,
      body,
      headers: threadHeaders
    });

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unexpected error while sending email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}