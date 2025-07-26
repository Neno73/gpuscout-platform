import bcrypt from 'bcryptjs';

/**
 * Hashes a password using bcrypt with 12 salt rounds
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  const saltRounds = 12; // 12 rounds for high security as per 2024 standards
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verifies a password against its hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Hashed password to compare against
 * @returns {Promise<boolean>} - True if password matches hash
 */
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Checks if a password hash uses the recommended salt rounds
 * @param {string} hash - Bcrypt hash to check
 * @returns {boolean} - True if hash uses 12 salt rounds
 */
export function isSecureHash(hash) {
  // bcrypt format: $2b$rounds$salt$hash
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  const parts = hash.split('$');
  if (parts.length !== 4) {
    return false;
  }
  
  const rounds = parseInt(parts[2], 10);
  return rounds === 12;
}

/**
 * Generates a secure random password for testing or temporary use
 * @param {number} length - Password length (minimum 12)
 * @returns {string} - Secure random password
 */
export function generateSecurePassword(length = 16) {
  if (length < 12) {
    throw new Error('Password length must be at least 12 characters');
  }
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}