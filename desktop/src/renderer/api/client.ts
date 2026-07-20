/**
 * Typed API client for the DevMockView backend.
 *
 * All requests are authenticated with the bearer token from the Electron
 * auth layer. Handles 401 responses by triggering sign-out.
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

// Base URL for the deployed API. In dev, you can override via Vite env.
const API_BASE_URL =
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL || 'https://devmockview.com';

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const token = await window.electronAPI.getToken();
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
      // Token expired or invalid — trigger sign-out
      await window.electronAPI.signOut();
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
      await window.electronAPI.signOut();
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

  /**
   * Parse a job description and create an interview session.
   */
  async jdParse(data: JdParseRequest): Promise<JdParseResponse> {
    return this.request<JdParseResponse>('/api/jd/parse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Send a turn in the interview and receive SSE-streamed chunks.
   * Use `transcript: '__START__'` to initiate the session.
   * Use `transcript: '__ABANDON__'` to abandon.
   */
  async sessionTurn(
    data: SessionTurnRequest
  ): Promise<AsyncGenerator<TurnChunk, void, undefined>> {
    const response = await this.requestRaw('/api/session/turn', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return parseSSEStream<TurnChunk>(response);
  }

  /**
   * Convert text to speech. Returns raw audio bytes as an ArrayBuffer.
   */
  async sessionTts(data: TtsRequest): Promise<ArrayBuffer> {
    const response = await this.requestRaw('/api/session/tts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.arrayBuffer();
  }

  /**
   * Generate a feedback report for a completed session.
   */
  async sessionFeedback(data: FeedbackRequest): Promise<FeedbackReportResponse> {
    return this.request<FeedbackReportResponse>('/api/session/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get a scoped Deepgram token for WebSocket STT.
   */
  async deepgramToken(): Promise<DeepgramTokenResponse> {
    return this.request<DeepgramTokenResponse>('/api/deepgram/token', {
      method: 'POST',
    });
  }

  /**
   * Get the current user's billing/subscription status.
   */
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
