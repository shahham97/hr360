export const runtime = 'nodejs';
// @ROUTE_EXEMPT: PUBLIC_LEADS_SUBMISSION - Marketing demo and lead generation
import { NextRequest } from 'next/server';
import { getMasterPrismaClient } from '@hr360/db-master';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

import { authenticateStaff } from '@/lib/auth-service';

export async function GET(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  try {
    const prisma = getMasterPrismaClient();
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const result = leads.map((l: any) => ({
      id: l.id,
      fullName: l.fullName,
      workEmail: l.workEmail,
      companyName: l.companyName,
      phone: (l as any).phone || 'N/A',
      whatsapp: (l as any).whatsapp || 'N/A',
      selectedTier: (l as any).selectedTier || 'STARTER',
      selectedPackage: (l as any).selectedPackage || 'MONTHLY',
      isEngaged: (l as any).isEngaged || false,
      notes: (l as any).notes || null,
      createdAt: l.createdAt,
    }));

    return apiSuccess(result, requestId);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await req.json();
    const { fullName, companyName, workEmail, phone, whatsapp, selectedTier, selectedPackage } = body;

    if (!fullName || !companyName || !phone) {
      return apiError('BAD_REQUEST', 'Full Name, Company Name, and Phone Number are required.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();
    const lead = await prisma.lead.create({
      data: {
        fullName,
        companyName,
        workEmail: workEmail || `${phone.replace(/\D/g, '')}@inquiry.local`,
        phone,
        whatsapp: whatsapp || phone,
        selectedTier: selectedTier || 'STARTER',
        selectedPackage: selectedPackage || 'MONTHLY',
        isEngaged: false,
        ipHash: req.headers.get('x-forwarded-for') || 'direct_portal',
      } as any,
    });

    // Record audit event
    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: phone,
      actorType: 'ANONYMOUS',
      action: 'PACKAGE_INQUIRY_SUBMITTED',
      entityType: 'LEAD',
      entityId: lead.id,
      metadata: {
        fullName,
        companyName,
        phone,
        whatsapp: whatsapp || phone,
        selectedTier,
        selectedPackage,
      },
    });

    return apiSuccess(
      {
        id: lead.id,
        message: 'Your plan request has been submitted. Our executive will reach out to you via WhatsApp / Phone.',
      },
      requestId,
      201
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateStaff(req);

  if (!auth.success) {
    return apiError('FORBIDDEN', auth.error, auth.statusCode, undefined, requestId);
  }

  const staffId = auth.staff.staffId;

  try {
    const body = await req.json();
    const targetId = body.leadId || body.id;
    const { isEngaged, notes } = body;

    if (!targetId) {
      return apiError('BAD_REQUEST', 'Lead ID is required.', 400, undefined, requestId);
    }

    const prisma = getMasterPrismaClient();
    const updated = await prisma.lead.update({
      where: { id: targetId },
      data: {
        ...(isEngaged !== undefined ? { isEngaged } : {}),
        ...(notes !== undefined ? { notes } : {}),
      } as any,
    });

    // Record audit event
    const { logPlatformAudit } = await import('@/lib/audit-logger');
    await logPlatformAudit({
      actorId: staffId,
      actorType: 'STAFF',
      action: isEngaged ? 'LEAD_MARKED_ENGAGED' : 'LEAD_MARKED_DISENGAGED',
      entityType: 'LEAD',
      entityId: targetId,
      metadata: {
        isEngaged,
        companyName: updated.companyName,
        contactName: updated.fullName,
      },
    });

    return apiSuccess(
      {
        id: updated.id,
        isEngaged: (updated as any).isEngaged,
        message: `Lead for ${updated.companyName} marked as ${isEngaged ? 'ENGAGED' : 'DISENGAGED'}.`,
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
