import { NextResponse } from 'next/server';

// Minimal API surface — the dashboard is fully client-side, but we expose a
// health endpoint and a stub for future history persistence.

export async function GET(request, { params }) {
  const path = (params?.path || []).join('/');
  if (path === '' || path === 'health') {
    return NextResponse.json({ ok: true, service: 'electrical-troubleshoot-dashboard' });
  }
  return NextResponse.json({ error: 'not found', path }, { status: 404 });
}

export async function POST(request, { params }) {
  const path = (params?.path || []).join('/');
  if (path === 'events') {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ accepted: true, body });
  }
  return NextResponse.json({ error: 'not found', path }, { status: 404 });
}
