import { contextBridge, ipcRenderer } from 'electron';

/**
 * Exposes a safe, minimal API from the main process to the renderer.
 * All communication goes through this bridge — no nodeIntegration in the renderer.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // --- Auth ---
  signIn: () => ipcRenderer.invoke('auth:sign-in'),
  signOut: () => ipcRenderer.invoke('auth:sign-out'),
  getToken: () => ipcRenderer.invoke('auth:get-token'),
  getAuthState: () => ipcRenderer.invoke('auth:get-state'),
  onAuthStateChanged: (callback: (state: { isAuthenticated: boolean; userId: string | null }) => void) => {
    ipcRenderer.on('auth-state-changed', (_event, state) => callback(state));
  },

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

  // --- Deep link (OAuth callback) ---
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url: string) => callback(url));
  },

  // --- Platform ---
  platform: process.platform,
});
