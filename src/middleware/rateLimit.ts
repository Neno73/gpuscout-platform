/**
 * Rate limiting middleware for Cloudflare Workers
 * Uses KV storage for tracking request counts per IP
 */

import { Env } from '../worker';

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;    // Custom error message
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/register': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
    message: 'Too many registration attempts. Please try again in 1 minute.'
  },
  '/api/auth/login': {
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 5,
    message: 'Too many login attempts. Please try again in 1 minute.'
  },
  '/api/auth/forgot-password': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 2,
    message: 'Too many password reset requests. Please try again in 5 minutes.'
  },
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests. Please try again later.'
  }
};

export async function rateLimitHandler(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Get rate limit configuration for this endpoint
  const config = DEFAULT_LIMITS[url.pathname] || DEFAULT_LIMITS.default;
  
  // Create a unique key for this IP and endpoint
  const key = `ratelimit:${clientIP}:${url.pathname}`;
  
  try {
    // Get current request count from KV
    const currentData = await env.CACHE.get(key);
    const now = Date.now();
    
    let requestCount = 1;
    let windowStart = now;
    
    if (currentData) {
      const parsed = JSON.parse(currentData);
      const timeSinceStart = now - parsed.windowStart;
      
      if (timeSinceStart < config.windowMs) {
        // Still within the current window
        requestCount = parsed.count + 1;
        windowStart = parsed.windowStart;
        
        if (requestCount > config.maxRequests) {
          // Rate limit exceeded
          const resetTime = Math.ceil((windowStart + config.windowMs - now) / 1000);
          
          return new Response(JSON.stringify({
            success: false,
            error: 'Rate Limit Exceeded',
            message: config.message,
            retryAfter: resetTime
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': resetTime.toString(),
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(windowStart + config.windowMs).toISOString()
            }
          });
        }
      } else {
        // Window has expired, start new window
        requestCount = 1;
        windowStart = now;
      }
    }
    
    // Update the request count in KV
    await env.CACHE.put(key, JSON.stringify({
      count: requestCount,
      windowStart: windowStart
    }), {
      expirationTtl: Math.ceil(config.windowMs / 1000) + 60 // Add buffer
    });
    
    // Add rate limit headers to the request for downstream handlers
    request.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    request.headers.set('X-RateLimit-Remaining', (config.maxRequests - requestCount).toString());
    request.headers.set('X-RateLimit-Reset', new Date(windowStart + config.windowMs).toISOString());
    
    return null; // Continue processing
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    // If rate limiting fails, allow the request to continue
    return null;
  }
}