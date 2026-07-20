/// <reference types="vite/client" />

interface ElectronAPI {
  onDeepLink: (callback: (url: string) => void) => void;
  platform: NodeJS.Platform;
}

interface Window {
  electronAPI: ElectronAPI;
}
