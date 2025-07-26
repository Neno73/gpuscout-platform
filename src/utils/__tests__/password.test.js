import { 
  hashPassword, 
  verifyPassword, 
  isSecureHash,
  generateSecurePassword
} from '../password.js';

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

  test('generates different hashes for same password', async () => {
    const password = 'SecurePass123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2); // Due to different salts
    
    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});

describe('Hash Security Validation', () => {
  test('identifies secure hashes with 12 rounds', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    expect(isSecureHash(hash)).toBe(true);
  });

  test('rejects hashes with incorrect rounds', () => {
    const weakHash = '$2b$08$someweakhash';
    expect(isSecureHash(weakHash)).toBe(false);
  });

  test('rejects invalid hash formats', () => {
    expect(isSecureHash('invalid-hash')).toBe(false);
    expect(isSecureHash('')).toBe(false);
    expect(isSecureHash(null)).toBe(false);
    expect(isSecureHash(undefined)).toBe(false);
    expect(isSecureHash('$2b$12$')).toBe(false); // Incomplete hash
  });

  test('validates proper bcrypt format', () => {
    const validHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Ilc4YGxF7d8W3r1iK';
    expect(isSecureHash(validHash)).toBe(true);
  });
});

describe('Secure Password Generation', () => {
  test('generates passwords with default length', () => {
    const password = generateSecurePassword();
    
    expect(password).toBeDefined();
    expect(typeof password).toBe('string');
    expect(password.length).toBe(16); // Default length
  });

  test('generates passwords with custom length', () => {
    const password = generateSecurePassword(20);
    
    expect(password.length).toBe(20);
  });

  test('rejects length less than 12', () => {
    expect(() => generateSecurePassword(8)).toThrow('Password length must be at least 12 characters');
    expect(() => generateSecurePassword(11)).toThrow('Password length must be at least 12 characters');
  });

  test('generated passwords meet complexity requirements', () => {
    const password = generateSecurePassword(16);
    
    // Should contain at least one of each character type
    expect(/[A-Z]/.test(password)).toBe(true); // Uppercase
    expect(/[a-z]/.test(password)).toBe(true); // Lowercase
    expect(/\d/.test(password)).toBe(true);    // Number
    expect(/[@$!%*?&]/.test(password)).toBe(true); // Special character
  });

  test('generates unique passwords', () => {
    const password1 = generateSecurePassword();
    const password2 = generateSecurePassword();
    
    expect(password1).not.toBe(password2);
  });

  test('generated passwords are valid for our validation', () => {
    // Import the validation function to test compatibility
    const { validatePasswordStrength } = require('../validation.js');
    
    const password = generateSecurePassword();
    const result = validatePasswordStrength(password);
    
    expect(result.isValid).toBe(true);
    expect(result.strength).toBe('strong');
  });
});