// @ts-check
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Prohibited terms per Global Documentation Policy
const FORBIDDEN_DOC_PATTERNS = [
  { name: 'Vendor / Cloud infrastructure name', pattern: /\b(tidb(?:cloud)?|vercel|aws|sqlite|sqlcipher|mysql2?|prisma|r2|s3)\b/i },
  { name: 'Architecture / internal secret terminology', pattern: /\b(connection string|tenant database|envelope encryption|dek\/kek|ssrf allow-list)\b/i },
  { name: 'Internal security key mechanism naming', pattern: /\b(data encryption key|key encryption key|master dek)\b/i },
];

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'private-notes',
  'coverage',
  'release-builds',
  'target',
]);

function scanDirectory(dir) {
  let findings = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings = findings.concat(scanDirectory(fullPath));
    } else if (
      entry.isFile() &&
      (/\.(md|txt|html)$/i.test(entry.name) ||
        (/\.tsx$/i.test(entry.name) &&
          (fullPath.includes('apps\\web\\src\\app') || fullPath.includes('apps/web/src/app')) &&
          !fullPath.includes('admin') &&
          !fullPath.includes('api')))
    ) {
      // Don't scan internal audit files in docs/internal or legal third-party notices
      const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
      if (relPath.startsWith('docs/internal/') || relPath.endsWith('THIRD-PARTY-NOTICES.txt')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { name, pattern } of FORBIDDEN_DOC_PATTERNS) {
          if (pattern.test(line)) {
            findings.push({
              rule: name,
              file: relPath,
              line: i + 1,
              sample: line.trim().substring(0, 100),
            });
          }
        }
      }
    }
  }

  return findings;
}

console.log('[Doc Linter] Scanning tracked documentation and marketing texts...');
const issues = scanDirectory(ROOT_DIR);

if (issues.length > 0) {
  console.error(`\n❌ [Doc Linter Failed] Found ${issues.length} violation(s) against Global Documentation Policy:`);
  for (const issue of issues) {
    console.error(` - [${issue.rule}] in ${issue.file}:${issue.line}`);
    console.error(`   Sample: "${issue.sample}"`);
  }
  process.exit(1);
} else {
  console.log('✅ [Doc Linter Passed] All public documentation, marketing copy, and legal texts adhere to Global Documentation Policy.');
  process.exit(0);
}
