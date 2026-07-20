import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes a safe, minimal API from the main process to the renderer.
 * All communication goes through this bridge — no nodeIntegration in the renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Deep link (OAuth callback) listener
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url: string) => callback(url));
  },

  // Platform info
  platform: process.platform,
});
