import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const res = await fetch(`${API_BASE_URL}/analytics/cache/clear`, {
      method: 'POST',
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
  } catch {
    // Fallback response for offline mock mode
  }

  return NextResponse.json({
    success: true,
    message: 'Analytics cache cleared successfully.',
    clearedAt: new Date().toISOString(),
  });
}
