/**
 * Typed API client for the DevMockView backend.
 *
 * Authenticated via Clerk — a token getter is injected at app startup so the
 * client can attach bearer tokens without depending on React hooks directly.
 */

import type {
  JdParseRequest,
  JdParseResponse,
  SessionTurnRequest,
  TurnChunk,
  TtsRequest,
  FeedbackRequest,
  FeedbackReportResponse,
  DeepgramTokenResponse,
  BillingStatusResponse,
  ApiError,
} from './types';
import { parseSSEStream } from './sse';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://devmockview.com';

// ---------------------------------------------------------------------------
// Token provider — set by the React layer (ClerkTokenProvider component)
// ---------------------------------------------------------------------------

type TokenGetter = () => Promise<string | null>;
type SignOutFn = () => Promise<void>;

let _getToken: TokenGetter = async () => null;
let _signOut: SignOutFn = async () => {};

/**
 * Called once from the React tree to wire up Clerk's auth to the API client.
 */
export function setAuthFunctions(getToken: TokenGetter, signOut: SignOutFn): void {
  _getToken = getToken;
  _signOut = signOut;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const token = await _getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getHeaders();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401) {
      await _signOut();
      throw new ApiUnauthorizedError('Session expired. Please sign in again.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`,
      }));
      throw new ApiRequestError(
        (errorBody as ApiError).error || `HTTP ${response.status}`,
        response.status,
        errorBody as ApiError
      );
    }

    return response.json() as Promise<T>;
  }

  private async requestRaw(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = await this.getHeaders();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    if (response.status === 401) {
      await _signOut();
      throw new ApiUnauthorizedError('Session expired. Please sign in again.');
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`,
      }));
      throw new ApiRequestError(
        (errorBody as ApiError).error || `HTTP ${response.status}`,
        response.status,
        errorBody as ApiError
      );
    }

    return response;
  }

  // -------------------------------------------------------------------------
  // API Methods
  // -------------------------------------------------------------------------

  async jdParse(data: JdParseRequest): Promise<JdParseResponse> {
    return this.request<JdParseResponse>('/api/jd/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sessionTurn(
    data: SessionTurnRequest
  ): Promise<AsyncGenerator<TurnChunk, void, undefined>> {
    const response = await this.requestRaw('/api/session/turn', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseSSEStream<TurnChunk>(response);
  }

  async sessionTts(data: TtsRequest): Promise<ArrayBuffer> {
    const response = await this.requestRaw('/api/session/tts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.arrayBuffer();
  }

  async sessionFeedback(data: FeedbackRequest): Promise<FeedbackReportResponse> {
    return this.request<FeedbackReportResponse>('/api/session/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deepgramToken(): Promise<DeepgramTokenResponse> {
    return this.request<DeepgramTokenResponse>('/api/deepgram/token', {
      method: 'POST',
    });
  }

  async billingStatus(): Promise<BillingStatusResponse> {
    return this.request<BillingStatusResponse>('/api/billing/status', {
      method: 'GET',
    });
  }
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class ApiUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnauthorizedError';
  }
}

export class ApiRequestError extends Error {
  status: number;
  body: ApiError;

  constructor(message: string, status: number, body: ApiError) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const api = new ApiClient();
