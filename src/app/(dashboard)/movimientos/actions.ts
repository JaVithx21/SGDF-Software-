'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/auth-guard';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface MovimientoFormData {
    producto_id: number;
    proveedor_id: number | null;
    cantidad: number;
    costo_unitario: number;
    tipo: 'entrada' | 'salida';
    nota?: string;
    pedido_id?: number | null;
}

interface ActionResult {
    success: boolean;
    error?: string;
}

// ─── CREAR MOVIMIENTO ───────────────────────────────────────────────────────
// El trigger `trg_actualizar_stock` → `actualizar_stock_producto`
// se encarga de actualizar automáticamente el stock del producto.
// `costo_total` es una columna generada (cantidad * costo_unitario).

export async function registrarMovimiento(data: MovimientoFormData): Promise<ActionResult> {
    const { user, error: authError } = await requireAuth('gerente');
    if (!user) return { success: false, error: authError ?? 'Sin autorización.' };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Validación: si es salida, verificar stock disponible
    if (data.tipo === 'salida') {
        const { data: producto } = await supabase
            .from('productos')
            .select('stock_actual, nombre')
            .eq('id', data.producto_id)
            .single();

        if (producto && data.cantidad > producto.stock_actual) {
            return {
                success: false,
                error: `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_actual} paquetes.`,
            };
        }
    }

    const { error } = await supabase
        .from('movimientos_inventario')
        .insert({
            producto_id: data.producto_id,
            proveedor_id: data.tipo === 'entrada' ? data.proveedor_id : null,
            cantidad: data.cantidad,
            costo_unitario: data.costo_unitario,
            tipo: data.tipo,
            nota: data.nota || null,
            pedido_id: data.pedido_id || null,
            creado_por: user?.id || null,
        });

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath('/movimientos');
    revalidatePath('/inventario');
    revalidatePath('/dashboard');
    return { success: true };
}
