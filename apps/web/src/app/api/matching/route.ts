import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  let apiBase =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const res = await fetch(`${apiBase}/matching?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(subdomainHeader ? { 'x-tenant-subdomain': subdomainHeader } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errData = await res.json().catch(() => null);
    return NextResponse.json(
      errData || { success: false, message: 'Matching failed' },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to reach matching service.' },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  let apiBase =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const body = await request.json();
    const res = await fetch(`${apiBase}/matching`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(subdomainHeader ? { 'x-tenant-subdomain': subdomainHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errData = await res.json().catch(() => null);
    return NextResponse.json(
      errData || { success: false, message: 'Matching query failed' },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to reach matching service.' },
      { status: 502 }
    );
  }
}
