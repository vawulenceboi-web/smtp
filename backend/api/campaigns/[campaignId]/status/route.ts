'use server';

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.BACKEND_API_BASE_URL;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  if (!API_BASE) {
    return NextResponse.json({ error: 'Backend URL not configured' }, { status: 500 });
  }

  const { campaignId } = await context.params;

  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/status`, {
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

