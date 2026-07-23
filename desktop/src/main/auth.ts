/**
 * Auth module for the Electron main process.
 *
 * With the move to @clerk/clerk-react in the renderer, authentication is now
 * handled entirely client-side. This module retains only the minimal pieces
 * needed by the main process:
 *
 * - Custom URL scheme registration (for potential future OAuth callbacks)
 * - A reference to mainWindow for IPC if needed
 */

import { BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * No-op initialize — auth is handled in the renderer by Clerk.
 */
export async function initialize(): Promise<void> {
  // Nothing to do — Clerk React SDK manages sessions in the renderer.
}

/**
 * Returns null — token management is handled by Clerk in the renderer.
 */
export function getUserId(): string | null {
  return null;
}
