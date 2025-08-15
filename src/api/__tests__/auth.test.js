import { 
  handleRegistration,
  handleEmailVerification,
  handleLogin,
  handleRefresh,
  handleForgotPassword,
  handleResetPassword
} from '../auth.js';
import * as bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('../../utils/password.js');
jest.mock('../../utils/jwt.js', () => ({
  ...jest.requireActual('../../utils/jwt.js'),
  __esModule: true,
  generateVerificationToken: jest.fn(),
  generateTokens: jest.fn(),
  generateResetToken: jest.fn(),
}));
jest.mock('../../utils/email.js');
jest.mock('../../utils/rateLimit.js');

const mockDB = {
  prepare: jest.fn().mockReturnThis(),
  bind: jest.fn().mockReturnThis(),
  first: jest.fn(),
  run: jest.fn()
};

const mockEnv = {
  DB: mockDB,
  CACHE: {
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  },
  JWT_SECRET: 'test-secret',
  APP_URL: 'https://test.example.com'
};

// Mock successful rate limit by default
const mockRateLimitSuccess = {
  allowed: true,
  count: 1,
  limit: 3,
  remaining: 2
};

describe('User Registration API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock rate limiting to allow requests by default
    const { checkRegistrationRateLimit, getClientIP } = require('../../utils/rateLimit.js');
    checkRegistrationRateLimit.mockResolvedValue(mockRateLimitSuccess);
    getClientIP.mockReturnValue('127.0.0.1');
    
    // Mock password hashing
    const { hashPassword } = require('../../utils/password.js');
    hashPassword.mockResolvedValue('$2b$12$hashedpassword');
    
    // Mock JWT generation
    const { generateVerificationToken } = require('../../utils/jwt.js');
    generateVerificationToken.mockReturnValue('verification-token-123');
    
    // Mock email service
    const { sendVerificationEmail } = require('../../utils/email.js');
    sendVerificationEmail.mockResolvedValue(true);
  });

  test('successful registration creates user and sends verification email', async () => {
    // Mock no existing user
    mockDB.first.mockResolvedValue(null);
    mockDB.run.mockResolvedValue({ success: true });

    const registrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      timezone: 'America/New_York',
      language: 'en',
      gdprConsent: true,
      subscriptionTier: 'free'
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(registrationData),
      headers: {
        get: jest.fn().mockReturnValue('127.0.0.1')
      }
    };

    const response = await handleRegistration(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      id: expect.any(String),
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: false,
      subscriptionTier: 'free',
      createdAt: expect.any(String)
    });

    // Verify database insertion was called
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'));
    expect(mockDB.bind).toHaveBeenCalled();
    expect(mockDB.run).toHaveBeenCalled();

    // Verify verification email was sent
    const { sendVerificationEmail } = require('../../utils/email.js');
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      'test@example.com',
      'verification-token-123',
      mockEnv
    );
  });

  test('prevents duplicate email registration', async () => {
    // Mock existing user
    mockDB.first.mockResolvedValue({ id: 'existing-user-id' });

    const registrationData = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      name: 'New User',
      timezone: 'America/New_York',
      gdprConsent: true
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(registrationData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleRegistration(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(409);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already registered/i);

    // Verify no database insertion was attempted
    expect(mockDB.run).not.toHaveBeenCalled();
  });

  test('validates required fields', async () => {
    const invalidRegistrationData = {
      email: 'invalid-email',
      password: 'weak',
      // Missing required fields
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(invalidRegistrationData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleRegistration(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/validation/i);
    expect(result.fieldErrors).toHaveLength(8);
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ field: 'email' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ message: 'Password must be at least 8 characters' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ message: 'Password must contain at least one uppercase letter' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ message: 'Password must contain at least one number' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ message: 'Password must contain at least one special character (@$!%*?&)' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ field: 'name' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ field: 'timezone' }));
    expect(result.fieldErrors).toContainEqual(expect.objectContaining({ field: 'gdprConsent' }));
  });

  test('enforces rate limiting', async () => {
    // Mock rate limit exceeded
    const { checkRegistrationRateLimit } = require('../../utils/rateLimit.js');
    checkRegistrationRateLimit.mockResolvedValue({
      allowed: false,
      retryAfter: 60
    });

    const registrationData = {
      email: 'ratelimit@example.com',
      password: 'SecurePass123!',
      name: 'Rate Limit Test',
      timezone: 'UTC',
      gdprConsent: true
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(registrationData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleRegistration(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(429);
    expect(result.error).toMatch(/rate limit/i);
    expect(result.retryAfter).toBe(60);
  });
});

describe('Email Verification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successful verification updates user status', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'unverified@example.com',
      created_at: new Date().toISOString(),
      email_verified: 0
    };

    mockDB.first.mockResolvedValue(mockUser);
    mockDB.run.mockResolvedValue({ success: true });

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ token: 'verification-token-123' })
    };

    const response = await handleEmailVerification(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.verified).toBe(true);
    expect(result.data.redirectUrl).toBe('/onboarding');

    // Verify database update was called
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'));
    expect(mockDB.run).toHaveBeenCalled();
  });

  test('rejects invalid verification tokens', async () => {
    mockDB.first.mockResolvedValue(null);

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ token: 'invalid-token' })
    };

    const response = await handleEmailVerification(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid.*token/i);
  });

  test('handles expired verification tokens', async () => {
    // Mock user with expired token (created > 24 hours ago)
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago

    const mockUser = {
      id: 'test-user-id',
      email: 'expired@example.com',
      created_at: expiredDate.toISOString(),
      email_verified: 0
    };

    mockDB.first.mockResolvedValue(mockUser);

    const mockRequest = {
      json: jest.fn().mockResolvedValue({ token: 'expired-token' })
    };

    const response = await handleEmailVerification(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/expired/i);
    expect(result.data.canResend).toBe(true);
  });
});

describe('User Login API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock rate limiting success
    const { checkLoginRateLimit, getClientIP, checkAccountLock, clearFailedLogins } = require('../../utils/rateLimit.js');
    checkLoginRateLimit.mockResolvedValue(mockRateLimitSuccess);
    getClientIP.mockReturnValue('127.0.0.1');
    checkAccountLock.mockResolvedValue({ locked: false, attempts: 0 });
    clearFailedLogins.mockResolvedValue();
    
    // Mock password verification
    const { verifyPassword } = require('../../utils/password.js');
    verifyPassword.mockResolvedValue(true);
    
    // Mock JWT generation
    const { generateTokens } = require('../../utils/jwt.js');
    generateTokens.mockResolvedValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 3600
    });
  });

  test('successful login returns tokens and user data', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'verified@example.com',
      password_hash: '$2b$12$hashedpassword',
      name: 'Verified User',
      subscription_tier: 'free',
      email_verified: 1,
      failed_login_attempts: 0,
      locked_until: null
    };

    mockDB.first.mockResolvedValue(mockUser);
    mockDB.run.mockResolvedValue({ success: true });

    const loginData = {
      email: 'verified@example.com',
      password: 'SecurePass123!',
      rememberMe: true
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(loginData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleLogin(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 3600,
      user: {
        id: 'test-user-id',
        email: 'verified@example.com',
        name: 'Verified User',
        subscriptionTier: 'free',
        emailVerified: true
      }
    });

    // Verify login was logged
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE users'));
    expect(mockDB.run).toHaveBeenCalled();
  });

  test('rejects invalid credentials', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'verified@example.com',
      password_hash: '$2b$12$hashedpassword',
      name: 'Verified User',
      email_verified: 1
    };

    mockDB.first.mockResolvedValue(mockUser);
    mockDB.run.mockResolvedValue({ success: true });

    // Mock password verification failure
    const { verifyPassword } = require('../../utils/password.js');
    verifyPassword.mockResolvedValue(false);

    const loginData = {
      email: 'verified@example.com',
      password: 'WrongPassword123!'
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(loginData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleLogin(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid credentials/i);

    // Verify failed attempt was logged
    expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('failed_login_attempts'));
  });

  test('prevents login with unverified email', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'unverified@example.com',
      password_hash: '$2b$12$hashedpassword',
      name: 'Unverified User',
      email_verified: 0 // Not verified
    };

    mockDB.first.mockResolvedValue(mockUser);

    const loginData = {
      email: 'unverified@example.com',
      password: 'SecurePass123!'
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(loginData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleLogin(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(403);
    expect(result.error).toMatch(/email not verified/i);
    expect(result.data.canResendVerification).toBe(true);
  });

  test('locks account after multiple failed attempts', async () => {
    // Mock account lock status
    const { checkAccountLock } = require('../../utils/rateLimit.js');
    checkAccountLock.mockResolvedValue({
      locked: true,
      attempts: 5,
      remainingSeconds: 900 // 15 minutes
    });

    const mockUser = {
      id: 'test-user-id',
      email: 'locked@example.com',
      password_hash: '$2b$12$hashedpassword',
      email_verified: 1
    };

    mockDB.first.mockResolvedValue(mockUser);

    const loginData = {
      email: 'locked@example.com',
      password: 'AnyPassword123!'
    };

    const mockRequest = {
      json: jest.fn().mockResolvedValue(loginData),
      headers: { get: jest.fn().mockReturnValue('127.0.0.1') }
    };

    const response = await handleLogin(mockRequest, mockEnv);
    const result = await response.json();

    expect(response.status).toBe(423);
    expect(result.error).toMatch(/account locked/i);
    expect(result.data.lockedUntil).toBeDefined();
  });
});