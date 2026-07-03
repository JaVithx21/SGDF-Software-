import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { UserRoleProvider } from '@/contexts/UserRoleContext';
import type { UserRole } from '@/constants/roles';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Obtener perfil del usuario (nombre + rol)
    const { data: perfil } = await supabase
        .from('usuarios')
        .select('nombre, rol')
        .eq('id', user.id)
        .single();

    // OWASP A01: Fail-closed — si no hay perfil válido, denegar acceso
    if (!perfil?.rol) {
        redirect('/login?error_description=Tu+cuenta+no+tiene+un+perfil+asignado.+Contacta+al+administrador.');
    }

    const userName = perfil.nombre || user.email || 'Usuario';
    const userRole = perfil.rol as UserRole;

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar — Fixed */}
            <Sidebar userRole={userRole} userName={userName} />

            {/* Main Content — Offset by sidebar width */}
            <div className="flex-1 ml-70 flex flex-col">
                {/* Topbar — Sticky */}
                <Topbar userName={userName} userRole={userRole} />

                {/* Page Content — UserRoleProvider wraps all modules */}
                <main className="flex-1 p-8">
                    <UserRoleProvider role={userRole}>
                        {children}
                    </UserRoleProvider>
                </main>
            </div>
        </div>
    );
}
