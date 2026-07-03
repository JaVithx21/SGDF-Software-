import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/constants/roles';

// ═══════════════════════════════════════════════════════════════════════════
//  Layout Guard — Server-Side RBAC para /users (OWASP A01)
//  Solo permite el acceso si el usuario autenticado tiene rol 'admin'.
//  Esta verificación ocurre en el servidor ANTES de renderizar cualquier
//  componente hijo, haciendo imposible bypassearla desde el cliente.
// ═══════════════════════════════════════════════════════════════════════════

export default async function UsersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // 1. Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Verificar autorización (rol admin)
    const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', user.id)
        .single();

    const userRole = (perfil?.rol as UserRole) ?? null;

    if (userRole !== 'admin') {
        // Expulsar al dashboard con mensaje de acceso denegado
        redirect('/dashboard?error=acceso_denegado');
    }

    // 3. Solo admins llegan aquí — renderizar módulo
    return <>{children}</>;
}
