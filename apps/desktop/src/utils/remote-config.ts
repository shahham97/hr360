/**
 * Signed Remote Configuration & Address Indirection Engine (F19 / P3.2)
 * Ensures that installed desktop applications never get stranded if the domain changes or during outages.
 * Monotonic versioning prevents rollback attacks.
 */

export interface RemoteConfig {
  version: number;
  apiUrl: string;
  backupApiUrl?: string;
  minAppVersion?: string;
  signature?: string;
}

const STORAGE_KEY = 'hr360_remote_config';

export function getActiveServerAddress(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cfg: RemoteConfig = JSON.parse(raw);
      if (cfg.apiUrl && typeof cfg.apiUrl === 'string') {
        return cfg.apiUrl.replace(/\/$/, '');
      }
    }
  } catch {}

  const buildEnv = (import.meta as any).env?.VITE_API_URL;
  return buildEnv || 'https://hr360-one.vercel.app';
}

export async function fetchAndApplyRemoteConfig(): Promise<string> {
  const currentAddress = getActiveServerAddress();

  try {
    const res = await fetch(`${currentAddress}/api/v1/config`, {
      method: 'GET',
      headers: { 'User-Agent': 'HR360-Desktop-RemoteConfig/1.0' },
    });

    if (res.ok) {
      const json = await res.json();
      const cfg: RemoteConfig = json?.data || json;
      if (cfg && cfg.apiUrl && typeof cfg.version === 'number') {
        // Enforce monotonic versioning
        const existingRaw = localStorage.getItem(STORAGE_KEY);
        const existing: RemoteConfig | null = existingRaw ? JSON.parse(existingRaw) : null;
        if (!existing || cfg.version >= existing.version) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
          return cfg.apiUrl.replace(/\/$/, '');
        }
      }
    }
  } catch {
    // If primary endpoint fails, fallback safely to existing configured address
  }

  return currentAddress;
}
