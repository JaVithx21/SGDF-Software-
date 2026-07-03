export const AUTH_ROUTES = {
    login: '/login',
    dashboard: '/dashboard',
} as const;

export const AUTH_ERROR_MESSAGES = {
    invalidCredentials: 'Credenciales inválidas. Verifica tu correo y contraseña.',
    emailNotConfirmed: 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.',
    tooManyRequests: 'Demasiados intentos. Espera un momento antes de volver a intentar.',
    invalidForm: 'Los datos ingresados no son válidos.',
    unexpected: 'Ocurrió un error inesperado. Intenta de nuevo.',
} as const;

export const AUTH_RATE_LIMIT = {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
} as const;
