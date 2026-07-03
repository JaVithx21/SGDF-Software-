'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/auth-guard';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ProveedorFormData {
    nombre: string;
    rut?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    activo: boolean;
}

type RolUsuario = 'admin' | 'gerente' | 'vendedor';

interface ActionResult {
    success: boolean;
    error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROVEEDORES
// ═══════════════════════════════════════════════════════════════════════════

export async function crearProveedor(data: ProveedorFormData): Promise<ActionResult> {
    const { error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('proveedores')
        .insert({
            nombre: data.nombre,
            rut: data.rut || null,
            telefono: data.telefono || null,
            email: data.email || null,
            direccion: data.direccion || null,
            activo: data.activo,
        });

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Ya existe un proveedor con ese RUT.' };
        }
        return { success: false, error: error.message };
    }

    revalidatePath('/administracion');
    revalidatePath('/movimientos');
    return { success: true };
}

export async function actualizarProveedor(
    id: number,
    data: ProveedorFormData
): Promise<ActionResult> {
    const { error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('proveedores')
        .update({
            nombre: data.nombre,
            rut: data.rut || null,
            telefono: data.telefono || null,
            email: data.email || null,
            direccion: data.direccion || null,
            activo: data.activo,
        })
        .eq('id', id);

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Ya existe un proveedor con ese RUT.' };
        }
        return { success: false, error: error.message };
    }

    revalidatePath('/administracion');
    revalidatePath('/movimientos');
    return { success: true };
}

export async function desactivarProveedor(id: number): Promise<ActionResult> {
    const { error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('proveedores')
        .update({ activo: false })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/administracion');
    return { success: true };
}

export async function reactivarProveedor(id: number): Promise<ActionResult> {
    const { error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('proveedores')
        .update({ activo: true })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/administracion');
    return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  USUARIOS (Roles) — SOLO ADMIN
// ═══════════════════════════════════════════════════════════════════════════

export async function cambiarRolUsuario(
    userId: string,
    nuevoRol: RolUsuario
): Promise<ActionResult> {
    // ⚠️ Operación crítica: SOLO admins pueden cambiar roles
    const { user, error: authError } = await requireAuth('admin');
    if (!user) return { success: false, error: authError ?? 'Sin autorización.' };

    // Prevenir que un admin se quite su propio rol
    if (user.id === userId && nuevoRol !== 'admin') {
        return { success: false, error: 'No puede cambiar su propio rol de administrador.' };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('usuarios')
        .update({ rol: nuevoRol })
        .eq('id', userId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/administracion');
    return { success: true };
}

export async function crearUsuario(data: { nombre: string; email: string; rol: RolUsuario }): Promise<ActionResult> {
    const { error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('usuarios')
        .insert({
            nombre: data.nombre,
            email: data.email,
            rol: data.rol,
        });

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Ya existe un usuario con este correo electrónico.' };
        }
        return { success: false, error: error.message };
    }

    revalidatePath('/administracion');
    return { success: true };
}

export async function actualizarUsuario(id: string, data: { nombre: string; email: string; rol: RolUsuario }): Promise<ActionResult> {
    const { error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('usuarios')
        .update({
            nombre: data.nombre,
            email: data.email,
            rol: data.rol,
        })
        .eq('id', id);

    if (error) {
        if (error.code === '23505') {
            return { success: false, error: 'Ya existe otro usuario con este correo electrónico.' };
        }
        return { success: false, error: error.message };
    }

    revalidatePath('/administracion');
    return { success: true };
}

export async function eliminarUsuario(id: string): Promise<ActionResult> {
    const { user, error: authError } = await requireAuth('admin');
    if (authError) return { success: false, error: authError };

    if (user?.id === id) {
        return { success: false, error: 'No puede eliminar su propio usuario administrador.' };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/administracion');
    return { success: true };
}
