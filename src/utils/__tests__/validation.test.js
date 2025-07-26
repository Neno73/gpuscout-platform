import { 
  validateEmail, 
  validatePasswordStrength, 
  registrationSchema,
  loginSchema 
} from '../validation.js';

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
    expect(validateEmail('a'.repeat(255) + '@example.com')).toBe(false); // Too long for most systems
  });
});

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
    expect(result.feedback).toEqual(expect.arrayContaining([
      expect.stringContaining('at least 8 characters'),
      expect.stringContaining('uppercase letter'),
      expect.stringContaining('number'), 
      expect.stringContaining('special character')
    ]));
  });

  test('handles edge cases for password validation', () => {
    expect(validatePasswordStrength('')).toEqual({
      isValid: false,
      strength: 'weak',
      feedback: ['Password is required']
    });

    expect(validatePasswordStrength(null)).toEqual({
      isValid: false,
      strength: 'weak', 
      feedback: ['Password is required']
    });

    expect(validatePasswordStrength(undefined)).toEqual({
      isValid: false,
      strength: 'weak',
      feedback: ['Password is required']
    });
  });
});

describe('Registration Schema Validation', () => {
  test('accepts valid registration data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      timezone: 'America/New_York',
      language: 'en',
      gdprConsent: true,
      subscriptionTier: 'free'
    };

    expect(() => registrationSchema.parse(validData)).not.toThrow();
  });

  test('rejects invalid registration data', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'weak',
      name: '', // Empty name
      timezone: '',
      language: 'invalid-lang',
      gdprConsent: false,
      subscriptionTier: 'invalid-tier'
    };

    expect(() => registrationSchema.parse(invalidData)).toThrow();
  });

  test('provides specific error messages', () => {
    const invalidData = {
      email: 'invalid-email',
      password: '123', // Too short and doesn't meet complexity
      name: '',
      timezone: '',
      gdprConsent: false
    };

    try {
      registrationSchema.parse(invalidData);
    } catch (error) {
      expect(error.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: 'Invalid email format'
          }),
          expect.objectContaining({
            path: ['password'],
            message: expect.stringContaining('8 characters')
          }),
          expect.objectContaining({
            path: ['name'],
            message: 'Name is required'
          }),
          expect.objectContaining({
            path: ['gdprConsent'],
            message: 'GDPR consent required'
          })
        ])
      );
    }
  });
});

describe('Login Schema Validation', () => {
  test('accepts valid login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'any-password',
      rememberMe: true
    };

    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  test('accepts login data without rememberMe', () => {
    const validData = {
      email: 'test@example.com', 
      password: 'any-password'
    };

    const result = loginSchema.parse(validData);
    expect(result.rememberMe).toBe(false); // Default value
  });

  test('rejects invalid login data', () => {
    const invalidData = {
      email: 'invalid-email',
      password: '' // Empty password
    };

    expect(() => loginSchema.parse(invalidData)).toThrow();
  });
});