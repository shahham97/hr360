/// <reference types="vite/client" />

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

interface Window {
  hr360Desktop?: {
    platform: string;
    version: string;
    isDesktop: boolean;
    getDeviceId: () => Promise<string>;
    storeSecure: (key: string, value: string) => Promise<boolean>;
    getSecure: (key: string) => Promise<string | null>;
    removeSecure: (key: string) => Promise<boolean>;
    openNetworkSettings: () => Promise<boolean>;
    checkUpdate: (apiUrl?: string) => Promise<{
      updateAvailable: boolean;
      currentVersion?: string;
      latestVersion?: string;
      downloadUrl?: string;
      notes?: string;
      isMandatory?: boolean;
      requiresImmediateUpdate?: boolean;
    }>;
    openDownload: (downloadUrl: string) => Promise<boolean>;
    startDownload: (downloadUrl: string) => Promise<{ success: boolean; fallback?: boolean }>;
    quitAndInstall: (options?: { forceRestart?: boolean }) => Promise<boolean>;
  };
}
