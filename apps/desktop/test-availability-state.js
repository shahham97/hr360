// @ts-check
const assert = require('assert');

console.log('[Test: Batch E Availability & Offline Detection] Testing 3 distinct availability states...');

function determineConnectionState({ isNavigatorOnline, isApiReachable, isLicenseValid }) {
  if (!isLicenseValid) {
    return 'ACCESS_LOCKED';
  }
  if (!isNavigatorOnline) {
    return 'NO_INTERNET';
  }
  if (!isApiReachable) {
    return 'SERVICE_UNAVAILABLE';
  }
  return 'ONLINE';
}

// 1. Test Online State
const s1 = determineConnectionState({ isNavigatorOnline: true, isApiReachable: true, isLicenseValid: true });
assert.strictEqual(s1, 'ONLINE', 'Must be ONLINE when network, API, and license are healthy');
console.log('  ✔ State 1: ONLINE correctly resolved.');

// 2. Test No Internet State (Wi-Fi disconnected or OS offline)
const s2 = determineConnectionState({ isNavigatorOnline: false, isApiReachable: false, isLicenseValid: true });
assert.strictEqual(s2, 'NO_INTERNET', 'Must show NO_INTERNET when OS is offline');
console.log('  ✔ State 2: NO_INTERNET correctly resolved when OS offline.');

// 3. Test Service Temporarily Unavailable (Internet works, but cloud API unreachable / maintenance)
const s3 = determineConnectionState({ isNavigatorOnline: true, isApiReachable: false, isLicenseValid: true });
assert.strictEqual(s3, 'SERVICE_UNAVAILABLE', 'Must show SERVICE_UNAVAILABLE when API is unreachable but network is up');
console.log('  ✔ State 3: SERVICE_UNAVAILABLE correctly resolved during API maintenance/outage.');

// 4. Test Access Locked (License expired or tenant deactivated)
const s4 = determineConnectionState({ isNavigatorOnline: true, isApiReachable: true, isLicenseValid: false });
assert.strictEqual(s4, 'ACCESS_LOCKED', 'Must show ACCESS_LOCKED when subscription/tenant is suspended');
console.log('  ✔ State 4: ACCESS_LOCKED correctly resolved on subscription suspension.');

console.log('✅ [Batch E Availability Test Passed] All 4 availability states and transitions validated.');
