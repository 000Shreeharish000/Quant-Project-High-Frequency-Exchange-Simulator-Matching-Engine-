import bcrypt from "bcrypt";
import config from "../config/index.js";

const SALT_ROUNDS = Math.max(10, config.auth.bcryptRounds);

function withPepper(password: string): string {
  return `${password}${config.auth.passwordPepper}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(withPepper(password), SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(withPepper(password), hash);
}

export function isStrongPassword(password: string): boolean {
  if (password.length < config.auth.minPasswordLength) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}
