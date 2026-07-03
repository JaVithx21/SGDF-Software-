import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
//  CORS Helper — Restricción de orígenes para APIs expuestas (OWASP A05)
//
//  Solo permite peticiones cross-origin desde dominios autorizados.
//  Configura ALLOWED_CORS_ORIGINS en .env para agregar orígenes válidos.
// ═══════════════════════════════════════════════════════════════════════════

function getAllowedOrigins(): string[] {
    const envOrigins = process.env.ALLOWED_CORS_ORIGINS ?? '';
    const defaultOrigins = [
        'http://localhost:5678',           // n8n local
        'http://localhost:3000',           // Next.js local
    ];

    const customOrigins = envOrigins
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);

    return [...defaultOrigins, ...customOrigins];
}

/**
 * Agrega headers CORS restrictivos a una respuesta.
 * Solo permite orígenes de una whitelist configurada.
 */
export function setCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
    const allowedOrigins = getAllowedOrigins();

    if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Vary', 'Origin');
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'x-api-key, Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
}

/**
 * Handler para preflight requests (OPTIONS).
 * Usar en cada API Route que necesite CORS.
 */
export function handleCorsPreflightRequest(origin: string | null): NextResponse {
    const response = new NextResponse(null, { status: 204 });
    return setCorsHeaders(response, origin);
}
