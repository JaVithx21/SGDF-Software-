import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { UserRole } from '@/constants/roles';
import type { User } from '@supabase/supabase-js';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface AuthSuccess {
    user: User;
    error: null;
}

interface AuthFailure {
    user: null;
    error: string;
}

type AuthResult = AuthSuccess | AuthFailure;

// ─── Jerarquía de Roles ─────────────────────────────────────────────────────
// admin (3) > gerente (2) > vendedor (1)

const ROLE_HIERARCHY: Record<UserRole, number> = {
    admin: 3,
    gerente: 2,
    vendedor: 1,
};

// ─── Guard Principal ────────────────────────────────────────────────────────
// Verifica autenticación y opcionalmente autorización por rol mínimo.
// Uso:
//   const { user, error } = await requireAuth();          // Solo auth
//   const { user, error } = await requireAuth('gerente'); // Auth + rol mínimo
//   const { user, error } = await requireAuth('admin');   // Solo admin

export async function requireAuth(minimumRole?: UserRole): Promise<AuthResult> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, error: 'No autenticado. Inicie sesión para continuar.' };
    }

    // Si no se pide rol mínimo, con estar autenticado basta
    if (!minimumRole) {
        return { user, error: null };
    }

    // Verificar rol del usuario
    const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single();

    // OWASP A01: Fail-closed — si no hay perfil válido, denegar acceso
    if (!perfil?.rol) {
        return {
            user: null,
            error: 'Su cuenta no tiene un perfil de rol asignado. Contacte al administrador.',
        };
    }

    const userRole = perfil.rol as UserRole;
    const userLevel = ROLE_HIERARCHY[userRole];
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
        return {
            user: null,
            error: `Sin autorización. Se requiere rol "${minimumRole}" o superior.`,
        };
    }

    return { user, error: null };
}
