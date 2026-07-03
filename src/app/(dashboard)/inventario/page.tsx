import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { InventarioClient } from '@/components/inventario/InventarioClient';
import type { ProductoData, CategoriaData } from '@/components/inventario/InventarioClient';

export default async function InventarioPage(
    props: {
        searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
    }
) {
    const searchParams = await props.searchParams;
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const page = Number(searchParams?.page) || 1;
    const pageSize = 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const query = typeof searchParams?.query === 'string' ? searchParams.query : '';
    const categoria = typeof searchParams?.categoria === 'string' ? searchParams.categoria : '';

    // ─── Fetch productos (con paginación y filtros) ─────────────────────
    let supabaseQuery = supabase
        .from('productos')
        .select('id, nombre, descripcion, categoria_id, varas_por_paquete, maneja_cajas, paquetes_por_caja, stock_actual, stock_minimo, precio_venta_actual, activo, categorias!inner(nombre)', { count: 'exact' });

    if (query) {
        supabaseQuery = supabaseQuery.ilike('nombre', `%${query}%`);
    }
    if (categoria) {
        supabaseQuery = supabaseQuery.eq('categorias.nombre', categoria);
    }

    const [productosRes, categoriasRes] = await Promise.all([
        supabaseQuery
            .order('id', { ascending: false })
            .range(from, to),
        supabase
            .from('categorias')
            .select('id, nombre, descripcion, productos(id)')
            .order('nombre', { ascending: true }),
    ]);

    const totalRegistros = productosRes.count ?? 0;
    const totalPages = Math.ceil(totalRegistros / pageSize);

    // ─── Transformar a datos serializables ─────────

    const productos: ProductoData[] = (productosRes.data ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria_id: p.categoria_id,
        categoria_nombre:
            ((p.categorias as unknown) as { nombre: string } | null)?.nombre ?? null,
        varas_por_paquete: p.varas_por_paquete,
        maneja_cajas: p.maneja_cajas ?? false,
        paquetes_por_caja: p.paquetes_por_caja,
        stock_actual: p.stock_actual,
        stock_minimo: p.stock_minimo,
        precio_venta_actual: Number(p.precio_venta_actual),
        activo: p.activo,
    }));

    const categorias: CategoriaData[] = (categoriasRes.data ?? []).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        productos_count: Array.isArray(c.productos) ? c.productos.length : 0,
    }));

    return (
        <InventarioClient 
            productos={productos} 
            categorias={categorias} 
            totalPages={totalPages}
            currentPage={page}
            totalRegistros={totalRegistros}
        />
    );
}
