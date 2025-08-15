import { registrationSchema, loginSchema, emailVerificationSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema } from '../utils/validation.js';
import { generateTokens, verifyToken, generateVerificationToken, generateResetToken, isTokenExpired } from '../utils/jwt.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { 
  checkRegistrationRateLimit, 
  checkLoginRateLimit, 
  checkPasswordResetRateLimit,
  checkEmailVerificationRateLimit,
  trackFailedLogin,
  clearFailedLogins,
  checkAccountLock,
  getClientIP 
} from '../utils/rateLimit.js';

/**
 * Handles user registration
 */
export async function handleRegistration(request, env) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Check rate limit
    const rateLimitResult = await checkRegistrationRateLimit(clientIP, env);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = registrationSchema.parse(body);

    // Check if email already exists
    const existingUser = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(validatedData.email).first();

    if (existingUser) {
      return Response.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create new user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, name, timezone, language, 
                        verification_token, subscription_tier, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      validatedData.email,
      passwordHash,
      validatedData.name,
      validatedData.timezone,
      validatedData.language,
      verificationToken,
      validatedData.subscriptionTier,
      now
    ).run();

    // Send verification email
    const emailSent = await sendVerificationEmail(validatedData.email, verificationToken, env);
    
    if (!emailSent) {
      console.error('Failed to send verification email for user:', userId);
      // Don't fail registration if email fails, just log it
    }

    // Return successful registration response
    return Response.json({
      success: true,
      data: {
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
        emailVerified: false,
        subscriptionTier: validatedData.subscriptionTier,
        createdAt: now
      },
      meta: {
        timestamp: now,
        version: '1.0.0',
        requestId: crypto.randomUUID()
      }
    }, { status: 201 });

  } catch (error) {
    if (error.name === 'ZodError') {
      return Response.json(
        { 
          success: false, 
          error: 'Validation failed',
          fieldErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}

/**
 * Handles email verification
 */
export async function handleEmailVerification(request, env) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = emailVerificationSchema.parse(body);

    // Find user by verification token
    const user = await env.DB.prepare(`
      SELECT id, email, created_at, email_verified 
      FROM users 
      WHERE verification_token = ? AND email_verified = 0
    `).bind(validatedData.token).first();

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Check if token is expired (24 hours)
    if (isTokenExpired(user.created_at, 24)) {
      return Response.json(
        { 
          success: false, 
          error: 'Verification token has expired',
          data: { canResend: true }
        },
        { status: 400 }
      );
    }

    // Update user verification status
    await env.DB.prepare(`
      UPDATE users 
      SET email_verified = 1, verification_token = NULL, updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), user.id).run();

    return Response.json({
      success: true,
      data: {
        verified: true,
        redirectUrl: '/onboarding'
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}

/**
 * Handles user login  
 */
export async function handleLogin(request, env) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Check rate limit
    const rateLimitResult = await checkLoginRateLimit(clientIP, env);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Find user by email
    const user = await env.DB.prepare(`
      SELECT id, email, password_hash, name, subscription_tier, email_verified,
             failed_login_attempts, locked_until
      FROM users 
      WHERE email = ?
    `).bind(validatedData.email).first();

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.email_verified) {
      return Response.json(
        { 
          success: false, 
          error: 'Email not verified. Please check your inbox for verification instructions.',
          data: { canResendVerification: true }
        },
        { status: 403 }
      );
    }

    // Check if account is locked
    const lockStatus = await checkAccountLock(user.id, env);
    if (lockStatus.locked) {
      return Response.json(
        { 
          success: false, 
          error: 'Account locked due to multiple failed login attempts. Please try again later.',
          data: { 
            lockedUntil: new Date(Date.now() + (lockStatus.remainingSeconds * 1000)).toISOString(),
            remainingSeconds: lockStatus.remainingSeconds
          }
        },
        { status: 423 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(validatedData.password, user.password_hash);
    
    if (!passwordValid) {
      // Track failed login attempt
      const shouldLock = await trackFailedLogin(user.id, env);
      
      // Update failed attempts in database
      await env.DB.prepare(`
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE WHEN failed_login_attempts >= 4 THEN datetime('now', '+15 minutes') ELSE NULL END,
            updated_at = ?
        WHERE id = ?
      `).bind(new Date().toISOString(), user.id).run();

      if (shouldLock) {
        return Response.json(
          { 
            success: false, 
            error: 'Account locked due to multiple failed login attempts',
            data: { lockedUntil: new Date(Date.now() + (15 * 60 * 1000)).toISOString() }
          },
          { status: 423 }
        );
      }

      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Clear failed login attempts
    await clearFailedLogins(user.id, env);
    
    // Reset failed attempts in database
    await env.DB.prepare(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL, last_login = ?, updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), new Date().toISOString(), user.id).run();

    // Generate tokens
    const tokens = await generateTokens(user.id, env);

    return Response.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscription_tier,
          emailVerified: Boolean(user.email_verified)
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid login data' },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    );
  }
}

/**
 * Handles JWT token refresh
 */
export async function handleRefresh(request, env) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = refreshTokenSchema.parse(body);

    // Verify refresh token
    const payload = await verifyToken(validatedData.refreshToken, env);
    
    if (payload.type !== 'refresh') {
      return Response.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Verify user still exists and is active
    const user = await env.DB.prepare(`
      SELECT id, email_verified FROM users WHERE id = ?
    `).bind(payload.userId).first();

    if (!user || !user.email_verified) {
      return Response.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Generate new access token (refresh token remains the same)
    const accessToken = await generateTokens(payload.userId, env);

    return Response.json({
      success: true,
      data: {
        accessToken: accessToken.accessToken,
        expiresIn: accessToken.expiresIn
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return Response.json(
      { success: false, error: 'Invalid refresh token' },
      { status: 401 }
    );
  }
}

/**
 * Handles forgot password request
 */
export async function handleForgotPassword(request, env) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Check rate limit
    const rateLimitResult = await checkPasswordResetRateLimit(clientIP, env);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);

    // Find user by email (always return success for security)
    const user = await env.DB.prepare(`
      SELECT id, email FROM users WHERE email = ? AND email_verified = 1
    `).bind(validatedData.email).first();

    // Always return success response to prevent email enumeration
    const response = {
      success: true,
      data: {
        message: 'If account exists, password reset email has been sent',
        resetTokenExpiresIn: 86400 // 24 hours
      }
    };

    if (user) {
      // Generate reset token
      const resetToken = generateResetToken();
      const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with reset token
      await env.DB.prepare(`
        UPDATE users 
        SET reset_token = ?, reset_expires = ?, updated_at = ?
        WHERE id = ?
      `).bind(resetToken, resetExpires.toISOString(), new Date().toISOString(), user.id).run();

      // Send reset email
      await sendPasswordResetEmail(user.email, resetToken, env);
    }

    return Response.json(response);

  } catch (error) {
    console.error('Forgot password error:', error);
    
    if (error.name === 'ZodError') {
      return Response.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Password reset request failed' },
      { status: 500 }
    );
  }
}

/**
 * Handles password reset completion
 */
export async function handleResetPassword(request, env) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Find user by reset token
    const user = await env.DB.prepare(`
      SELECT id, email, reset_expires 
      FROM users 
      WHERE reset_token = ? AND reset_expires > datetime('now')
    `).bind(validatedData.token).first();

    if (!user) {
      return Response.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(validatedData.newPassword);

    // Update user password and clear reset token
    await env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?, reset_token = NULL, reset_expires = NULL, 
          failed_login_attempts = 0, locked_until = NULL, updated_at = ?
      WHERE id = ?
    `).bind(passwordHash, new Date().toISOString(), user.id).run();

    // Clear any existing failed login attempts
    await clearFailedLogins(user.id, env);

    return Response.json({
      success: true,
      data: {
        message: 'Password reset successfully',
        loginRequired: true
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'ZodError') {
      return Response.json(
        { 
          success: false, 
          error: 'Invalid password reset data',
          fieldErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Password reset failed' },
      { status: 500 }
    );
  }
}