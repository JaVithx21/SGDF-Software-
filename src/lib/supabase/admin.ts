import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente admin de Supabase para uso exclusivo en API Routes del chatbot.
 * Usa la service_role key (server-side only) para leer datos sin sesión de usuario.
 * NUNCA importar este archivo desde componentes del lado del cliente.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Faltan variables de entorno para el cliente admin de Supabase');
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
