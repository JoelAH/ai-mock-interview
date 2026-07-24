import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication.
const isPublicRoute = createRouteMatcher([
  '/', // Landing page
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)', // Clerk & Lemon Squeezy webhooks
  '/about',
  '/blog(.*)',
  '/privacy',
  '/terms',
  '/mic-check',
]);

// Origins allowed to make cross-origin API requests (desktop app in dev)
const ALLOWED_ORIGINS = ['http://localhost:5174'];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export const proxy = clerkMiddleware(async (auth, request: NextRequest) => {
  const origin = request.headers.get('origin');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // Handle CORS preflight (OPTIONS) — respond immediately before auth
  if (request.method === 'OPTIONS' && isApiRoute && isAllowedOrigin(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin!),
    });
  }

  // Protect non-public routes with Clerk
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Add CORS headers to API responses for allowed origins
  if (isApiRoute && isAllowedOrigin(origin)) {
    const response = NextResponse.next();
    Object.entries(corsHeaders(origin!)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
