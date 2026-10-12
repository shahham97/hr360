import { NextRequest } from 'next/server';
import { CandidateScoringCriteriaSchema } from '@hr360/schema';
import { apiError, apiSuccess, createRequestId } from '@/lib/api-response';

import { authenticateTenant } from '@/lib/auth-service';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();
  const auth = await authenticateTenant(req);

  if (!auth.success) {
    return apiError('UNAUTHORIZED', auth.error, auth.statusCode, undefined, requestId);
  }
  const companyId = auth.context.companyId;

  const { verifyTenantEntitlement } = await import('@/lib/entitlement-guard');
  const entitlementCheck = await verifyTenantEntitlement(companyId, {
    requiredModule: 'recruitment',
  });

  if (!entitlementCheck.allowed) {
    return apiError(
      'FORBIDDEN',
      entitlementCheck.reason || 'Recruitment ATS is exclusively available on Enterprise plan.',
      entitlementCheck.statusCode || 403,
      undefined,
      requestId
    );
  }

  try {
    const json = await req.json();
    const parsed = CandidateScoringCriteriaSchema.safeParse(json);

    if (!parsed.success) {
      return apiError('BAD_REQUEST', 'Invalid candidate evaluation payload.', 400, { errors: parsed.error.flatten().fieldErrors }, requestId);
    }

    const {
      hardSkillsMatch,
      softSkillsMatch,
      experienceYears,
      targetExperienceYears,
      educationTier,
      targetEducationTier,
      knockedOut,
      knockoutReason,
    } = parsed.data;

    if (knockedOut) {
      return apiSuccess(
        {
          finalScore: 0.0,
          isKnockedOut: true,
          knockoutReason: knockoutReason || 'Failed mandatory knockout qualification criteria.',
        },
        requestId
      );
    }

    // Weights: 40% Hard, 20% Soft, 25% Experience, 15% Education
    const expScore = Math.min(1.0, experienceYears / targetExperienceYears);
    const eduScore = Math.min(1.0, educationTier / targetEducationTier);

    const weightedScore =
      0.4 * hardSkillsMatch +
      0.2 * softSkillsMatch +
      0.25 * expScore +
      0.15 * eduScore;

    const finalScore = Math.round(weightedScore * 10000) / 100;

    return apiSuccess(
      {
        finalScore,
        isKnockedOut: false,
        breakdown: {
          hardScore: Math.round(hardSkillsMatch * 100),
          softScore: Math.round(softSkillsMatch * 100),
          expScore: Math.round(expScore * 100),
          eduScore: Math.round(eduScore * 100),
        },
      },
      requestId
    );
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500, undefined, requestId);
  }
}
