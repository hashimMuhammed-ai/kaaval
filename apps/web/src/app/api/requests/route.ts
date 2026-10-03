import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Field validations
    const requiredFields = [
      { key: 'serviceType', label: 'Service Type' },
      { key: 'district', label: 'Location / District' },
      { key: 'duration', label: 'Duration / Shift' },
      { key: 'genderPreference', label: 'Gender Preference' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'phone', label: 'Contact Phone Number' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'contactName', label: 'Contact Person Name' },
    ];

    for (const field of requiredFields) {
      if (!body[field.key] || typeof body[field.key] !== 'string' || !body[field.key].trim()) {
        return NextResponse.json(
          { success: false, message: `${field.label} is required.` },
          { status: 400 }
        );
      }
    }

    // Phone format validation (at least 10 digits)
    const cleanPhone = body.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid phone number with at least 10 digits.' },
        { status: 400 }
      );
    }

    const referenceId =
      body.referenceId ||
      `REQ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const tenantSlug =
      request.headers.get('x-tenant-slug') ||
      request.headers.get('x-tenant-subdomain') ||
      body.tenantSlug ||
      body.subdomain ||
      '';

    // 1. Dispatch to NestJS Backend (/requests/public) to persist in database & trigger WhatsApp
    let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
      apiBase = `${apiBase.replace(/\/$/, '')}/api`;
    }

    try {
      const backendRes = await fetch(`${apiBase}/requests/public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantSlug ? { 'x-tenant-slug': tenantSlug, 'x-tenant-subdomain': tenantSlug } : {}),
        },
        body: JSON.stringify({
          ...body,
          referenceId,
          tenantSlug: tenantSlug || undefined,
          subdomain: tenantSlug || body.subdomain || undefined,
          source: body.source || 'public_form',
        }),
      });

      const data = await backendRes.json().catch(() => null);

      if (backendRes.ok && data) {
        return NextResponse.json(data, { status: 201 });
      }

      const errorMsg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
        `Backend failed with status ${backendRes.status}`;

      return NextResponse.json(
        { success: false, message: errorMsg },
        { status: backendRes.status || 500 }
      );
    } catch (fetchErr: any) {
      return NextResponse.json(
        {
          success: false,
          message:
            fetchErr?.message ||
            'Unable to connect to backend server. Please check your network or try again later.',
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Failed to process care request.' },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  let apiBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  if (!apiBase.endsWith('/api') && !apiBase.includes('/api/')) {
    apiBase = `${apiBase.replace(/\/$/, '')}/api`;
  }

  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader =
    request.headers.get('x-tenant-slug') ||
    request.headers.get('x-tenant-subdomain') ||
    '';

  try {
    const res = await fetch(`${apiBase}/requests?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(subdomainHeader
          ? { 'x-tenant-subdomain': subdomainHeader, 'x-tenant-slug': subdomainHeader }
          : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Pass through to empty response or offline state
  }

  return NextResponse.json({
    success: true,
    data: [],
    meta: {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      stats: { total: 0, pending: 0, contacted: 0, matched: 0, assigned: 0, completed: 0 },
    },
  });
}

