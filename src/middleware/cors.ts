/**
 * CORS middleware for Cloudflare Workers
 * Handles cross-origin requests with proper security headers
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export function corsHandler(request: Request, response?: Response): Response {
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Add CORS headers to existing response
  if (response) {
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    return newResponse;
  }
  
  // Return basic CORS response
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  });
}