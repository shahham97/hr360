// @ts-check
const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.resolve(__dirname, '../dist');
const FORBIDDEN_PATTERNS = [
  { name: 'TiDB vendor / cloud references', pattern: /\btidb(?:cloud)?\b/i },
  { name: 'Prisma client/ORM references', pattern: /@prisma\b|\bprisma\b/i },
  { name: 'MySQL direct driver', pattern: /\bmysql2?\b/i },
  { name: 'Localhost development URLs', pattern: /\b(?:localhost|127\.0\.0\.1)\b/i },
  { name: 'Tenant DB naming convention', pattern: /\btenant_[a-z0-9_]+\b/i },
  { name: 'Environment files (.env)', pattern: /\.env(?:\.local|\.production)?\b/i },
  { name: 'Seeded default admin credential', pattern: /admin@hr360\.local|Admin2026!Staff/i },
  { name: 'Source map URLs', pattern: /sourceMappingURL=/i },
  { name: 'Absolute local developer paths', pattern: /(?:[a-zA-Z]:\\(?:users|hr360)|\/home\/[a-z0-9_]+)/i }
];

function scanDirectory(dir) {
  let findings = [];
  if (!fs.existsSync(dir)) {
    console.warn(`Target directory does not exist: ${dir}`);
    return findings;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findings = findings.concat(scanDirectory(fullPath));
    } else if (entry.isFile() && /\.(js|html|css|json)$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        for (const { name, pattern } of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            findings.push({
              rule: name,
              file: fullPath,
              line: lineIndex + 1,
              sample: line.substring(0, 120).trim()
            });
          }
        }
      }
    }
  }
  return findings;
}

console.log(`[Release Lint] Scanning bundle directory: ${TARGET_DIR}`);
const issues = scanDirectory(TARGET_DIR);

if (issues.length > 0) {
  console.error(`\n❌ [Release Lint Failed] Found ${issues.length} forbidden string(s):`);
  for (const issue of issues) {
    console.error(` - [${issue.rule}] in ${issue.file}:${issue.line}`);
    console.error(`   Sample: "${issue.sample}"`);
  }
  process.exit(1);
} else {
  console.log(`\n✅ [Release Lint Passed] 0 forbidden strings or sensitive architectural leaks found in ${TARGET_DIR}`);
  process.exit(0);
}
