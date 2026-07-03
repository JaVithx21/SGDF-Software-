import { AUTH_ROUTES } from '@/constants/auth';
import { ROLE_PROTECTED_ROUTES } from '@/constants/roles';
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const updateSession = async (request: NextRequest) => {
    // 1. Generar nonce para CSP (OWASP A05) ANTES de procesar la respuesta
    const isDev = process.env.NODE_ENV === 'development';
    const nonce = isDev ? '' : Buffer.from(crypto.randomUUID()).toString('base64');

    // 2. Pasar el nonce en los headers de la request para que Next.js lo lea
    const requestHeaders = new Headers(request.headers);
    if (!isDev && nonce) {
        requestHeaders.set('x-nonce', nonce);
    }

    // 3. Crear la respuesta con los headers actualizados
    let supabaseResponse = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    const supabase = createServerClient(
        supabaseUrl!,
        supabaseKey!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: requestHeaders,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        },
    );

    // Refreshing the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Rutas públicas que no requieren autenticación
    const publicRoutes = [AUTH_ROUTES.login, '/auth/callback', '/recover', '/update-password'];
    const isPublicRoute = publicRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );

    // ─── Redirección inteligente de la ruta raíz (/) ────────────────────
    if (request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = user ? AUTH_ROUTES.dashboard : AUTH_ROUTES.login;
        return NextResponse.redirect(url);
    }

    // Si no hay usuario autenticado y la ruta no es pública, redirigir a /login
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = AUTH_ROUTES.login;
        return NextResponse.redirect(url);
    }

    // Si hay usuario autenticado y está en /login, redirigir a /dashboard
    if (user && request.nextUrl.pathname.startsWith(AUTH_ROUTES.login)) {
        const url = request.nextUrl.clone();
        url.pathname = AUTH_ROUTES.dashboard;
        return NextResponse.redirect(url);
    }

    // --- Protección de rutas por rol (Zero Trust: fail-closed) ---
    if (user) {
        const { data: perfil } = await supabase
            .from('usuarios')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (!perfil?.rol) {
            const url = request.nextUrl.clone();
            url.pathname = AUTH_ROUTES.login;
            url.searchParams.set(
                'error_description',
                'Tu cuenta no tiene un perfil asignado. Contacta al administrador.'
            );
            return NextResponse.redirect(url);
        }

        const userRole = perfil.rol;

        const protectedRoute = ROLE_PROTECTED_ROUTES.find((route) =>
            request.nextUrl.pathname.startsWith(route.prefix)
        );

        if (protectedRoute && !protectedRoute.roles.includes(userRole)) {
            const url = request.nextUrl.clone();
            url.pathname = AUTH_ROUTES.dashboard;
            return NextResponse.redirect(url);
        }
    }

    // ─── Cabeceras de Seguridad HTTP (OWASP A05) ────────────────────────
    const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : '';

    const scriptSrc = isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline' https://accounts.google.com";

    const cspHeader = [
        "default-src 'self'",
        scriptSrc,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' https://fonts.gstatic.com",
        `connect-src 'self' ${supabaseOrigin} https://accounts.google.com https://oauth2.googleapis.com`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https://accounts.google.com",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
    ].join('; ');

    supabaseResponse.headers.set('Content-Security-Policy', cspHeader);
    supabaseResponse.headers.set('X-Frame-Options', 'DENY');
    supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
    supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    supabaseResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    supabaseResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return supabaseResponse;
};