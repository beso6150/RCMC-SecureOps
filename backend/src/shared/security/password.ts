import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';
import { ValidationError } from '../errors/index.js';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function assertStrongPassword(password: string): void {
  if (!PASSWORD_REGEX.test(password)) {
    throw new ValidationError(
      'Password must be at least 10 characters and include upper, lower, digit, and special character',
    );
  }
}
