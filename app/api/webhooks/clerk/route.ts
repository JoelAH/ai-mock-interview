import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { userRepository } from '@/lib/repositories';

/**
 * Clerk webhook handler — keeps the local `users` collection in sync.
 *
 * Clerk sends user.created / user.updated / user.deleted events here.
 * The Svix signature is verified before processing any event.
 * This route is public (see proxy.ts matcher for /api/webhooks).
 */

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserEventData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserEventData;
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Collect Svix headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing Svix headers', { status: 400 });
  }

  // Read and verify the payload
  const body = await request.text();

  const wh = new Webhook(secret);
  let event: ClerkWebhookEvent;

  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  // Route by event type
  const { type, data } = event;
  switch (type) {
    case 'user.created':
    case 'user.updated': {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id,
      );
      await userRepository.upsertByClerkId(data.id, {
        email: primaryEmail?.email_address ?? '',
      });
      break;
    }
    case 'user.deleted': {
      await userRepository.deleteByClerkId(data.id);
      break;
    }
    default:
      // Ignore unhandled event types
      break;
  }

  return new Response('OK', { status: 200 });
}
