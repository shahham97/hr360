export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_HEALTH_CHECK - Unauthenticated service availability probe
import { NextResponse } from 'next/server';

import { getMasterPrismaClient } from '@hr360/db-master';

export async function GET() {
  let dbStatus = 'untested';
  let dbError = null;

  try {
    const prisma = getMasterPrismaClient();
    const count = await prisma.platformStaff.count();
    dbStatus = `connected (staff count: ${count})`;
  } catch (err: any) {
    dbStatus = 'disconnected';
    dbError = {
      name: err.name,
      message: err.message,
      code: err.code,
    };
  }

  return NextResponse.json({
    status: dbStatus.startsWith('connected') ? 'healthy' : 'degraded',
    database: dbStatus,
    databaseError: dbError,
    timestamp: new Date().toISOString(),
    service: 'HR360 Cloud Platform',
  });
}
