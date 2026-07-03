import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') ?? '/dashboard';
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Si Supabase devolvió un error (p.ej. trigger de lista blanca rechazó el email)
    if (error || errorDescription) {
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set(
            'error_description',
            errorDescription || 'Error de autenticación con Google.'
        );
        return NextResponse.redirect(loginUrl);
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Flujo de recuperación de contraseña (token_hash + type=recovery)
    if (token_hash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'recovery' | 'signup' | 'email',
        });

        if (!verifyError) {
            return NextResponse.redirect(`${origin}${next}`);
        }

        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set(
            'error_description',
            verifyError.message || 'El enlace de recuperación ha expirado o es inválido.'
        );
        return NextResponse.redirect(loginUrl);
    }

    // Intercambiar código por sesión (PKCE flow - OAuth/Magic Link)
    if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError) {
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            }

            // OWASP A01: Validar x-forwarded-host contra whitelist para prevenir open redirect
            const ALLOWED_HOSTS = (process.env.ALLOWED_REDIRECT_HOSTS ?? '')
                .split(',')
                .map(h => h.trim())
                .filter(Boolean);

            const forwardedHost = request.headers.get('x-forwarded-host');

            if (forwardedHost && ALLOWED_HOSTS.includes(forwardedHost)) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            }

            // Fallback seguro: usar origin de la propia request
            return NextResponse.redirect(`${origin}${next}`);
        }

        // Si el exchange falló, redirigir con error
        const loginUrl = new URL('/login', origin);
        loginUrl.searchParams.set(
            'error_description',
            exchangeError.message || 'Error al procesar la autenticación.'
        );
        return NextResponse.redirect(loginUrl);
    }

    // Caso fallback: sin código ni error
    return NextResponse.redirect(`${origin}/login`);
}

