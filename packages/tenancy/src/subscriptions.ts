import EventEmitter from 'node:events';
import type { PrismaClient } from '@hr360/db-master';
import type { BillingInterval, PaymentMethodType } from '@hr360/schema';

export interface CheckoutResult {
  invoiceId: string;
  invoiceNumber: string;
  amountTotal: number;
  status: 'ISSUED' | 'PAID';
}

/**
 * Event-Driven Instant Revocation Channel (Section 7 & 9)
 * Pushes company status updates immediately to active SSE client connections.
 */
class RevocationEventStream extends EventEmitter {
  public notifyCompanyStatus(companyId: string, status: string, reason?: string) {
    this.emit(`status:${companyId}`, { companyId, status, reason, timestamp: new Date().toISOString() });
    this.emit('broadcast', { companyId, status, reason, timestamp: new Date().toISOString() });
  }
}

export const revocationStream = new RevocationEventStream();

/**
 * Subscription Lifecycle and Billing Engine
 */
export class SubscriptionEngine {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  public async createCheckout(
    companyId: string,
    planCode: string,
    interval: BillingInterval,
    method: PaymentMethodType,
    referenceNumber?: string
  ): Promise<CheckoutResult> {
    const plan = await this.prisma.plan.findUnique({
      where: { code: planCode },
    });

    if (!plan || !plan.isActive) {
      throw new Error(`Plan "${planCode}" is invalid or inactive.`);
    }

    const price = interval === 'ANNUAL' ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const durationDays = interval === 'ANNUAL' ? 365 : 30;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create or update subscription
      const sub = await tx.subscription.create({
        data: {
          companyId,
          planId: plan.id,
          interval,
          startsAt: now,
          expiresAt,
          autoRenew: true,
        },
      });

      const inv = await tx.invoice.create({
        data: {
          companyId,
          subscriptionId: sub.id,
          invoiceNumber,
          status: method === 'CARD' ? 'PAID' : 'ISSUED',
          amountSubtotal: price,
          amountTax: 0,
          amountTotal: price,
          dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          paidAt: method === 'CARD' ? now : null,
        },
      });

      await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount: price,
          method,
          status: method === 'CARD' ? 'COMPLETED' : 'PENDING',
          referenceNumber,
        },
      });

      // If paid immediately, activate tenant
      if (method === 'CARD') {
        await tx.tenant.updateMany({
          where: { companyId },
          data: { status: 'ACTIVE' },
        });
      }

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountTotal: price,
        status: inv.status as 'ISSUED' | 'PAID',
      };
    });

    if (method === 'CARD') {
      revocationStream.notifyCompanyStatus(companyId, 'ACTIVE', 'Subscription renewed via card checkout');
    }

    return result;
  }

  public async markManualPaymentPaid(
    paymentId: string,
    adminStaffId: string,
    referenceNumber: string
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found.`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          referenceNumber,
          recordedByStaff: adminStaffId,
        },
      });

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          status: 'PAID',
          paidAt: now,
        },
      });

      // Reactivate tenant
      await tx.tenant.updateMany({
        where: { companyId: payment.invoice.companyId },
        data: { status: 'ACTIVE' },
      });
    });

    revocationStream.notifyCompanyStatus(
      payment.invoice.companyId,
      'ACTIVE',
      'Manual payment verified by staff'
    );
  }

  public async setTenantStatus(
    companyId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
    reason: string
  ): Promise<void> {
    await this.prisma.tenant.updateMany({
      where: { companyId },
      data: { status },
    });

    // Notify connected desktop clients immediately
    revocationStream.notifyCompanyStatus(companyId, status, reason);
  }

  public async runDailyExpiryCheck(): Promise<{ expiredCount: number }> {
    const now = new Date();

    // Find all expired subscriptions
    const expiredSubs = await this.prisma.subscription.findMany({
      where: {
        expiresAt: { lt: now },
      },
      select: { companyId: true },
    });

    let count = 0;
    for (const sub of expiredSubs) {
      const updated = await this.prisma.tenant.updateMany({
        where: {
          companyId: sub.companyId,
          status: 'ACTIVE',
        },
        data: { status: 'EXPIRED' },
      });

      if (updated.count > 0) {
        count += updated.count;
        revocationStream.notifyCompanyStatus(sub.companyId, 'EXPIRED', 'Subscription period expired');
      }
    }

    return { expiredCount: count };
  }
}
