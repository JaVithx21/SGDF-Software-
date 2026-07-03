import 'server-only';

import { AUTH_RATE_LIMIT } from '@/constants/auth';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// ═══════════════════════════════════════════════════════════════════════════
//  Rate Limiter con respaldo en Supabase (OWASP A07)
//
//  Estrategia híbrida:
//  1. Cache en memoria para respuesta rápida y reducir consultas a BD
//  2. Supabase como fuente de verdad persistente y compartida entre instancias
//
//  La tabla `rate_limit_attempts` en Supabase almacena los contadores.
//  Si la tabla no existe, el rate limiter degrada a modo en-memoria
//  para no bloquear el flujo de login.
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitStatus {
    allowed: boolean;
    retryAfterSeconds?: number;
}

// ── Cache en memoria (fallback y capa rápida) ───────────────────────────

interface AttemptRecord {
    count: number;
    resetAt: number;
}

// En desarrollo local (Next.js), usar globalThis evita que la memoria 
// se borre en cada recarga del servidor (hot reload).
const globalForRateLimit = globalThis as unknown as {
    rateLimitMemoryCache: Map<string, AttemptRecord> | undefined;
};

const memoryCache = globalForRateLimit.rateLimitMemoryCache ?? new Map<string, AttemptRecord>();

if (process.env.NODE_ENV !== 'production') {
    globalForRateLimit.rateLimitMemoryCache = memoryCache;
}

function cleanupExpired(now: number): void {
    for (const [key, value] of memoryCache.entries()) {
        if (value.resetAt <= now) {
            memoryCache.delete(key);
        }
    }
}

// ── Rate Limiter Principal (con Supabase) ───────────────────────────────

export async function consumeLoginAttempt(identifier: string): Promise<RateLimitStatus> {
    const now = Date.now();
    cleanupExpired(now);

    try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        const windowStart = new Date(now - AUTH_RATE_LIMIT.windowMs).toISOString();

        // Contar intentos recientes en la ventana de tiempo
        const { count, error: countError } = await supabase
            .from('rate_limit_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('identifier', identifier)
            .gte('created_at', windowStart);

        if (countError) {
            // Si la tabla no existe o hay error, degradar a modo en-memoria
            console.warn('[Rate Limit] Error consultando Supabase, usando fallback en memoria:', countError.message);
            return consumeLoginAttemptMemory(identifier, now);
        }

        const currentCount = count ?? 0;

        if (currentCount >= AUTH_RATE_LIMIT.maxAttempts) {
            // Calcular tiempo restante hasta que expire la ventana
            const retryAfterSeconds = Math.ceil(AUTH_RATE_LIMIT.windowMs / 1000);
            return { allowed: false, retryAfterSeconds };
        }

        // Registrar el intento
        await supabase
            .from('rate_limit_attempts')
            .insert({
                identifier,
                created_at: new Date(now).toISOString(),
            });

        // Sincronizar cache en memoria
        const existing = memoryCache.get(identifier);
        if (existing) {
            existing.count = currentCount + 1;
        } else {
            memoryCache.set(identifier, {
                count: currentCount + 1,
                resetAt: now + AUTH_RATE_LIMIT.windowMs,
            });
        }

        return { allowed: true };

    } catch (err) {
        // Fallback completo a memoria si Supabase falla
        console.warn('[Rate Limit] Fallback a modo en-memoria:', err);
        return consumeLoginAttemptMemory(identifier, now);
    }
}

export async function resetLoginAttempts(identifier: string): Promise<void> {
    memoryCache.delete(identifier);

    try {
        const cookieStore = await cookies();
        const supabase = createClient(cookieStore);

        await supabase
            .from('rate_limit_attempts')
            .delete()
            .eq('identifier', identifier);
    } catch {
        // Si falla la limpieza en Supabase, no bloquear el flujo
        console.warn('[Rate Limit] Error limpiando intentos en Supabase');
    }
}

// ── Fallback en memoria (cuando Supabase no está disponible) ────────────

function consumeLoginAttemptMemory(identifier: string, now: number): RateLimitStatus {
    const existing = memoryCache.get(identifier);

    if (!existing) {
        memoryCache.set(identifier, {
            count: 1,
            resetAt: now + AUTH_RATE_LIMIT.windowMs,
        });
        return { allowed: true };
    }

    if (existing.count >= AUTH_RATE_LIMIT.maxAttempts) {
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
        };
    }

    existing.count += 1;
    memoryCache.set(identifier, existing);
    return { allowed: true };
}
