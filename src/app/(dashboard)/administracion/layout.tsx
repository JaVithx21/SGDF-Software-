import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/constants/roles';

// ═══════════════════════════════════════════════════════════════════════════
//  Capa 3: Layout Guard — Server-Side RBAC para /administracion
//  Solo permite el acceso si el usuario autenticado tiene rol 'admin'.
//  Esta verificación ocurre en el servidor ANTES de renderizar cualquier
//  componente hijo, haciendo imposible bypassearla desde el cliente.
// ═══════════════════════════════════════════════════════════════════════════

export default async function AdministracionLayout({
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

    const userRole = (perfil?.rol as UserRole) ?? 'vendedor';

    if (userRole !== 'admin') {
        // Expulsar al dashboard con mensaje de acceso denegado
        redirect('/dashboard?error=acceso_denegado');
    }

    // 3. Solo admins llegan aquí — renderizar módulo
    return <>{children}</>;
}
