import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Webhook } from 'svix';
import { userRepository } from '@/lib/repositories/userRepository';
import { authService } from '@/lib/services/authService';

// Must be top-level for Vitest hoisting
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Helper: generate a signed Clerk webhook payload
// ---------------------------------------------------------------------------
const TEST_WEBHOOK_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';

function createSignedPayload(eventType: string, data: Record<string, unknown>) {
  const body = JSON.stringify({ type: eventType, data });
  const wh = new Webhook(TEST_WEBHOOK_SECRET);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const msgId = 'msg_test_' + Date.now();

  // Use Svix's sign method to get a valid signature
  const signature = wh.sign(msgId, new Date(Number(timestamp) * 1000), body);

  return {
    body,
    headers: {
      'svix-id': msgId,
      'svix-timestamp': timestamp,
      'svix-signature': signature,
    },
  };
}

// ---------------------------------------------------------------------------
// Webhook handler tests
// ---------------------------------------------------------------------------
describe('Clerk webhook route handler', () => {
  // We test the handler logic by importing it directly
  // Need to mock next/headers since it's a server-only API
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    process.env.CLERK_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    const mod = await import('@/app/api/webhooks/clerk/route');
    POST = mod.POST;
  });

  it('rejects requests with missing Svix headers', async () => {
    const { headers: headersModule } = await import('next/headers');
    (headersModule as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Map([
        ['svix-id', null],
        ['svix-timestamp', null],
        ['svix-signature', null],
      ]),
    );

    // Simulate a map that returns null for get()
    (headersModule as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: () => null,
    });

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: '{}',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Missing Svix headers');
  });

  it('rejects requests with invalid/tampered signature', async () => {
    const { headers: headersModule } = await import('next/headers');
    (headersModule as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) => {
        const map: Record<string, string> = {
          'svix-id': 'msg_fake',
          'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
          'svix-signature': 'v1,invalidSignature123==',
        };
        return map[name] ?? null;
      },
    });

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify({ type: 'user.created', data: { id: 'user_123' } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Invalid signature');
  });

  it('handles user.created and upserts a user doc', async () => {
    const payload = createSignedPayload('user.created', {
      id: 'user_clerk_new',
      email_addresses: [
        { id: 'email_1', email_address: 'alice@example.com' },
      ],
      primary_email_address_id: 'email_1',
    });

    const { headers: headersModule } = await import('next/headers');
    (headersModule as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) => payload.headers[name as keyof typeof payload.headers] ?? null,
    });

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: payload.body,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify user was persisted
    const user = await userRepository.findByClerkId('user_clerk_new');
    expect(user).not.toBeNull();
    expect(user!.email).toBe('alice@example.com');
  });

  it('handles user.updated and updates the user doc', async () => {
    // Pre-create user
    await userRepository.upsertByClerkId('user_clerk_upd', { email: 'old@example.com' });

    const payload = createSignedPayload('user.updated', {
      id: 'user_clerk_upd',
      email_addresses: [
        { id: 'email_2', email_address: 'new@example.com' },
      ],
      primary_email_address_id: 'email_2',
    });

    const { headers: headersModule } = await import('next/headers');
    (headersModule as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) => payload.headers[name as keyof typeof payload.headers] ?? null,
    });

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: payload.body,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const user = await userRepository.findByClerkId('user_clerk_upd');
    expect(user!.email).toBe('new@example.com');
  });

  it('handles user.deleted and removes the user doc', async () => {
    // Pre-create user
    await userRepository.upsertByClerkId('user_clerk_del', { email: 'del@example.com' });

    const payload = createSignedPayload('user.deleted', {
      id: 'user_clerk_del',
      email_addresses: [],
      primary_email_address_id: '',
    });

    const { headers: headersModule } = await import('next/headers');
    (headersModule as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (name: string) => payload.headers[name as keyof typeof payload.headers] ?? null,
    });

    const request = new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: payload.body,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const user = await userRepository.findByClerkId('user_clerk_del');
    expect(user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// authService tests
// ---------------------------------------------------------------------------
describe('authService.resolveUser', () => {
  it('returns null for empty string', async () => {
    const result = await authService.resolveUser('');
    expect(result).toBeNull();
  });

  it('returns null for a non-existent user', async () => {
    const result = await authService.resolveUser('nonexistent_clerk_id');
    expect(result).toBeNull();
  });

  it('returns the user doc for an existing user', async () => {
    await userRepository.upsertByClerkId('clerk_resolve', { email: 'resolve@test.com' });
    const result = await authService.resolveUser('clerk_resolve');
    expect(result).not.toBeNull();
    expect(result!.clerkUserId).toBe('clerk_resolve');
    expect(result!.email).toBe('resolve@test.com');
  });
});
