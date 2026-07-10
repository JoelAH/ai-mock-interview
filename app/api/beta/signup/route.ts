import { betaSignupRepository } from '@/lib/repositories';

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    await betaSignupRepository.upsertEmail(email.toLowerCase().trim());

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[beta/signup]', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
