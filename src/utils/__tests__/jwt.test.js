import { SignJWT } from 'jose';
import { 
  generateTokens, 
  verifyToken, 
  generateVerificationToken,
  generateResetToken,
  isTokenExpired,
  extractTokenFromHeader,
  authenticateRequest
} from '../jwt.js';

// Mock environment for tests
const mockEnv = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only'
};

describe('JWT Token Management', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockSecret = 'test-jwt-secret-key';
  
  test('generates valid access and refresh tokens', async () => {
    const tokens = await generateTokens(mockUserId, { JWT_SECRET: mockSecret });
    
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.expiresIn).toBe(3600); // 1 hour
  });
  
  test('access token expires in 1 hour', async () => {
    const tokens = await generateTokens(mockUserId, { JWT_SECRET: mockSecret });
    const payload = await verifyToken(tokens.accessToken, { JWT_SECRET: mockSecret });
    
    const issuedAt = payload.iat * 1000;
    const expiresAt = payload.exp * 1000;
    const expectedDuration = 60 * 60 * 1000; // 1 hour in ms
    
    expect(expiresAt - issuedAt).toBe(expectedDuration);
    expect(payload.userId).toBe(mockUserId);
    expect(payload.type).toBe('access');
  });
  
  test('refresh token expires in 7 days', async () => {
    const tokens = await generateTokens(mockUserId, { JWT_SECRET: mockSecret });
    const payload = await verifyToken(tokens.refreshToken, { JWT_SECRET: mockSecret });
    
    const issuedAt = payload.iat * 1000;
    const expiresAt = payload.exp * 1000;
    const expectedDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    
    expect(expiresAt - issuedAt).toBe(expectedDuration);
    expect(payload.userId).toBe(mockUserId);
    expect(payload.type).toBe('refresh');
  });
  
  test('rejects invalid tokens', async () => {
    await expect(verifyToken('invalid-token', { JWT_SECRET: mockSecret }))
      .rejects.toThrow('Invalid token');
  });
  
  test('rejects expired tokens', async () => {
    // Create token with very short expiry
    const secret = new TextEncoder().encode(mockSecret);
    const expiredToken = await new SignJWT({ userId: mockUserId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1ms')
      .sign(secret);
    
    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await expect(verifyToken(expiredToken, { JWT_SECRET: mockSecret }))
      .rejects.toThrow();
  });

  test('generates unique verification tokens', () => {
    const token1 = generateVerificationToken();
    const token2 = generateVerificationToken();
    
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(typeof token1).toBe('string');
    expect(typeof token2).toBe('string');
  });

  test('generates unique reset tokens', () => {
    const token1 = generateResetToken();
    const token2 = generateResetToken();
    
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(typeof token1).toBe('string');
    expect(typeof token2).toBe('string');
  });
});

describe('Token Expiration Checking', () => {
  test('detects expired tokens', () => {
    const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    expect(isTokenExpired(expiredDate.toISOString(), 24)).toBe(true);
  });

  test('detects valid tokens', () => {
    const validDate = new Date(Date.now() - 23 * 60 * 60 * 1000); // 23 hours ago
    expect(isTokenExpired(validDate.toISOString(), 24)).toBe(false);
  });

  test('handles custom expiration hours', () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    expect(isTokenExpired(recentDate.toISOString(), 1)).toBe(false);
    expect(isTokenExpired(recentDate.toISOString(), 0.25)).toBe(true); // 15 minutes
  });
});

describe('Token Header Extraction', () => {
  test('extracts token from valid Authorization header', () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer test-token-123')
      }
    };

    const token = extractTokenFromHeader(mockRequest);
    expect(token).toBe('test-token-123');
  });

  test('returns null for missing Authorization header', () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      }
    };

    const token = extractTokenFromHeader(mockRequest);
    expect(token).toBeNull();
  });

  test('returns null for invalid Authorization header format', () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Invalid header format')
      }
    };

    const token = extractTokenFromHeader(mockRequest);
    expect(token).toBeNull();
  });
});

describe('Request Authentication', () => {
  test('authenticates valid access token', async () => {
    const tokens = await generateTokens(mockUserId, mockEnv);
    
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(`Bearer ${tokens.accessToken}`)
      }
    };

    const payload = await authenticateRequest(mockRequest, mockEnv);
    expect(payload).toBeDefined();
    expect(payload.userId).toBe(mockUserId);
    expect(payload.type).toBe('access');
  });

  test('rejects refresh token for authentication', async () => {
    const tokens = await generateTokens(mockUserId, mockEnv);
    
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(`Bearer ${tokens.refreshToken}`)
      }
    };

    const payload = await authenticateRequest(mockRequest, mockEnv);
    expect(payload).toBeNull();
  });

  test('returns null for missing token', async () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue(null)
      }
    };

    const payload = await authenticateRequest(mockRequest, mockEnv);
    expect(payload).toBeNull();
  });

  test('returns null for invalid token', async () => {
    const mockRequest = {
      headers: {
        get: jest.fn().mockReturnValue('Bearer invalid-token')
      }
    };

    const payload = await authenticateRequest(mockRequest, mockEnv);
    expect(payload).toBeNull();
  });
});