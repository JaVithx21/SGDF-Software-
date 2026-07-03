import type { LoginCredentials } from '@/types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
    return password.length >= MIN_PASSWORD_LENGTH;
}

export function validateLoginCredentials(credentials: LoginCredentials): boolean {
    return isValidEmail(credentials.email) && isValidPassword(credentials.password);
}
