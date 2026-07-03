import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════════════════
//  Ruta Raíz (/) — Enrutador Inteligente (Server Component)
//  No renderiza UI. Su única función es redirigir al usuario según
//  su estado de autenticación:
//    - Autenticado   → /dashboard
//    - No autenticado → /login
//
//  Esta es la segunda línea de defensa (el middleware ya redirige en Edge).
//  Si por alguna razón el middleware no intercepta, este Server Component
//  garantiza que jamás se muestre contenido en la ruta raíz.
// ═══════════════════════════════════════════════════════════════════════════

export default async function RootPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect('/dashboard');
    }

    redirect('/login');
}
