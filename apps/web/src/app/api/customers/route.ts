import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const res = await fetch(`${apiBase}/customers?${searchParams.toString()}`, {
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
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(errData, { status: res.status });
  } catch {
    // Offline / standalone fallback
    return NextResponse.json({
      success: true,
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        stats: { total: 0, active: 0, pending: 0, paused: 0, inactive: 0, discharged: 0 },
      },
    });
  }
}

export async function POST(request: Request) {
  let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const body = await request.json();
    const res = await fetch(`${apiBase}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(subdomainHeader ? { 'x-tenant-subdomain': subdomainHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to create customer.' },
      { status: 500 }
    );
  }
}
