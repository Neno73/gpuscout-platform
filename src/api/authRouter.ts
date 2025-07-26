/**
 * Authentication Router for GPUScout Platform
 * Routes authentication requests to appropriate handlers
 */

import { 
  handleRegistration, 
  handleEmailVerification, 
  handleLogin, 
  handleRefresh, 
  handleForgotPassword, 
  handleResetPassword 
} from './auth.js';
import { Env } from '../worker';

export async function authHandler(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  
  try {
    // Route to appropriate handler based on path and method
    switch (path) {
      case '/api/auth/register':
        if (request.method === 'POST') {
          return await handleRegistration(request, env);
        }
        break;
        
      case '/api/auth/verify-email':
        if (request.method === 'POST') {
          return await handleEmailVerification(request, env);
        }
        break;
        
      case '/api/auth/login':
        if (request.method === 'POST') {
          return await handleLogin(request, env);
        }
        break;
        
      case '/api/auth/refresh':
        if (request.method === 'POST') {
          return await handleRefresh(request, env);
        }
        break;
        
      case '/api/auth/forgot-password':
        if (request.method === 'POST') {
          return await handleForgotPassword(request, env);
        }
        break;
        
      case '/api/auth/reset-password':
        if (request.method === 'POST') {
          return await handleResetPassword(request, env);
        }
        break;
        
      case '/api/auth/logout':
        if (request.method === 'POST') {
          return await handleLogout(request, env);
        }
        break;
    }
    
    // Method not allowed for this endpoint
    return new Response(JSON.stringify({
      success: false,
      error: 'Method Not Allowed',
      message: `${request.method} ${path} is not supported`
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Auth router error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle user logout
 * For stateless JWTs, this is mainly a client-side operation
 * In production, you'd want to blacklist tokens in Redis/KV
 */
async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    // Extract token from Authorization header for potential blacklisting
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      // TODO: Add token to blacklist in KV storage
      // await env.CACHE.put(`blacklisted_token:${token}`, 'true', { expirationTtl: 3600 });
      console.log('Token logout requested:', token.substring(0, 20) + '...');
    }
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Logout failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}