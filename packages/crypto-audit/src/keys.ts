/**
 * HR360 Cryptographic Keys for Entitlements & Licensing
 */

// Public key embedded safely into desktop clients for Ed25519 offline verification
export const HR360_ENTITLEMENT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAXL3STisGcMCoFdDQwRwfFNA276e1JAiiad69PER+s98=
-----END PUBLIC KEY-----`;

// Private key used exclusively on the server (Next.js API) to sign entitlements
export const HR360_ENTITLEMENT_PRIVATE_KEY = process.env.HR360_ENTITLEMENT_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIANM2ZbLqgbkR7uohpgxj+JqXU4EOVj9+IiQlOqcSk60
-----END PRIVATE KEY-----`;
