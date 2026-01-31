import bcrypt from 'bcryptjs';
import { randomBytes } from 'react-native-randombytes';

// Provide RNG fallback for React Native
bcrypt.setRandomFallback((len) => {
  return randomBytes(len);
});



/**
 * Hash a password
 */
export async function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password, hash) {
  if (typeof password !== 'string' || typeof hash !== 'string') {
    throw new Error('Invalid input types');
  }

  return bcrypt.compare(password, hash);
}
