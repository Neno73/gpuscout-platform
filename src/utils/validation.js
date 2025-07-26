import { z } from 'zod';

/**
 * Validates email format using Zod schema
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailSchema = z.string().email();
  
  try {
    emailSchema.parse(email);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates password strength according to security requirements
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with isValid, strength, and feedback
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      strength: 'weak',
      feedback: ['Password is required']
    };
  }

  const feedback = [];
  let score = 0;

  // Length check (minimum 8 characters)
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[@$!%*?&]/.test(password)) {
    feedback.push('Password must contain at least one special character (@$!%*?&)');
  } else {
    score += 1;
  }

  // Determine strength based on score
  let strength;
  if (score < 3) {
    strength = 'weak';
  } else if (score < 5) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  const isValid = score === 5; // All criteria must be met

  return {
    isValid,
    strength,
    feedback
  };
}

/**
 * Zod schema for user registration
 */
export const registrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]$/,
           'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.enum(['en', 'es', 'fr', 'de']).default('en'),
  gdprConsent: z.boolean().refine(val => val === true, 'GDPR consent required'),
  subscriptionTier: z.enum(['free', 'individual', 'professional', 'enterprise']).default('free')
});

/**
 * Zod schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Zod schema for email verification
 */
export const emailVerificationSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

/**
 * Zod schema for password reset request
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

/**
 * Zod schema for password reset completion
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]$/,
           'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

/**
 * Zod schema for JWT refresh
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});