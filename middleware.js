import { NextResponse } from 'next/server';

// Define your A/B test variants
const VARIANTS = {
  A: {
    name: 'Variant A',
    headline: 'When you change the <span class="warning">SYSTEM,</span> you change the <span class="warning">GAME</span>',
    subheadline: 'The U.S. system opens up opportunities, not limits.',
    videoId: '7GRj2oGiZzQ', // Your current video
    ctaText: 'Apply For A Call!'
  },
  B: {
    name: 'Variant B', 
    headline: 'Unlock <span class="warning">UNLIMITED</span> U.S. Capital Without <span class="warning">BOUNDARIES</span>',
    subheadline: 'Build wealth beyond UK restrictions - Access the American advantage.',
    videoId: '7GRj2oGiZzQ', // You can change this to a different video ID
    ctaText: 'Get Started Now!'
  }
};

// Cookie name for storing the variant
const VARIANT_COOKIE = 'ab_variant';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export default function middleware(request) {
  // Get the response
  const response = NextResponse.next();

  // Only apply A/B testing to the homepage
  const url = new URL(request.url);
  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    // Add security headers for non-homepage requests
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    return response;
  }

  // Check if user already has a variant assigned
  let variant = request.cookies.get(VARIANT_COOKIE)?.value;
  
  // Check if forced variant is requested via query parameter (for testing)
  const forcedVariant = url.searchParams.get('variant');
  if (forcedVariant && (forcedVariant === 'A' || forcedVariant === 'B')) {
    variant = forcedVariant;
  }

  // If no variant assigned, randomly assign one
  if (!variant || !VARIANTS[variant]) {
    // 50/50 split - adjust the probability as needed
    variant = Math.random() < 0.5 ? 'A' : 'B';
  }

  // Set the variant cookie
  response.cookies.set(VARIANT_COOKIE, variant, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
  });

  // Add variant data to headers (will be read by Edge Function)
  response.headers.set('X-AB-Variant', variant);
  
  // Set security headers
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Rewrite to variant-specific HTML
  if (variant === 'B') {
    return NextResponse.rewrite(new URL('/index-variant-b.html', request.url), {
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};