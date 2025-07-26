import { SignJWT, jwtVerify } from 'jose';

/**
 * Generates JWT access and refresh tokens for a user
 * @param {string} userId - User ID
 * @param {Object} env - Environment variables containing JWT_SECRET
 * @returns {Promise<Object>} - Object containing accessToken and refreshToken
 */
export async function generateTokens(userId, env) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  
  // Access token (1 hour)
  const accessToken = await new SignJWT({ userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  
  // Refresh token (7 days)
  const refreshToken = await new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  
  return { 
    accessToken, 
    refreshToken,
    expiresIn: 3600 // 1 hour in seconds
  };
}

/**
 * Verifies a JWT token and returns the payload
 * @param {string} token - JWT token to verify
 * @param {Object} env - Environment variables containing JWT_SECRET
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export async function verifyToken(token, env) {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Generates a secure verification token for email verification
 * @returns {string} - Random UUID token
 */
export function generateVerificationToken() {
  return crypto.randomUUID();
}

/**
 * Generates a secure reset token for password reset
 * @returns {string} - Random UUID token
 */
export function generateResetToken() {
  return crypto.randomUUID();
}

/**
 * Checks if a token has expired based on creation timestamp
 * @param {string} createdAt - ISO timestamp when token was created
 * @param {number} expirationHours - Hours until token expires
 * @returns {boolean} - True if token is expired
 */
export function isTokenExpired(createdAt, expirationHours = 24) {
  const created = new Date(createdAt);
  const now = new Date();
  const expirationMs = expirationHours * 60 * 60 * 1000; // Convert hours to milliseconds
  
  return (now.getTime() - created.getTime()) > expirationMs;
}

/**
 * Extracts JWT token from Authorization header
 * @param {Request} request - Request object
 * @returns {string|null} - JWT token or null if not found
 */
export function extractTokenFromHeader(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Middleware to authenticate requests using JWT
 * @param {Request} request - Request object
 * @param {Object} env - Environment variables
 * @returns {Promise<Object|null>} - User payload or null if authentication fails
 */
export async function authenticateRequest(request, env) {
  try {
    const token = extractTokenFromHeader(request);
    
    if (!token) {
      return null;
    }
    
    const payload = await verifyToken(token, env);
    
    // Ensure it's an access token
    if (payload.type !== 'access') {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}