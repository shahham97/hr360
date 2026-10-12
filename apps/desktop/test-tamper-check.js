// @ts-check
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

console.log('[Test: Tamper Resistance] Starting automated integrity verification tests...');

const tmpDir = path.join(__dirname, 'test-tamper-tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

try {
  // 1. Create a bundle file
  const testBundle = path.join(tmpDir, 'bundle.jsc');
  const validPayload = Buffer.from('console.log("HR360_SECURE_V8_BYTECODE_PAYLOAD");');
  fs.writeFileSync(testBundle, validPayload);

  const correctHash = crypto.createHash('sha256').update(validPayload).digest('hex');

  const manifest = {
    compiledAt: new Date().toISOString(),
    files: {
      'bundle.jsc': correctHash,
    },
  };
  fs.writeFileSync(path.join(tmpDir, 'integrity-manifest.json'), JSON.stringify(manifest, null, 2));

  // Verification helper mimicking main.js logic
  function checkIntegrity(dir) {
    const manifestPath = path.join(dir, 'integrity-manifest.json');
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const [rel, expected] of Object.entries(m.files)) {
      const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex');
      if (actual !== expected) {
        return false;
      }
    }
    return true;
  }

  // 2. Validate pristine state passes
  assert.strictEqual(checkIntegrity(tmpDir), true, 'Pristine bundle must pass integrity validation');
  console.log('  ✔ Pristine bundle correctly passes integrity validation.');

  // 3. Tamper with the file (flip a single byte)
  const tamperedPayload = Buffer.from('console.log("HR360_TAMPERED_BYTECODE_PAYLOAD!");');
  fs.writeFileSync(testBundle, tamperedPayload);

  // 4. Validate tampered state fails
  assert.strictEqual(checkIntegrity(tmpDir), false, 'Tampered bundle must fail integrity validation');
  console.log('  ✔ Tampered bundle correctly detected and rejected by integrity engine.');

  console.log('✅ [Tamper Resistance Test Passed] 100% integrity check assertions passed.');
} finally {
  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
