import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { PedidosClient } from '@/components/pedidos/PedidosClient';
import type { PedidoData } from '@/components/pedidos/PedidosClient';

export default async function PedidosPage(
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
    const estado = typeof searchParams?.estado === 'string' ? searchParams.estado : '';

    // ─── Fetch pedidos con JOIN a clientes ─────────────────────────────
    let supabaseQuery = supabase
        .from('pedidos')
        .select('id, cliente_id, created_at, estado, total, saldo, nota, clientes!inner(razon_social, rut)', { count: 'exact' });

    if (query) {
        // If query is a number, we can search by ID, else by razon social
        if (!isNaN(Number(query))) {
            supabaseQuery = supabaseQuery.or(`id.eq.${Number(query)},clientes.razon_social.ilike.%${query}%`);
        } else {
            supabaseQuery = supabaseQuery.ilike('clientes.razon_social', `%${query}%`);
        }
    }
    if (estado) {
        supabaseQuery = supabaseQuery.eq('estado', estado);
    }

    const { data: pedidosRaw, count } = await supabaseQuery
        .order('created_at', { ascending: false })
        .range(from, to);

    const totalRegistros = count ?? 0;
    const totalPages = Math.ceil(totalRegistros / pageSize);

    // ─── Transformar a datos serializables ─────────────────────────────

    const pedidos: PedidoData[] = (pedidosRaw ?? []).map((p) => ({
        id: p.id,
        cliente_id: p.cliente_id,
        created_at: p.created_at,
        cliente_razon_social:
            ((p.clientes as unknown) as { razon_social: string } | null)?.razon_social ?? 'Cliente eliminado',
        cliente_rut:
            ((p.clientes as unknown) as { rut: string } | null)?.rut ?? '',
        estado: p.estado as PedidoData['estado'],
        total: Number(p.total),
        saldo: Number(p.saldo),
        nota: p.nota,
    }));

    return (
        <PedidosClient 
            pedidos={pedidos} 
            totalPages={totalPages}
            currentPage={page}
            totalRegistros={totalRegistros}
        />
    );
}
