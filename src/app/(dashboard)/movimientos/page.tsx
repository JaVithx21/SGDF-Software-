import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { MovimientosClient } from '@/components/movimientos/MovimientosClient';
import type {
    MovimientoData,
    ProductoOption,
    ProveedorOption,
} from '@/components/movimientos/MovimientosClient';

export default async function MovimientosPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ─── Fetch en paralelo (evitar waterfalls) ─────────────────────────
    const [movimientosRes, productosRes, proveedoresRes] = await Promise.all([
        supabase
            .from('movimientos_inventario')
            .select(
                'id, cantidad, costo_unitario, costo_total, tipo, nota, pedido_id, created_at, productos(nombre, varas_por_paquete), proveedores(nombre), usuarios:creado_por(nombre)'
            )
            .order('created_at', { ascending: false }),
        supabase
            .from('productos')
            .select('id, nombre, stock_actual, maneja_cajas, paquetes_por_caja')
            .eq('activo', true)
            .order('nombre', { ascending: true }),
        supabase
            .from('proveedores')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre', { ascending: true }),
    ]);

    // ─── Transformar a datos serializables (RSC boundary rule) ─────────

    const movimientos: MovimientoData[] = (movimientosRes.data ?? []).map((m) => ({
        id: m.id,
        producto_nombre:
            ((m.productos as unknown) as { nombre: string } | null)?.nombre ?? 'Producto eliminado',
        producto_varas:
            ((m.productos as unknown) as { varas_por_paquete: number } | null)?.varas_por_paquete ?? 0,
        proveedor_nombre:
            ((m.proveedores as unknown) as { nombre: string } | null)?.nombre ?? null,
        cantidad: m.cantidad,
        costo_unitario: Number(m.costo_unitario),
        costo_total: Number(m.costo_total),
        tipo: m.tipo as 'entrada' | 'salida',
        nota: m.nota,
        pedido_id: m.pedido_id,
        creado_por_nombre:
            ((m.usuarios as unknown) as { nombre: string } | null)?.nombre ?? null,
        created_at: m.created_at, // ISO string — serializable
    }));

    const productos: ProductoOption[] = (productosRes.data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        stock_actual: p.stock_actual,
        maneja_cajas: p.maneja_cajas ?? false,
        paquetes_por_caja: p.paquetes_por_caja ?? 1,
    }));

    const proveedores: ProveedorOption[] = (proveedoresRes.data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
    }));

    // ─── Render: Server → Client boundary ──────────────────────────────

    return (
        <MovimientosClient
            movimientos={movimientos}
            productos={productos}
            proveedores={proveedores}
        />
    );
}
