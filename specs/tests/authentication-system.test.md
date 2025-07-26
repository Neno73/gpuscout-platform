# Test Specification: Authentication System

## Test Configuration
```yaml
framework: jest
environment: jsdom
coverage: 90%
testcontainers:
  - cloudflare-d1-local
  - redis:7-alpine
mcp_tools:
  - playwright: e2e testing
  - grafana: performance metrics
  - datadog: APM traces
  - sentry: error tracking
timeout: 30000
```

## Unit Tests

### TEST-001: Email Validation
```javascript
describe('Email Validation', () => {
  test('accepts valid email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.email+tag@domain.co.uk',
      'user123@sub.domain.org'
    ];
    
    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });
  
  test('rejects invalid email formats', () => {
    const invalidEmails = [
      'invalid-email',
      '@example.com',
      'user@',
      'user..double.dot@example.com',
      'user@.com'
    ];
    
    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });
  
  test('handles edge cases', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail('a'.repeat(255) + '@example.com')).toBe(false); // Too long
  });
});
```

### TEST-002: Password Strength Validation
```javascript
describe('Password Strength Validation', () => {
  test('accepts strong passwords', () => {
    const strongPasswords = [
      'SecurePass123!',
      'My$tr0ngP@ssw0rd',
      'C0mpl3x!P@ssw0rd2024'
    ];
    
    strongPasswords.forEach(password => {
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });
  });
  
  test('rejects weak passwords', () => {
    const weakPasswords = [
      'password',      // No numbers, no uppercase, no symbols
      'PASSWORD',      // No lowercase, no numbers, no symbols
      '12345678',      // No letters, no symbols
      'Password',      // No numbers, no symbols
      'Pass123',       // Too short
      'password123'    // No uppercase, no symbols
    ];
    
    weakPasswords.forEach(password => {
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(false);
      expect(result.strength).toMatch(/weak|medium/);
    });
  });
  
  test('provides helpful feedback messages', () => {
    const result = validatePasswordStrength('weak');
    expect(result.feedback).toContain('at least 8 characters');
    expect(result.feedback).toContain('uppercase letter');
    expect(result.feedback).toContain('number');
    expect(result.feedback).toContain('special character');
  });
});
```

### TEST-003: JWT Token Generation and Validation
```javascript
describe('JWT Token Management', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockSecret = 'test-jwt-secret-key';
  
  test('generates valid access and refresh tokens', async () => {
    const tokens = await generateTokens(mockUserId, mockSecret);
    
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
  });
  
  test('access token expires in 1 hour', async () => {
    const tokens = await generateTokens(mockUserId, mockSecret);
    const payload = await verifyToken(tokens.accessToken, mockSecret);
    
    const issuedAt = payload.iat * 1000;
    const expiresAt = payload.exp * 1000;
    const expectedDuration = 60 * 60 * 1000; // 1 hour in ms
    
    expect(expiresAt - issuedAt).toBe(expectedDuration);
  });
  
  test('refresh token expires in 7 days', async () => {
    const tokens = await generateTokens(mockUserId, mockSecret);
    const payload = await verifyToken(tokens.refreshToken, mockSecret);
    
    const issuedAt = payload.iat * 1000;
    const expiresAt = payload.exp * 1000;
    const expectedDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    
    expect(expiresAt - issuedAt).toBe(expectedDuration);
  });
  
  test('rejects invalid tokens', async () => {
    await expect(verifyToken('invalid-token', mockSecret))
      .rejects.toThrow('Invalid token');
  });
  
  test('rejects expired tokens', async () => {
    // Create token with very short expiry
    const expiredToken = await new SignJWT({ userId: mockUserId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1ms')
      .sign(new TextEncoder().encode(mockSecret));
    
    // Wait for token to expire
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await expect(verifyToken(expiredToken, mockSecret))
      .rejects.toThrow();
  });
});
```

### TEST-004: Password Hashing
```javascript
describe('Password Hashing', () => {
  test('hashes passwords with bcrypt', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$12$')).toBe(true); // bcrypt with 12 rounds
  });
  
  test('verifies correct passwords', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  test('rejects incorrect passwords', async () => {
    const password = 'SecurePass123!';
    const wrongPassword = 'WrongPassword456!';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });
  
  test('uses 12 salt rounds for security', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);
    
    // bcrypt format: $2b$rounds$salt$hash
    const rounds = hash.split('$')[2];
    expect(rounds).toBe('12');
  });
});
```

## Integration Tests

### TEST-101: User Registration Flow
```javascript
describe('User Registration API', () => {
  let testDb;
  let mockEmailService;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    mockEmailService = jest.fn();
  });
  
  afterEach(async () => {
    await cleanupTestDatabase(testDb);
  });
  
  test('successful registration creates user and sends verification email', async () => {
    const registrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      timezone: 'America/New_York',
      language: 'en',
      gdprConsent: true,
      subscriptionTier: 'free'
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(registrationData)
      .expect(201);
    
    // Verify response structure
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: false,
      subscriptionTier: 'free',
      createdAt: expect.any(String)
    });
    
    // Verify user was created in database
    const user = await testDb.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind('test@example.com').first();
    
    expect(user).toBeTruthy();
    expect(user.email).toBe('test@example.com');
    expect(user.email_verified).toBe(0); // SQLite boolean as integer
    expect(user.verification_token).toBeTruthy();
    
    // Verify password was hashed
    expect(user.password_hash).not.toBe(registrationData.password);
    expect(user.password_hash.startsWith('$2b$12$')).toBe(true);
    
    // Verify verification email was sent
    expect(mockEmailService).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Verify'),
        html: expect.stringContaining('verification')
      })
    );
  });
  
  test('prevents duplicate email registration', async () => {
    // Create existing user
    await testDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, timezone, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      'existing-user-id',
      'existing@example.com',
      '$2b$12$hashedpassword',
      'Existing User',
      'UTC',
      new Date().toISOString()
    ).run();
    
    const registrationData = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      name: 'New User',
      timezone: 'America/New_York',
      gdprConsent: true
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(registrationData)
      .expect(409);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/already registered/i);
    
    // Verify no duplicate user was created
    const users = await testDb.prepare(
      'SELECT COUNT(*) as count FROM users WHERE email = ?'
    ).bind('existing@example.com').first();
    
    expect(users.count).toBe(1);
  });
  
  test('validates required fields', async () => {
    const invalidRegistrationData = {
      email: 'invalid-email',
      password: 'weak',
      // Missing required fields
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(invalidRegistrationData)
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/validation/i);
    expect(response.body.fieldErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: expect.stringContaining('Invalid email')
        }),
        expect.objectContaining({
          field: 'password',
          message: expect.stringContaining('8 characters')
        }),
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('required')
        })
      ])
    );
  });
  
  test('enforces rate limiting', async () => {
    const registrationData = {
      email: 'ratelimit@example.com',
      password: 'SecurePass123!',
      name: 'Rate Limit Test',
      timezone: 'UTC',
      gdprConsent: true
    };
    
    // Make 3 rapid requests (should succeed)
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/register')
        .send({ ...registrationData, email: `test${i}@example.com` })
        .expect(201);
    }
    
    // 4th request should be rate limited
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...registrationData, email: 'ratelimited@example.com' })
      .expect(429);
    
    expect(response.body.error).toMatch(/rate limit/i);
  });
});
```

### TEST-102: Email Verification Flow
```javascript
describe('Email Verification API', () => {
  let testDb;
  let verificationToken;
  let userId;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    
    // Create unverified user
    userId = 'test-user-id';
    verificationToken = 'verification-token-123';
    
    await testDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, timezone, 
                        email_verified, verification_token, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      'unverified@example.com',
      '$2b$12$hashedpassword',
      'Unverified User',
      'UTC',
      0, // false
      verificationToken,
      new Date().toISOString()
    ).run();
  });
  
  test('successful verification updates user status', async () => {
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationToken })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.verified).toBe(true);
    expect(response.body.data.redirectUrl).toBe('/onboarding');
    
    // Verify database was updated
    const user = await testDb.prepare(
      'SELECT email_verified, verification_token FROM users WHERE id = ?'
    ).bind(userId).first();
    
    expect(user.email_verified).toBe(1); // true
    expect(user.verification_token).toBeNull();
  });
  
  test('rejects invalid verification tokens', async () => {
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'invalid-token' })
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/invalid.*token/i);
    
    // Verify user status unchanged
    const user = await testDb.prepare(
      'SELECT email_verified FROM users WHERE id = ?'
    ).bind(userId).first();
    
    expect(user.email_verified).toBe(0); // still false
  });
  
  test('handles expired verification tokens', async () => {
    // Create user with expired token (created > 24 hours ago)
    const expiredDate = new Date();
    expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago
    
    await testDb.prepare(
      'UPDATE users SET created_at = ? WHERE id = ?'
    ).bind(expiredDate.toISOString(), userId).run();
    
    const response = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: verificationToken })
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/expired/i);
    expect(response.body.data.canResend).toBe(true);
  });
});
```

### TEST-103: User Login Flow
```javascript
describe('User Login API', () => {
  let testDb;
  let testUser;
  
  beforeEach(async () => {
    testDb = await setupTestDatabase();
    
    // Create verified user
    const passwordHash = await bcrypt.hash('SecurePass123!', 12);
    testUser = {
      id: 'test-user-id',
      email: 'verified@example.com',
      passwordHash,
      name: 'Verified User'
    };
    
    await testDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, timezone, 
                        email_verified, subscription_tier, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      testUser.id,
      testUser.email,
      testUser.passwordHash,
      testUser.name,
      'UTC',
      1, // true
      'free',
      new Date().toISOString()
    ).run();
  });
  
  test('successful login returns tokens and user data', async () => {
    const loginData = {
      email: 'verified@example.com',
      password: 'SecurePass123!',
      rememberMe: true
    };
    
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: 3600,
      user: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        subscriptionTier: 'free',
        emailVerified: true
      }
    });
    
    // Verify tokens are valid JWTs
    const accessPayload = await verifyToken(response.body.data.accessToken, process.env.JWT_SECRET);
    expect(accessPayload.userId).toBe(testUser.id);
    expect(accessPayload.type).toBe('access');
    
    // Verify last_login was updated
    const user = await testDb.prepare(
      'SELECT last_login FROM users WHERE id = ?'
    ).bind(testUser.id).first();
    
    expect(user.last_login).toBeTruthy();
  });
  
  test('rejects invalid credentials', async () => {
    const loginData = {
      email: 'verified@example.com',
      password: 'WrongPassword123!'
    };
    
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/invalid credentials/i);
    
    // Verify failed attempt was logged
    const user = await testDb.prepare(
      'SELECT failed_login_attempts FROM users WHERE id = ?'
    ).bind(testUser.id).first();
    
    expect(user.failed_login_attempts).toBe(1);
  });
  
  test('locks account after 5 failed attempts', async () => {
    const loginData = {
      email: 'verified@example.com',
      password: 'WrongPassword123!'
    };
    
    // Make 5 failed login attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    }
    
    // 6th attempt should show account locked
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(423); // Locked
    
    expect(response.body.error).toMatch(/account locked/i);
    expect(response.body.data.lockedUntil).toBeTruthy();
    
    // Verify user is locked in database
    const user = await testDb.prepare(
      'SELECT locked_until FROM users WHERE id = ?'
    ).bind(testUser.id).first();
    
    expect(user.locked_until).toBeTruthy();
    
    // Even correct password should be rejected while locked
    const correctLoginData = {
      email: 'verified@example.com',
      password: 'SecurePass123!'
    };
    
    await request(app)
      .post('/api/auth/login')
      .send(correctLoginData)
      .expect(423);
  });
  
  test('prevents login with unverified email', async () => {
    // Create unverified user
    await testDb.prepare(
      'UPDATE users SET email_verified = 0 WHERE id = ?'
    ).bind(testUser.id).run();
    
    const loginData = {
      email: 'verified@example.com',
      password: 'SecurePass123!'
    };
    
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(403);
    
    expect(response.body.error).toMatch(/email not verified/i);
    expect(response.body.data.canResendVerification).toBe(true);
  });
});
```

## E2E Tests

### TEST-201: Complete Registration Journey
```javascript
describe('User Registration Journey', () => {
  test('new user can register, verify email, and access dashboard', async () => {
    const page = await browser.newPage();
    const testEmail = `test-${Date.now()}@example.com`;
    
    try {
      // Navigate to registration page
      await page.goto('/register');
      await expect(page.locator('h1')).toContainText('Create Account');
      
      // Fill registration form
      await page.fill('[name="email"]', testEmail);
      await page.fill('[name="password"]', 'SecurePass123!');
      await page.fill('[name="name"]', 'E2E Test User');
      await page.selectOption('[name="timezone"]', 'America/New_York');
      await page.check('[name="gdprConsent"]');
      
      // Submit form
      await page.click('[type="submit"]');
      
      // Should redirect to email verification page
      await expect(page).toHaveURL('/verify-email');
      await expect(page.locator('.success-message')).toContainText('check your email');
      
      // Simulate clicking verification link (in real test, would check email)
      const verificationToken = await getVerificationTokenFromDatabase(testEmail);
      await page.goto(`/verify-email?token=${verificationToken}`);
      
      // Should redirect to onboarding/dashboard
      await expect(page).toHaveURL('/onboarding');
      await expect(page.locator('.welcome-message')).toContainText('Welcome');
      
      // Verify user is logged in
      const userMenu = page.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();
      await expect(userMenu).toContainText('E2E Test User');
      
    } finally {
      await page.close();
    }
  });
  
  test('registration form validates inputs in real-time', async () => {
    const page = await browser.newPage();
    
    try {
      await page.goto('/register');
      
      // Test email validation
      await page.fill('[name="email"]', 'invalid-email');
      await page.blur('[name="email"]');
      await expect(page.locator('.error-message')).toContainText('Invalid email format');
      
      // Test password strength indicator
      await page.fill('[name="password"]', 'weak');
      await expect(page.locator('.password-strength')).toContainText('Weak');
      
      await page.fill('[name="password"]', 'SecurePass123!');
      await expect(page.locator('.password-strength')).toContainText('Strong');
      
      // Test form submission blocking
      await page.fill('[name="email"]', 'valid@example.com');
      await page.fill('[name="name"]', 'Test User');
      // Don't check GDPR consent
      
      const submitButton = page.locator('[type="submit"]');
      await expect(submitButton).toBeDisabled();
      
      // Check GDPR consent
      await page.check('[name="gdprConsent"]');
      await expect(submitButton).toBeEnabled();
      
    } finally {
      await page.close();
    }
  });
});
```

### TEST-202: Login and Authentication Flow
```javascript
describe('Login and Authentication Flow', () => {
  test('user can login and access protected pages', async () => {
    const page = await browser.newPage();
    
    // Create test user first
    const testUser = await createTestUser({
      email: 'login-test@example.com',
      password: 'SecurePass123!',
      emailVerified: true
    });
    
    try {
      // Navigate to login page
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText('Sign In');
      
      // Fill login form
      await page.fill('[name="email"]', 'login-test@example.com');
      await page.fill('[name="password"]', 'SecurePass123!');
      await page.check('[name="rememberMe"]');
      
      // Submit form
      await page.click('[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('.dashboard-title')).toContainText('Dashboard');
      
      // Verify authentication persists across page refresh
      await page.reload();
      await expect(page).toHaveURL('/dashboard');
      
      // Test protected page access
      await page.goto('/portfolio/create');
      await expect(page.locator('h1')).toContainText('Create Portfolio');
      
      // Test logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await expect(page).toHaveURL('/login');
      
      // Verify protected page now redirects to login
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
      
    } finally {
      await page.close();
      await cleanupTestUser(testUser.id);
    }
  });
  
  test('handles login failures gracefully', async () => {
    const page = await browser.newPage();
    
    try {
      await page.goto('/login');
      
      // Test invalid credentials
      await page.fill('[name="email"]', 'nonexistent@example.com');
      await page.fill('[name="password]', 'WrongPassword123!');
      await page.click('[type="submit"]');
      
      // Should show error message
      await expect(page.locator('.error-message')).toContainText('Invalid credentials');
      await expect(page).toHaveURL('/login'); // Stay on login page
      
      // Test network error handling
      await page.route('/api/auth/login', route => {
        route.abort('failed');
      });
      
      await page.fill('[name="email"]', 'test@example.com');
      await page.fill('[name="password"]', 'SecurePass123!');
      await page.click('[type="submit"]');
      
      await expect(page.locator('.error-message')).toContainText('Connection failed');
      
    } finally {
      await page.close();
    }
  });
});
```

## MCP-Enhanced Testing

### Playwright E2E Tests with Visual Regression
```javascript
describe('Visual Regression Tests', () => {
  test('registration form matches design system', async () => {
    const page = await browser.newPage();
    
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot and compare with baseline
    await expect(page).toHaveScreenshot('registration-form.png');
    
    // Test form states
    await page.fill('[name="password"]', 'weak');
    await expect(page.locator('.password-strength')).toHaveScreenshot('password-strength-weak.png');
    
    await page.fill('[name="password"]', 'SecurePass123!');
    await expect(page.locator('.password-strength')).toHaveScreenshot('password-strength-strong.png');
    
    await page.close();
  });
  
  test('login form responsive design', async () => {
    const page = await browser.newPage();
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login-desktop.png');
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveScreenshot('login-tablet.png');
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('login-mobile.png');
    
    await page.close();
  });
});
```

### Performance Testing with Grafana MCP
```yaml
performance_thresholds:
  - metric: registration_response_time_p95
    threshold: 3000ms
    query: "histogram_quantile(0.95, auth_registration_duration_seconds)"
  - metric: login_response_time_p95
    threshold: 2000ms
    query: "histogram_quantile(0.95, auth_login_duration_seconds)"
  - metric: jwt_generation_time_p95
    threshold: 100ms
    query: "histogram_quantile(0.95, jwt_generation_duration_seconds)"
  - metric: password_hash_time_p95
    threshold: 500ms
    query: "histogram_quantile(0.95, password_hash_duration_seconds)"
  - metric: auth_error_rate
    threshold: 0.1%
    query: "rate(auth_errors_total[5m])"
```

### APM Monitoring with DataDog MCP
```javascript
describe('Authentication Performance Traces', () => {
  beforeEach(() => {
    datadog.startTrace('auth_performance_test');
  });
  
  afterEach(async () => {
    const trace = await datadog.endTrace();
    expect(trace.duration).toBeLessThan(3000); // 3 seconds max
    expect(trace.spans.database).toBeLessThan(100); // 100ms DB time max
    expect(trace.spans.password_hash).toBeLessThan(500); // 500ms hash time max
  });
  
  test('registration performance under load', async () => {
    const promises = [];
    
    // Simulate 10 concurrent registrations
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app)
          .post('/api/auth/register')
          .send({
            email: `load-test-${i}@example.com`,
            password: 'SecurePass123!',
            name: `Load Test User ${i}`,
            timezone: 'UTC',
            gdprConsent: true
          })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // All should succeed
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });
    
    // Check APM traces for performance issues
    const spans = await datadog.getSpans('auth_registration');
    const avgResponseTime = spans.reduce((sum, span) => sum + span.duration, 0) / spans.length;
    expect(avgResponseTime).toBeLessThan(3000);
  });
});
```

### Error Monitoring with Sentry MCP
```javascript
describe('Error Tracking and Monitoring', () => {
  test('captures registration errors correctly', async () => {
    // Simulate database connection failure
    jest.spyOn(database, 'prepare').mockRejectedValue(new Error('Database connection failed'));
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'error-test@example.com',
        password: 'SecurePass123!',
        name: 'Error Test',
        timezone: 'UTC',
        gdprConsent: true
      })
      .expect(500);
    
    // Verify Sentry captured the error
    const events = await sentry.getEvents({
      tag: 'auth.registration_error'
    });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'error',
      message: 'Database connection failed',
      context: {
        email: 'error-test@example.com',
        endpoint: '/api/auth/register'
      }
    });
  });
  
  test('tracks authentication security events', async () => {
    // Simulate brute force attempt
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'victim@example.com',
            password: `wrong-password-${i}`
          })
      );
    }
    
    await Promise.all(promises);
    
    // Verify security event was logged to Sentry
    const events = await sentry.getEvents({
      tag: 'security.account_locked'
    });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'warning',
      message: 'Account locked due to multiple failed login attempts',
      context: {
        email: 'victim@example.com',
        failedAttempts: 6
      }
    });
  });
});
```

## Test Data and Fixtures

### User Test Data
```json
{
  "validUsers": [
    {
      "email": "test1@example.com",
      "password": "SecurePass123!",
      "name": "Test User One",
      "timezone": "America/New_York",
      "language": "en"
    },
    {
      "email": "test2@example.com", 
      "password": "AnotherPass456!",
      "name": "Test User Two",
      "timezone": "Europe/London",
      "language": "en"
    }
  ],
  "invalidEmails": [
    "notanemail",
    "@example.com",
    "user@",
    "user..double@example.com",
    ""
  ],
  "weakPasswords": [
    "password",
    "12345678",
    "PASSWORD",
    "pass123",
    "Passw0rd"
  ],
  "strongPasswords": [
    "SecurePass123!",
    "My$tr0ngP@ssw0rd",
    "C0mpl3x!P@ssw0rd2024"
  ]
}
```

### Database Test Fixtures
```javascript
async function setupTestDatabase() {
  const db = new Database(':memory:');
  
  // Create users table
  await db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      timezone TEXT NOT NULL,
      language TEXT DEFAULT 'en',
      subscription_tier TEXT DEFAULT 'free',
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token TEXT,
      reset_token TEXT,
      reset_expires DATETIME,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);
  
  return db;
}

async function createTestUser(userData) {
  const user = {
    id: crypto.randomUUID(),
    email: userData.email,
    passwordHash: await bcrypt.hash(userData.password, 12),
    name: userData.name || 'Test User',
    timezone: userData.timezone || 'UTC',
    emailVerified: userData.emailVerified || false,
    subscriptionTier: userData.subscriptionTier || 'free'
  };
  
  await testDb.prepare(`
    INSERT INTO users (id, email, password_hash, name, timezone, 
                      email_verified, subscription_tier, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    user.email,
    user.passwordHash,
    user.name,
    user.timezone,
    user.emailVerified ? 1 : 0,
    user.subscriptionTier,
    new Date().toISOString()
  ).run();
  
  return user;
}
```

## IMPORTANT: Test Immutability
These tests are IMMUTABLE CONTRACTS. Once approved by human reviewer:
- **Hash**: SHA-256 will be calculated and stored
- **Claude Code CANNOT modify these tests**
- **Only humans can update tests with new hash approval**
- **Failed tests = failed implementation - no exceptions**
- **Missing MCP tools = blocked implementation - must alert user**

All tests must pass 100% before feature is considered complete. Test coverage must exceed 90% for all authentication-related code.