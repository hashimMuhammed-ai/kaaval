import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const res = await fetch(`${apiBase}/customers/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(subdomainHeader ? { 'x-tenant-subdomain': subdomainHeader } : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to fetch customer detail.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const body = await request.json();
    const res = await fetch(`${apiBase}/customers/${id}`, {
      method: 'PATCH',
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
      { success: false, message: err?.message || 'Failed to update customer.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const res = await fetch(`${apiBase}/customers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(subdomainHeader ? { 'x-tenant-subdomain': subdomainHeader } : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to remove customer.' },
      { status: 500 }
    );
  }
}
