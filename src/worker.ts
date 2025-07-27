/**
 * Cloudflare Workers entry point for GPUScout Platform
 * Handles API routing for market data and portfolio management
 */

import { marketDataHandler } from './api/marketDataRouter';
import { portfolioHandler } from './api/portfolioRouter';
import { rateLimitHandler } from './middleware/rateLimit';
import { corsHandler } from './middleware/cors';
import { handleScheduled, handleManualScheduled, getScheduledJobStatus } from './handlers/scheduledHandler';
import { handleDiagnostics } from './api/diagnosticRouter';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  APP_URL: string;
  DISCORD_WEBHOOK_URL: string;
  SENTRY_DSN?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    try {
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return corsHandler(request);
      }
    
    // Apply rate limiting
    const rateLimitResponse = await rateLimitHandler(request, env);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Route to market data endpoints
    if (url.pathname.startsWith('/api/market/')) {
      const response = await marketDataHandler(request, env);
      return corsHandler(request, response);
    }
    
    // Route to portfolio management endpoints
    if (url.pathname.startsWith('/api/portfolios')) {
      const response = await portfolioHandler(request, env);
      return corsHandler(request, response);
    }
    
    // Route to scheduled job management endpoints
    if (url.pathname === '/api/scheduled/trigger') {
      const response = await handleManualScheduled(request, env);
      return corsHandler(request, response);
    }
    
    if (url.pathname === '/api/scheduled/status') {
      const response = await getScheduledJobStatus(env);
      return corsHandler(request, response);
    }
    
    // Diagnostic endpoints (temporary for debugging)
    if (url.pathname.startsWith('/api/diagnostics/')) {
      const response = await handleDiagnostics(request, env);
      return corsHandler(request, response);
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
      // Default 404 response
      return new Response(JSON.stringify({
        success: false,
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
    } catch (error) {
      // Log error to Sentry if configured
      if (env.SENTRY_DSN) {
        console.error('Worker error:', error);
      }
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await handleScheduled(event, env);
  }
};