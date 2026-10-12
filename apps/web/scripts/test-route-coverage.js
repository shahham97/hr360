// @ts-check
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const API_V1_DIR = path.resolve(__dirname, '../src/app/api/v1');

console.log('[Test: Route Coverage] Scanning all API v1 endpoints for entitlement enforcement...');

function findRouteFiles(dir) {
  let routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes = routes.concat(findRouteFiles(full));
    } else if (entry.isFile() && entry.name === 'route.ts') {
      routes.push(full);
    }
  }
  return routes;
}

const routeFiles = findRouteFiles(API_V1_DIR);
console.log(`Found ${routeFiles.length} API v1 route handlers.\n`);

let guardedCount = 0;
let exemptCount = 0;
let unhandled = [];

for (const file of routeFiles) {
  const relPath = path.relative(path.resolve(__dirname, '../../..'), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  const isGuarded = content.includes('verifyTenantEntitlement');
  const isExempt = content.includes('// @ROUTE_EXEMPT:');

  if (isGuarded) {
    guardedCount++;
    console.log(`  ✓ GUARDED: ${relPath}`);
  } else if (isExempt) {
    exemptCount++;
    const match = content.match(/\/\/ @ROUTE_EXEMPT:\s*([^\n\r]+)/);
    const reason = match ? match[1].trim() : 'Exempt';
    console.log(`  ℹ EXEMPT:  ${relPath} [${reason}]`);
  } else {
    unhandled.push(relPath);
    console.error(`  ✗ UNGUARDED / UNANNOTATED: ${relPath}`);
  }
}

console.log('\n[Summary]');
console.log(`  Total Routes:   ${routeFiles.length}`);
console.log(`  Guarded Routes: ${guardedCount}`);
console.log(`  Exempt Routes:  ${exemptCount}`);
console.log(`  Unguarded:      ${unhandled.length}`);

if (unhandled.length > 0) {
  console.error(`\n❌ [Route Coverage Failed] ${unhandled.length} routes lack entitlement guards or exemption annotations.`);
  process.exit(1);
} else {
  console.log('\n✅ [Route Coverage Passed] 100% of API v1 routes are cryptographically guarded or explicitly exempt.');
  process.exit(0);
}
