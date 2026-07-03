import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NuevoPedidoClient } from '@/components/pedidos/NuevoPedidoClient';
import type { ProductoOption, ClienteOption } from '@/components/pedidos/NuevoPedidoClient';

export default async function NuevoPedidoPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ─── Fetch productos y clientes activos en paralelo ────────────────
    const [productosRes, clientesRes] = await Promise.all([
        supabase
            .from('productos')
            .select('id, nombre, precio_venta_actual, stock_actual, paquetes_por_caja')
            .eq('activo', true)
            .order('nombre', { ascending: true }),
        supabase
            .from('clientes')
            .select('id, razon_social')
            .eq('activo', true)
            .order('razon_social', { ascending: true }),
    ]);

    // ─── Transformar a datos serializables ─────────────────────────────

    const productos: ProductoOption[] = (productosRes.data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio_venta_actual: Number(p.precio_venta_actual),
        stock_actual: p.stock_actual,
        paquetes_por_caja: p.paquetes_por_caja,
    }));

    const clientes: ClienteOption[] = (clientesRes.data ?? []).map((c) => ({
        id: c.id,
        razon_social: c.razon_social,
    }));

    return <NuevoPedidoClient productos={productos} clientes={clientes} />;
}
