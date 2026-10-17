import test from 'node:test';
import assert from 'node:assert';
import { FEATURE_CATALOG, isFeatureAllowedForPlan, FeatureKey } from './features';

test('Feature Catalog & Plan Permissibility Matrix Tests', async (t) => {
  await t.test('all catalog features have valid metadata', () => {
    const keys = Object.keys(FEATURE_CATALOG) as FeatureKey[];
    assert.ok(keys.length >= 25, 'Catalog should define at least 25 standard enterprise features');

    for (const key of keys) {
      const meta = FEATURE_CATALOG[key];
      assert.strictEqual(meta.key, key);
      assert.ok(meta.name.length > 0, `Feature ${key} must have a name`);
      assert.ok(['STARTER', 'GROWTH', 'ENTERPRISE'].includes(meta.minPlan), `Invalid minPlan for ${key}`);
      assert.ok(meta.description.length > 0, `Feature ${key} must have a description`);
    }
  });

  await t.test('Starter tier permissions', () => {
    // Unlocked on Starter
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:dashboard:core'), true);
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:employees:directory'), true);
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:payroll:statutory_engine'), true);

    // Locked on Starter
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:payroll:custom_designer'), false);
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:certificates:library'), false);
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:inventory:tracking'), false);
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'feature:recruitment:ats'), false);
  });

  await t.test('Growth tier permissions', () => {
    // Unlocked on Growth
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:dashboard:core'), true);
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:payroll:custom_designer'), true);
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:certificates:library'), true);
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:inventory:tracking'), true);
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:ess:portal'), true);

    // Locked on Growth
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:recruitment:ats'), false);
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'feature:workflow:custom_engine'), false);
  });

  await t.test('Enterprise tier permissions', () => {
    // Everything unlocked on Enterprise
    assert.strictEqual(isFeatureAllowedForPlan('ENTERPRISE', 'feature:dashboard:core'), true);
    assert.strictEqual(isFeatureAllowedForPlan('ENTERPRISE', 'feature:payroll:custom_designer'), true);
    assert.strictEqual(isFeatureAllowedForPlan('ENTERPRISE', 'feature:recruitment:ats'), true);
    assert.strictEqual(isFeatureAllowedForPlan('ENTERPRISE', 'feature:security:sso'), true);
    assert.strictEqual(isFeatureAllowedForPlan('ENTERPRISE', 'feature:placement:dedicated_db'), true);
  });

  await t.test('Deny by default for unmapped or unknown features', () => {
    assert.strictEqual(isFeatureAllowedForPlan('STARTER', 'unknown:feature:key' as any), false);
    assert.strictEqual(isFeatureAllowedForPlan('GROWTH', 'unknown:feature:key' as any), false);
    assert.strictEqual(isFeatureAllowedForPlan('ENTERPRISE', 'unknown:feature:key' as any), false);
  });
});
