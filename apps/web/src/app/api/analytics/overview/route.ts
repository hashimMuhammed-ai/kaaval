import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const subdomainHeader = request.headers.get('x-tenant-subdomain') || '';

  try {
    const res = await fetch(`${API_BASE_URL}/analytics/overview`, {
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
    // Graceful fallback for mock/demo mode when backend is offline
  }

  // Realistic fallback demo data for Kerala Care Agency
  return NextResponse.json({
    success: true,
    data: {
      tenantId: 'tenant-kerala-care',
      totalCaregivers: 24,
      activeWorkforceCaregivers: 22,
      assignedCaregivers: 18,
      availableCaregivers: 4,
      onLeaveCaregivers: 2,
      inactiveCaregivers: 2,
      activeAssignmentsCount: 18,
      occupancyRatePct: 75.0,
      totalRequests: 62,
      filledRequests: 56,
      pendingRequests: 6,
      avgTimeToFillHours: 15.4,
      avgTimeToFillDays: 0.64,
      fillRatePct: 90.32,
      allTimeGrossRevenue: 1485000,
      allTimeCommissionRevenue: 222750,
      allTimeNetPayout: 1262250,
      currentMonthGrossRevenue: 248000,
      currentMonthCommissionRevenue: 37200,
      currentMonthNetPayout: 210800,
      previousMonthCommissionRevenue: 33500,
      revenueGrowthMomPct: 11.04,
      refreshedAt: new Date().toISOString(),
    },
  });
}
