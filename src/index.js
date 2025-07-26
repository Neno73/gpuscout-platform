import { 
  handleRegistration, 
  handleEmailVerification, 
  handleLogin, 
  handleRefresh, 
  handleForgotPassword, 
  handleResetPassword 
} from './api/auth.js';

/**
 * Main Cloudflare Worker entry point
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      // Authentication routes
      if (pathname.startsWith('/api/auth/')) {
        let response;
        
        switch (pathname) {
          case '/api/auth/register':
            if (request.method === 'POST') {
              response = await handleRegistration(request, env);
            } else {
              response = new Response('Method not allowed', { status: 405 });
            }
            break;

          case '/api/auth/verify-email':
            if (request.method === 'POST') {
              response = await handleEmailVerification(request, env);
            } else {
              response = new Response('Method not allowed', { status: 405 });
            }
            break;

          case '/api/auth/login':
            if (request.method === 'POST') {
              response = await handleLogin(request, env);
            } else {
              response = new Response('Method not allowed', { status: 405 });
            }
            break;

          case '/api/auth/refresh':
            if (request.method === 'POST') {
              response = await handleRefresh(request, env);
            } else {
              response = new Response('Method not allowed', { status: 405 });
            }
            break;

          case '/api/auth/forgot-password':
            if (request.method === 'POST') {
              response = await handleForgotPassword(request, env);
            } else {
              response = new Response('Method not allowed', { status: 405 });
            }
            break;

          case '/api/auth/reset-password':
            if (request.method === 'POST') {
              response = await handleResetPassword(request, env);
            } else {
              response = new Response('Method not allowed', { status: 405 });
            }
            break;

          default:
            response = new Response('Not Found', { status: 404 });
        }

        // Add CORS headers to response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }

      // Health check endpoint
      if (pathname === '/health') {
        return Response.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        });
      }

      // API documentation endpoint
      if (pathname === '/api' || pathname === '/api/') {
        return Response.json({
          service: 'GPUScout Platform API',
          version: '1.0.0',
          endpoints: {
            auth: {
              'POST /api/auth/register': 'User registration',
              'POST /api/auth/verify-email': 'Email verification',
              'POST /api/auth/login': 'User login',
              'POST /api/auth/refresh': 'Refresh JWT token',
              'POST /api/auth/forgot-password': 'Request password reset',
              'POST /api/auth/reset-password': 'Complete password reset'
            }
          },
          documentation: 'https://docs.gpuscout.ai'
        });
      }

      // Default 404 for unmatched routes
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      
      return Response.json(
        { 
          success: false, 
          error: 'Internal server error',
          requestId: crypto.randomUUID()
        },
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};