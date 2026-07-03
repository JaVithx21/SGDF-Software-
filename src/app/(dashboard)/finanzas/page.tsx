import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FinanzasClient } from '@/components/finanzas/FinanzasClient';
import type {
    PagoData,
    ClienteDeudorData,
    PedidoPendienteData,
} from '@/components/finanzas/FinanzasClient';

export default async function FinanzasPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ─── Fetch paralelo (evitar waterfalls) ────────────────────────────

    const [pagosRes, clientesRes, pedidosRes] = await Promise.all([
        // 1. Pagos recientes con JOIN a clientes
        supabase
            .from('pagos')
            .select('id, pedido_id, monto, metodo_pago, referencia, nota, created_at, clientes(razon_social)')
            .order('created_at', { ascending: false }),

        // 2. Todos los clientes activos (para el select del formulario)
        supabase
            .from('clientes')
            .select('id, razon_social, saldo_pendiente')
            .eq('activo', true)
            .order('razon_social', { ascending: true }),

        // 3. Pedidos con saldo pendiente > 0
        supabase
            .from('pedidos')
            .select('id, cliente_id, total, saldo')
            .gt('saldo', 0)
            .order('created_at', { ascending: false }),
    ]);

    // ─── Transformar a datos serializables ─────────────────────────────

    const pagos: PagoData[] = (pagosRes.data ?? []).map((p) => ({
        id: p.id,
        cliente_razon_social:
            ((p.clientes as unknown) as { razon_social: string } | null)?.razon_social ?? 'Cliente eliminado',
        pedido_id: p.pedido_id,
        monto: Number(p.monto),
        metodo_pago: p.metodo_pago as PagoData['metodo_pago'],
        referencia: p.referencia,
        nota: p.nota,
        created_at: p.created_at,
    }));

    const clientesDeudores: ClienteDeudorData[] = (clientesRes.data ?? []).map((c) => ({
        id: c.id,
        razon_social: c.razon_social,
        saldo_pendiente: Number(c.saldo_pendiente),
    }));

    const pedidosPendientes: PedidoPendienteData[] = (pedidosRes.data ?? []).map((p) => ({
        id: p.id,
        cliente_id: p.cliente_id,
        total: Number(p.total),
        saldo: Number(p.saldo),
    }));

    // ─── Render: Server → Client boundary ──────────────────────────────

    return (
        <FinanzasClient
            pagos={pagos}
            clientesDeudores={clientesDeudores}
            pedidosPendientes={pedidosPendientes}
        />
    );
}
