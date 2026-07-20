import { BrowserWindow, safeStorage, shell } from 'electron';
import crypto from 'crypto';
import Store from 'electron-store';

/**
 * Auth manager for the Electron main process.
 *
 * Implements Clerk's OAuth PKCE flow:
 * 1. Opens system browser to Clerk sign-in page
 * 2. Clerk redirects to devmockview://auth/callback with a rotating_token
 * 3. We exchange the rotating_token for a session JWT via Clerk Frontend API
 * 4. JWT is stored encrypted in macOS Keychain (via safeStorage)
 * 5. Auto-refresh before expiry using Clerk's touch endpoint
 */

// --- Configuration ---
// These come from the app's Clerk instance. In production, load from a config file.
const CLERK_FRONTEND_API = 'https://sincere-mink-36.clerk.accounts.dev';
const CLERK_PUBLISHABLE_KEY = 'pk_test_c2luY2VyZS1taW5rLTM2LmNsZXJrLmFjY291bnRzLmRldiQ';
const REDIRECT_URI = 'devmockview://auth/callback';

interface AuthTokens {
  sessionToken: string;
  sessionId: string;
  userId: string;
  expiresAt: number; // Unix timestamp in ms
}

interface JwtPayload {
  sub?: string;
  sid?: string;
  exp?: number;
  [key: string]: unknown;
}

interface StoredAuth {
  encryptedTokens: string; // base64 of safeStorage encrypted buffer
}

const store = new Store<{ auth?: StoredAuth }>({
  name: 'auth',
});

let currentTokens: AuthTokens | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let mainWindow: BrowserWindow | null = null;
let pkceVerifier: string | null = null;

// --- Public API ---

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

export function isAuthenticated(): boolean {
  return currentTokens !== null && currentTokens.expiresAt > Date.now();
}

export function getToken(): string | null {
  if (!currentTokens) return null;
  if (currentTokens.expiresAt <= Date.now()) {
    // Token expired — trigger refresh in background
    refreshSession().catch(() => clearAuth());
    return null;
  }
  return currentTokens.sessionToken;
}

export function getUserId(): string | null {
  return currentTokens?.userId ?? null;
}

export async function signIn(): Promise<void> {
  // Generate PKCE code verifier + challenge
  pkceVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(pkceVerifier);

  // Build the Clerk sign-in URL
  const signInUrl = new URL(`${CLERK_FRONTEND_API}/oauth/authorize`);
  signInUrl.searchParams.set('response_type', 'code');
  signInUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  signInUrl.searchParams.set('code_challenge', codeChallenge);
  signInUrl.searchParams.set('code_challenge_method', 'S256');
  signInUrl.searchParams.set('scope', 'profile email');

  // Open in system browser
  await shell.openExternal(signInUrl.toString());
}

export async function handleCallback(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);

    // Handle ticket-based flow (Clerk redirect with __clerk_ticket or rotating_token)
    const code = parsed.searchParams.get('code');
    const ticket = parsed.searchParams.get('__clerk_ticket');
    const rotatingToken = parsed.searchParams.get('rotating_token');

    if (code && pkceVerifier) {
      // Standard OAuth code exchange
      return await exchangeCode(code, pkceVerifier);
    } else if (ticket || rotatingToken) {
      // Clerk-specific token-based callback
      const token = ticket || rotatingToken;
      return await exchangeTicket(token!);
    }

    // Fallback: try to get session token from hash fragment or query
    const sessionToken = parsed.searchParams.get('session_token');
    if (sessionToken) {
      await verifyAndStoreToken(sessionToken);
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Auth] Callback handling failed:', err);
    return false;
  } finally {
    pkceVerifier = null;
  }
}

export async function signOut(): Promise<void> {
  clearAuth();
  notifyRenderer();
}

export async function initialize(): Promise<void> {
  // Try to restore tokens from encrypted storage
  const stored = store.get('auth');
  if (!stored?.encryptedTokens) return;

  try {
    if (!safeStorage.isEncryptionAvailable()) return;

    const decrypted = safeStorage.decryptString(
      Buffer.from(stored.encryptedTokens, 'base64')
    );
    const tokens: AuthTokens = JSON.parse(decrypted);

    if (tokens.expiresAt > Date.now()) {
      currentTokens = tokens;
      scheduleRefresh();
    } else {
      // Try to refresh the expired session
      currentTokens = tokens;
      const refreshed = await refreshSession();
      if (!refreshed) {
        clearAuth();
      }
    }
  } catch {
    // Corrupted storage — clear it
    store.delete('auth');
  }
}

// --- Private helpers ---

async function exchangeCode(code: string, verifier: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLERK_FRONTEND_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      console.error('[Auth] Code exchange failed:', response.status);
      return false;
    }

    const data = await response.json() as Record<string, unknown>;
    await verifyAndStoreToken(
      (data.access_token as string) || (data.jwt as string),
      data
    );
    return true;
  } catch (err) {
    console.error('[Auth] Code exchange error:', err);
    return false;
  }
}

async function exchangeTicket(ticket: string): Promise<boolean> {
  try {
    // Use Clerk's sign-in with ticket endpoint
    const response = await fetch(`${CLERK_FRONTEND_API}/v1/client/sign_ins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CLERK_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        strategy: 'ticket',
        ticket,
      }),
    });

    if (!response.ok) {
      console.error('[Auth] Ticket exchange failed:', response.status);
      return false;
    }

    const data = await response.json() as Record<string, unknown>;
    const clientData = data.client || (data.response as Record<string, unknown>)?.client;
    const client = clientData as Record<string, unknown> | undefined;

    if (client?.sessions) {
      const sessions = client.sessions as Array<Record<string, unknown>>;
      const session = sessions[0];
      if (session) {
        const lastToken = session.last_active_token as Record<string, unknown> | undefined;
        const user = session.user as Record<string, unknown> | undefined;
        const tokens: AuthTokens = {
          sessionToken: (lastToken?.jwt as string) || '',
          sessionId: (session.id as string) || '',
          userId: (user?.id as string) || '',
          expiresAt: Date.now() + 55 * 60 * 1000, // 55 minutes (Clerk tokens last 60m)
        };

        if (tokens.sessionToken) {
          currentTokens = tokens;
          persistTokens();
          scheduleRefresh();
          notifyRenderer();
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error('[Auth] Ticket exchange error:', err);
    return false;
  }
}

async function verifyAndStoreToken(jwt: string, extra?: Record<string, unknown>): Promise<void> {
  // Decode JWT payload to extract user info and expiry
  const payload = decodeJwtPayload(jwt);

  const tokens: AuthTokens = {
    sessionToken: jwt,
    sessionId: (extra?.session_id as string) || payload.sid || '',
    userId: payload.sub || '',
    expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 55 * 60 * 1000,
  };

  currentTokens = tokens;
  persistTokens();
  scheduleRefresh();
  notifyRenderer();
}

async function refreshSession(): Promise<boolean> {
  if (!currentTokens?.sessionId) return false;

  try {
    const response = await fetch(
      `${CLERK_FRONTEND_API}/v1/client/sessions/${currentTokens.sessionId}/tokens`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CLERK_PUBLISHABLE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error('[Auth] Token refresh failed:', response.status);
      return false;
    }

    const data = await response.json() as Record<string, unknown>;
    const jwt = data.jwt as string | undefined;

    if (jwt) {
      const payload = decodeJwtPayload(jwt);
      currentTokens = {
        ...currentTokens,
        sessionToken: jwt,
        expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 55 * 60 * 1000,
      };
      persistTokens();
      scheduleRefresh();
      notifyRenderer();
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Auth] Token refresh error:', err);
    return false;
  }
}

function scheduleRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (!currentTokens) return;

  // Refresh 5 minutes before expiry
  const refreshIn = Math.max(currentTokens.expiresAt - Date.now() - 5 * 60 * 1000, 30_000);

  refreshTimer = setTimeout(async () => {
    const success = await refreshSession();
    if (!success) {
      clearAuth();
      notifyRenderer();
    }
  }, refreshIn);
}

function persistTokens(): void {
  if (!currentTokens) return;

  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // Fallback: store unencrypted (dev mode on non-macOS)
      store.set('auth', {
        encryptedTokens: Buffer.from(JSON.stringify(currentTokens)).toString('base64'),
      });
      return;
    }

    const encrypted = safeStorage.encryptString(JSON.stringify(currentTokens));
    store.set('auth', { encryptedTokens: encrypted.toString('base64') });
  } catch (err) {
    console.error('[Auth] Failed to persist tokens:', err);
  }
}

function clearAuth(): void {
  currentTokens = null;
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  store.delete('auth');
}

function notifyRenderer(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth-state-changed', {
      isAuthenticated: isAuthenticated(),
      userId: getUserId(),
    });
  }
}

function decodeJwtPayload(jwt: string): JwtPayload {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return {};
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return {};
  }
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash.toString('base64url');
}
