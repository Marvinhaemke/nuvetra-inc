// Simple A/B Testing Middleware for Vercel Edge Functions
// This version works with static HTML files without Next.js

export default async function middleware(request) {
  const url = new URL(request.url);
  
  // Only apply A/B testing to the homepage
  if (url.pathname !== '/' && url.pathname !== '/index.html') {
    return;
  }

  // Parse cookies from the request
  const cookieString = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieString.split('; ').map(c => {
      const [key, ...val] = c.split('=');
      return [key, val.join('=')];
    }).filter(([key]) => key)
  );

  // Check for forced variant via query parameter (for testing)
  const forcedVariant = url.searchParams.get('variant');
  let variant = cookies.ab_variant;

  if (forcedVariant === 'A' || forcedVariant === 'B') {
    variant = forcedVariant;
    // Remove variant parameter from URL for cleaner URLs
    url.searchParams.delete('variant');
  } else if (!variant || (variant !== 'A' && variant !== 'B')) {
    // If no variant assigned, randomly assign one
    variant = Math.random() < 0.5 ? 'A' : 'B';
  }

  // Build the response headers
  const responseHeaders = new Headers();
  responseHeaders.set('Set-Cookie', `ab_variant=${variant}; Max-Age=2592000; Path=/; SameSite=Strict`);
  responseHeaders.set('X-AB-Variant', variant);
  
  // Add security headers
  responseHeaders.set('Referrer-Policy', 'origin-when-cross-origin');
  responseHeaders.set('X-Frame-Options', 'DENY');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('X-DNS-Prefetch-Control', 'on');
  responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // For Variant B, fetch and return the variant B HTML file
  if (variant === 'B') {
    const variantBUrl = new URL('/index-variant-b.html', request.url);
    const response = await fetch(variantBUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch variant B file:', response.status);
      // Fall back to regular index.html if variant B file doesn't exist
      return;
    }
    
    const html = await response.text();
    
    return new Response(html, {
      status: 200,
      headers: responseHeaders
    });
  }

  // For Variant A, continue with the normal request but add the cookie
  // We need to fetch the regular index.html and return it with our headers
  const indexUrl = new URL('/index.html', request.url);
  const response = await fetch(indexUrl);
  
  if (!response.ok) {
    // If index.html doesn't exist, just return undefined to let Vercel handle it normally
    return;
  }
  
  const html = await response.text();
  
  return new Response(html, {
    status: 200,
    headers: responseHeaders
  });
}

export const config = {
  matcher: '/'
};
