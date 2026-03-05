'use server';

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_API_BASE_URL;

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn('BACKEND_API_BASE_URL is not set. API routes will fail until it is configured.');
}

export async function GET() {
  if (!API_BASE) {
    return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });
  }

  const res = await fetch(`${API_BASE}/campaigns`, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });
  }

  const body = await request.json();

  const res = await fetch(`${API_BASE}/campaigns/enqueue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

