import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Valida que la petición tenga la API Key correcta en el header x-api-key.
 * Usa comparación constant-time para prevenir timing attacks (OWASP A02).
 * Retorna null si es válida, o un NextResponse con error 401 si no lo es.
 */
export function validateChatbotApiKey(request: NextRequest): NextResponse | null {
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.CHATBOT_API_KEY;

    if (!apiKey || !expectedKey) {
        return NextResponse.json(
            { error: 'No autorizado. API Key inválida o faltante.' },
            { status: 401 }
        );
    }

    // OWASP A02: Comparación constant-time para prevenir timing attacks
    const apiKeyBuffer = Buffer.from(apiKey);
    const expectedBuffer = Buffer.from(expectedKey);

    if (
        apiKeyBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(apiKeyBuffer, expectedBuffer)
    ) {
        return NextResponse.json(
            { error: 'No autorizado. API Key inválida o faltante.' },
            { status: 401 }
        );
    }

    return null; // válido
}
