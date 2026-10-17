import test from 'node:test';
import assert from 'node:assert/strict';
import { scrubSensitiveString, scrubObject, sentryScrubberBeforeSend } from './credential-scrubber.ts';

test('T12 Verification Matrix - Credential Scrubber & Redactor Security', (t) => {
  const secretUri = 'mysql://app_user:SuperSecretPassword123!@127.0.0.1:4000/company_db?ssl=true';
  const scrubbed = scrubSensitiveString(secretUri);

  assert.ok(!scrubbed.includes('SuperSecretPassword123!'), 'Password must be completely redacted');
  assert.ok(scrubbed.includes('[REDACTED_PASSWORD]'), 'Must replace password with standard redaction tag');

  const errorObj = {
    message: 'Failed to connect to cluster at host with CNIC 35201-1234567-1 and IBAN PK36SCBL0000001123456701',
    connectionString: secretUri,
    rawDek: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    nationalId: '35201-1234567-1',
    safeField: 'HR360_STATUS_OK',
  };

  const scrubbedObj = scrubObject(errorObj);
  assert.equal(scrubbedObj.connectionString, '[REDACTED]');
  assert.equal(scrubbedObj.rawDek, '[REDACTED]');
  assert.equal(scrubbedObj.nationalId, '[REDACTED]');
  assert.equal(scrubbedObj.safeField, 'HR360_STATUS_OK');
  assert.ok(!scrubbedObj.message.includes('35201-1234567-1'));
  assert.ok(scrubbedObj.message.includes('[REDACTED_CNIC]'));
  assert.ok(scrubbedObj.message.includes('[REDACTED_IBAN]'));

  // Sentry BeforeSend Hook Test
  const sentryEvent = {
    request: {
      headers: {
        authorization: 'Bearer secret_access_token_123',
        cookie: 'hr360_access_token=secret_cookie_val',
      },
    },
    message: 'Crash while processing CNIC 35201-7654321-9 with key 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    breadcrumbs: [
      { message: 'User entered 35201-7654321-9' },
    ],
  };

  const cleanEvent = sentryScrubberBeforeSend(sentryEvent);
  assert.equal(cleanEvent.request.headers.authorization, '[REDACTED_TOKEN]');
  assert.equal(cleanEvent.request.headers.cookie, '[REDACTED_COOKIE]');
  assert.ok(!cleanEvent.message.includes('35201-7654321-9'));
  assert.ok(cleanEvent.message.includes('[REDACTED_CNIC]'));
  assert.ok(!cleanEvent.breadcrumbs[0].message.includes('35201-7654321-9'));
});
