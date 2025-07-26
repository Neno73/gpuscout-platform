/**
 * Rate limiting utility using Cloudflare KV storage
 */

/**
 * Checks if a request should be rate limited
 * @param {string} key - Rate limit key (e.g., IP address, user ID)
 * @param {number} limit - Maximum number of requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @param {Object} env - Environment variables containing KV binding
 * @returns {Promise<Object>} - Rate limit status
 */
export async function checkRateLimit(key, limit, windowSeconds, env) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  const rateLimitKey = `rate_limit:${key}:${Math.floor(now / windowSeconds)}`;
  
  try {
    // Get current count from KV
    const currentCountStr = await env.CACHE.get(rateLimitKey);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
    
    if (currentCount >= limit) {
      return {
        allowed: false,
        count: currentCount,
        limit,
        resetTime: (Math.floor(now / windowSeconds) + 1) * windowSeconds,
        retryAfter: windowSeconds - (now % windowSeconds)
      };
    }
    
    // Increment counter
    const newCount = currentCount + 1;
    await env.CACHE.put(rateLimitKey, newCount.toString(), {
      expirationTtl: windowSeconds
    });
    
    return {
      allowed: true,
      count: newCount,
      limit,
      resetTime: (Math.floor(now / windowSeconds) + 1) * windowSeconds,
      remaining: limit - newCount
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      count: 0,
      limit,
      error: true
    };
  }
}

/**
 * Rate limiting for registration attempts
 * @param {string} ip - Client IP address
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Rate limit status
 */
export async function checkRegistrationRateLimit(ip, env) {
  return await checkRateLimit(`registration:${ip}`, 3, 60, env); // 3 attempts per minute
}

/**
 * Rate limiting for login attempts
 * @param {string} ip - Client IP address
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Rate limit status
 */
export async function checkLoginRateLimit(ip, env) {
  return await checkRateLimit(`login:${ip}`, 5, 300, env); // 5 attempts per 5 minutes
}

/**
 * Rate limiting for password reset requests
 * @param {string} ip - Client IP address
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Rate limit status
 */
export async function checkPasswordResetRateLimit(ip, env) {
  return await checkRateLimit(`password_reset:${ip}`, 3, 3600, env); // 3 attempts per hour
}

/**
 * Rate limiting for email verification requests
 * @param {string} email - User email address
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Rate limit status
 */
export async function checkEmailVerificationRateLimit(email, env) {
  return await checkRateLimit(`email_verification:${email}`, 5, 3600, env); // 5 attempts per hour
}

/**
 * Account lockout tracking for failed login attempts
 * @param {string} userId - User ID
 * @param {Object} env - Environment variables
 * @returns {Promise<boolean>} - True if account should be locked
 */
export async function trackFailedLogin(userId, env) {
  const key = `failed_login:${userId}`;
  
  try {
    const currentCountStr = await env.CACHE.get(key);
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
    const newCount = currentCount + 1;
    
    // Store with 15 minute expiration (lockout duration)
    await env.CACHE.put(key, newCount.toString(), {
      expirationTtl: 900 // 15 minutes
    });
    
    // Lock account after 5 failed attempts
    return newCount >= 5;
  } catch (error) {
    console.error('Failed login tracking error:', error);
    return false;
  }
}

/**
 * Clear failed login attempts after successful login
 * @param {string} userId - User ID
 * @param {Object} env - Environment variables
 */
export async function clearFailedLogins(userId, env) {
  const key = `failed_login:${userId}`;
  
  try {
    await env.CACHE.delete(key);
  } catch (error) {
    console.error('Clear failed logins error:', error);
  }
}

/**
 * Check if account is currently locked
 * @param {string} userId - User ID
 * @param {Object} env - Environment variables
 * @returns {Promise<Object>} - Lock status with remaining time
 */
export async function checkAccountLock(userId, env) {
  const key = `failed_login:${userId}`;
  
  try {
    const countStr = await env.CACHE.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    
    if (count >= 5) {
      // Get TTL to determine remaining lock time
      const metadata = await env.CACHE.getWithMetadata(key);
      const remainingTtl = metadata.metadata?.ttl || 0;
      
      return {
        locked: true,
        attempts: count,
        remainingSeconds: remainingTtl
      };
    }
    
    return {
      locked: false,
      attempts: count
    };
  } catch (error) {
    console.error('Account lock check error:', error);
    return { locked: false, attempts: 0 };
  }
}

/**
 * Get client IP address from request
 * @param {Request} request - Request object
 * @returns {string} - Client IP address
 */
export function getClientIP(request) {
  // Check Cloudflare headers first
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to other common headers
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }
  
  // Default fallback
  return '0.0.0.0';
}