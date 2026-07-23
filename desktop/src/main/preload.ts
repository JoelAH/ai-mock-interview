import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes a safe, minimal API from the main process to the renderer.
 * All communication goes through this bridge — no nodeIntegration in the renderer.
 *
 * Auth is handled entirely by @clerk/clerk-react in the renderer — no IPC needed.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // --- In-App Purchase ---
  iapCanMakePayments: () => ipcRenderer.invoke('iap:can-make-payments'),
  iapGetOfferings: () => ipcRenderer.invoke('iap:get-offerings'),
  iapPurchase: (productId: string) => ipcRenderer.invoke('iap:purchase', productId),
  iapRestore: () => ipcRenderer.invoke('iap:restore'),
  iapGetSubscription: () => ipcRenderer.invoke('iap:get-subscription'),
  onIapPurchaseComplete: (callback: (data: { productId: string; success: boolean }) => void) => {
    ipcRenderer.on('iap-purchase-complete', (_event, data) => callback(data));
  },
  onIapRestoreComplete: (callback: () => void) => {
    ipcRenderer.on('iap-restore-complete', () => callback());
  },

  // --- Navigation (from native menu shortcuts) ---
  onNavigate: (callback: (route: string) => void) => {
    ipcRenderer.on('navigate', (_event, route: string) => callback(route));
  },

  // --- Deep link ---
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url: string) => callback(url));
  },

  // --- Platform ---
  platform: process.platform,
});
