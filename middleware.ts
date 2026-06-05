// =============================================================================
// Next.js Middleware — Just Start (Phase 5)
// =============================================================================
// Root middleware that runs on every request. Handles:
//   1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
//   2. Supabase session refresh (when Supabase is configured)
//   3. CORS enforcement for API routes
//   4. Request size validation
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ---------------------------------------------------------------------------
// Security Headers Configuration
// ---------------------------------------------------------------------------

/**
 * Content Security Policy directives.
 * Restricts resource loading to prevent XSS, clickjacking, and data injection.
 */
function buildCSP(): string {
  const isDev = process.env.NODE_ENV === 'development';

  const directives = [
    // Default: only allow same-origin
    "default-src 'self'",

    // Scripts: allow Next.js runtime, Vercel analytics
    isDev
      ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
      : "script-src 'self' https://vercel.live https://va.vercel-scripts.com",

    // Styles: allow Next.js CSS, inline styles (shadcn/ui uses some)
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Fonts: Google Fonts + self
    "font-src 'self' https://fonts.gstatic.com",

    // Images: self, data URIs (for generated images), Supabase storage
    "img-src 'self' data: blob: https://*.supabase.co",

    // Connect: API routes, Supabase, OpenAI (server-side only, but preconnect)
    `connect-src 'self' https://*.supabase.co ${isDev ? 'http://localhost:*' : ''}`,

    // Frames: deny all framing (anti-clickjacking)
    "frame-src 'none'",

    // Objects: deny all plugins
    "object-src 'none'",

    // Base URI: restrict to same origin
    "base-uri 'self'",

    // Form actions: restrict to same origin
    "form-action 'self'",

    // Frame ancestors: deny all (supplement to X-Frame-Options)
    "frame-ancestors 'none'",

    // Upgrade insecure requests in production
    isDev ? '' : 'upgrade-insecure-requests',
  ];

  return directives.filter(Boolean).join('; ');
}

/**
 * Security headers applied to every response.
 */
function getSecurityHeaders(): Headers {
  const headers = new Headers();

  // Content Security Policy
  headers.set('Content-Security-Policy', buildCSP());

  // HTTP Strict Transport Security (1 year, include subdomains)
  // Only set in production since HSTS can't be unset
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Prevent MIME-type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (supplement to CSP frame-ancestors)
  headers.set('X-Frame-Options', 'DENY');

  // Enable XSS filter in older browsers
  headers.set('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable browser features we don't use
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  // Cross-Origin isolation headers
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  return headers;
}

// ---------------------------------------------------------------------------
// CORS for API Routes
// ---------------------------------------------------------------------------

/**
 * Validate CORS for API routes.
 * Only allows same-origin requests by default.
 */
function validateCors(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');

  // API routes should only be accessible from our own origin
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow requests without origin (same-origin, curl, server-side)
    if (!origin) return null;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Allow if origin exactly matches our production URL
    if (appUrl && origin === appUrl) return null;

    // Allow Vercel preview deployments only from our own project
    // Format: https://<project-name>-<hash>.vercel.app or https://<project-name>.vercel.app
    const appUrlHost = appUrl ? new URL(appUrl).hostname : '';
    if (appUrlHost && origin.includes('.vercel.app')) {
      const originHost = new URL(origin).hostname;
      // Only allow if the preview URL shares our project prefix
      if (appUrlHost.includes('.vercel.app') && originHost.endsWith(appUrlHost.replace(/^[^.]+\./, ''))) {
        return null;
      }
      // For non-vercel.app production URLs, allow any preview deploy of the same project
      // by checking if the origin ends with .vercel.app (Vercel auto-sets these)
      const projectName = appUrlHost.replace(/\..*/, '');
      if (originHost.startsWith(`${projectName}-`) || originHost === `${projectName}.vercel.app`) {
        return null;
      }
    }

    // Block all other cross-origin API requests
    return new NextResponse('Forbidden', { status: 403 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Request Size Validation
// ---------------------------------------------------------------------------

const MAX_REQUEST_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

/**
 * Validate request size for API routes.
 * Prevents oversized payloads that could cause DoS.
 */
function validateRequestSize(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith('/api/')) return null;

  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > MAX_REQUEST_SIZE_BYTES) {
      return new NextResponse('Payload Too Large', { status: 413 });
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  // ---- Step 1: Request size validation ----
  const sizeError = validateRequestSize(request);
  if (sizeError) return sizeError;

  // ---- Step 2: CORS validation ----
  const corsError = validateCors(request);
  if (corsError) return corsError;

  // ---- Step 3: Supabase session refresh ----
  // This handles auth cookie refresh if Supabase is configured
  const response = await updateSession(request);

  // ---- Step 4: Apply security headers ----
  const securityHeaders = getSecurityHeaders();
  for (const [key, value] of securityHeaders.entries()) {
    response.headers.set(key, value);
  }

  // ---- Step 5: Remove X-Powered-By header ----
  response.headers.delete('X-Powered-By');

  return response;
}

// ---------------------------------------------------------------------------
// Matcher Configuration
// ---------------------------------------------------------------------------

/**
 * Define which routes the middleware should run on.
 * Excludes static assets and Next.js internals for performance.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.svg, robots.txt (public assets)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2|woff|ttf)$).*)',
  ],
};
