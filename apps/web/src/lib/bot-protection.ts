export interface BotCheckInput {
  honeypot?: string | null;
  formRenderTimestamp?: number | string | null;
  turnstileToken?: string | null;
  clientIp?: string | null;
}

export interface BotCheckResult {
  isBot: boolean;
  reason?: string;
}

/**
 * Free Multi-Layer Bot Mitigation Engine
 * Operates at zero extra cost using honeypot traps, submission velocity gates,
 * and optional Cloudflare Turnstile verification.
 */
export async function verifyHumanSubmission(input: BotCheckInput): Promise<BotCheckResult> {
  // Layer 1: Honeypot Trap
  // Automated spam scripts fill all visible and invisible input fields indiscriminately
  if (input.honeypot && typeof input.honeypot === 'string' && input.honeypot.trim().length > 0) {
    return {
      isBot: true,
      reason: 'Honeypot trap triggered by automated submission.',
    };
  }

  // Layer 2: Form Interaction Velocity Gate
  // Humans take at least 1.5 seconds to fill out name, company, email, and phone
  if (input.formRenderTimestamp) {
    const renderTime = Number(input.formRenderTimestamp);
    if (!isNaN(renderTime) && renderTime > 0) {
      const elapsedMs = Date.now() - renderTime;
      if (elapsedMs < 1200) {
        return {
          isBot: true,
          reason: 'Subhuman form submission velocity detected.',
        };
      }
    }
  }

  // Layer 3: Cloudflare Turnstile Verification (if configured)
  const turnstileSecret = process.env.CF_TURNSTILE_SECRET_KEY;
  if (turnstileSecret && input.turnstileToken) {
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: input.turnstileToken,
          ...(input.clientIp ? { remoteip: input.clientIp } : {}),
        }),
      });

      const outcome = await verifyRes.json();
      if (!outcome.success) {
        return {
          isBot: true,
          reason: 'Interactive challenge verification failed.',
        };
      }
    } catch {
      // In case of external challenge timeout, fail open to avoid false rejection of valid human leads
    }
  }

  return { isBot: false };
}
