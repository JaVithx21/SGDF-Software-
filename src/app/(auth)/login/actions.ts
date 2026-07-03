'use server';

import { AUTH_ERROR_MESSAGES, AUTH_ROUTES } from '@/constants/auth';
import { consumeLoginAttempt, resetLoginAttempts } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';
import type { LoginActionResult } from '@/types/auth';
import { normalizeEmail, validateLoginCredentials } from '@/validators/auth';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function getRequestIdentifier(email: string, forwardedFor: string | null): string {
    const ip = forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
    return `${email}:${ip}`;
}

export async function login(formData: FormData): Promise<LoginActionResult | void> {
    const rawEmail = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const email = normalizeEmail(rawEmail);

    if (!validateLoginCredentials({ email, password })) {
        return { error: AUTH_ERROR_MESSAGES.invalidForm };
    }

    const headersList = await headers();
    const identifier = getRequestIdentifier(email, headersList.get('x-forwarded-for'));
    const rateLimitStatus = await consumeLoginAttempt(identifier);

    if (!rateLimitStatus.allowed) {
        return { error: AUTH_ERROR_MESSAGES.tooManyRequests };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        if (error.message === 'Email not confirmed') {
            return { error: AUTH_ERROR_MESSAGES.emailNotConfirmed };
        }

        return { error: AUTH_ERROR_MESSAGES.invalidCredentials };
    }

    // Token management and testing comments removed

    await resetLoginAttempts(identifier);
    redirect(AUTH_ROUTES.dashboard);
}
