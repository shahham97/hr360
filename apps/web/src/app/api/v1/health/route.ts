export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_HEALTH_CHECK - Unauthenticated service availability probe
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HR360 Cloud Platform',
  });
}
