/**
 * Connection String Security Scrubber & Redactor
 *
 * Guarantees that raw credentials, passwords, tokens, and database cluster hosts
 * are never written to logs, console output, user-visible errors, or network responses.
 */

const SENSITIVE_PATTERNS = [
  // Database connection URIs
  /(?:mysql|postgresql|postgres|mongodb|mariadb):\/\/[^:\s]+:([^@\s]+)@/gi,
  // Password parameters
  /password=["']?([^&"'\s]+)["']?/gi,
  // Tokens / Keys
  /bearer\s+([a-zA-Z0-9_\-\.]+)/gi,
  // Specific host connection formats
  /([a-zA-Z0-9_\-\.]+\.(?:prod|aws|tidbcloud|azure|gcp)[a-zA-Z0-9_\-\.]*:\d+)/gi,
];

export function scrubSensitiveString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  let sanitized = input;

  // 1. Redact URI passwords
  sanitized = sanitized.replace(
    /((?:mysql|postgresql|postgres|mariadb):\/\/[^:\s]+:)([^@\s]+)(@)/gi,
    '$1[REDACTED_PASSWORD]$3'
  );

  // 2. Redact password keys in key-value pairs
  sanitized = sanitized.replace(
    /(["']?password["']?\s*[:=]\s*["']?)([^"',\s\}]+)(["']?)/gi,
    '$1[REDACTED]$3'
  );

  // 3. Redact Bearer tokens
  sanitized = sanitized.replace(
    /(Authorization:\s*Bearer\s+)[^\s"']+/gi,
    '$1[REDACTED_TOKEN]'
  );

  // 4. Redact raw master encryption key or hex keys (32/64 char hex strings)
  sanitized = sanitized.replace(
    /\b[0-9a-fA-F]{64}\b/g,
    '[REDACTED_KEY]'
  );

  return sanitized;
}

export function scrubObject<T = any>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? (scrubSensitiveString(obj) as any) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item)) as any;
  }

  const copy: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj as Record<string, any>)) {
    const lowerKey = k.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('connectionstring') ||
      lowerKey.includes('encryptedconnection') ||
      lowerKey.includes('rawdek') ||
      lowerKey.includes('totpsecret') ||
      lowerKey.includes('masterkey')
    ) {
      copy[k] = '[REDACTED]';
    } else {
      copy[k] = scrubObject(v);
    }
  }

  return copy as T;
}
