import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubSensitiveString, scrubObject } from './credential-scrubber.ts';

test('T12 Verification Matrix - Credential Scrubber & Redactor Security', () => {
  const secretUri = 'mysql://app_user:SuperSecretPassword123!@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/company_db?ssl=true';
  const scrubbed = scrubSensitiveString(secretUri);

  assert.ok(!scrubbed.includes('SuperSecretPassword123!'), 'Password must be completely redacted');
  assert.ok(scrubbed.includes('[REDACTED_PASSWORD]'), 'Must replace password with standard redaction tag');

  const errorObj = {
    message: 'Failed to connect to cluster at host',
    connectionString: secretUri,
    rawDek: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    safeField: 'HR360_STATUS_OK',
  };

  const scrubbedObj = scrubObject(errorObj);
  assert.equal(scrubbedObj.connectionString, '[REDACTED]');
  assert.equal(scrubbedObj.rawDek, '[REDACTED]');
  assert.equal(scrubbedObj.safeField, 'HR360_STATUS_OK');
});
