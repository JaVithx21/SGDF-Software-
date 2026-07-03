import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { AdministracionClient } from '@/components/administracion/AdministracionClient';
import type { ProveedorData, UsuarioData } from '@/components/administracion/AdministracionClient';

export default async function AdministracionPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ─── Fetch paralelo (evitar waterfalls) ────────────────────────────

    const [proveedoresRes, usuariosRes] = await Promise.all([
        supabase
            .from('proveedores')
            .select('id, nombre, rut, telefono, email, direccion, activo')
            .order('nombre', { ascending: true }),
        supabase
            .from('usuarios')
            .select('id, nombre, email, rol, created_at')
            .order('nombre', { ascending: true }),
    ]);

    // ─── Transformar a datos serializables ─────────────────────────────

    const proveedores: ProveedorData[] = (proveedoresRes.data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        rut: p.rut,
        telefono: p.telefono,
        email: p.email,
        direccion: p.direccion,
        activo: p.activo,
    }));

    const usuarios: UsuarioData[] = (usuariosRes.data ?? []).map((u) => ({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol as UsuarioData['rol'],
        created_at: u.created_at,
    }));

    // ─── Render: Server → Client boundary ──────────────────────────────

    return (
        <AdministracionClient
            proveedores={proveedores}
            usuarios={usuarios}
        />
    );
}
