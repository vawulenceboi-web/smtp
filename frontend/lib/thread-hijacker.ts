export function generateThreadHeaders(options: {
  senderDomain: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
}): Record<string, string> {
  
  const headers: Record<string, string> = {
    'X-Mailer': `Microsoft Outlook 16.0;${Math.floor(Math.random()*1000)}`,
    'X-Originating-IP': `[${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}]`,
    'Thread-Topic': `Re: Wire Transfer Confirmation - ${options.senderDomain}`,
    'Thread-Index': generateThreadIndex(),
    'X-MS-Exchange-Organization-MessageDirectionality': 'Incoming'
  };

  
  if (options.inReplyTo) {
    headers['In-Reply-To'] = options.inReplyTo;
    headers['References'] = options.references || options.inReplyTo;
  }

  if (options.replyTo) {
    headers['Reply-To'] = options.replyTo;
  }

  return headers;
}

function generateThreadIndex() {
  const bytes = new Uint8Array(22);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).slice(0, 22);
}