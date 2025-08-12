// Simple A/B Testing Middleware for Vercel Edge Functions
// This version works with static HTML files without Next.js

export default function middleware(request) {
  // Only apply A/B testing to the homepage
  const url = new URL(request.url);
  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    return;
  }

  // Check for forced variant via query parameter (for testing)
  const forcedVariant = url.searchParams.get('variant');
  if (forcedVariant === 'A' || forcedVariant === 'B') {
    // Set cookie and redirect to the appropriate variant
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': url.pathname,
        'Set-Cookie': `ab_variant=${forcedVariant}; Max-Age=2592000; Path=/; SameSite=Strict`
      }
    });
    return response;
  }

  // Check if user already has a variant assigned
  const cookieString = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieString.split('; ').map(c => c.split('='))
  );
  let variant = cookies.ab_variant;

  // If no variant assigned, randomly assign one
  if (!variant || (variant !== 'A' && variant !== 'B')) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
  }

  // For Variant B, rewrite to the variant B HTML file
  if (variant === 'B') {
    const response = new Response(null, {
      status: 200,
      headers: {
        'Set-Cookie': `ab_variant=${variant}; Max-Age=2592000; Path=/; SameSite=Strict`,
        'X-AB-Variant': variant
      }
    });
    
    // Fetch and return the variant B HTML
    return fetch(new URL('/index-variant-b.html', request.url), {
      headers: response.headers
    });
  }

  // For Variant A, just set the cookie and continue
  return new Response(null, {
    headers: {
      'Set-Cookie': `ab_variant=A; Max-Age=2592000; Path=/; SameSite=Strict`,
      'X-AB-Variant': 'A'
    }
  });
}

export const config = {
  matcher: '/'
};
