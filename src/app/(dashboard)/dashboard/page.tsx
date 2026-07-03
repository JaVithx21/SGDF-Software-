import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ExportReporteButton } from '@/components/dashboard/ExportReporteButton';
import { TimeFilter, type TimeFilterType } from '@/components/dashboard/TimeFilter';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { SupabaseClient } from '@supabase/supabase-js';
import {
    DollarSign,
    ArrowLeftRight,
    ShoppingCart,
    AlertTriangle,
    Package,
    TrendingUp,
} from 'lucide-react';

// Formatear CLP
function formatCLP(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

// Formatear fecha DD-MM-YYYY
function formatDateDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Mapear estado a badge visual
function getEstadoBadge(estado: string) {
    const map: Record<string, { label: string; className: string }> = {
        pendiente: { label: 'PENDIENTE', className: 'bg-amber-50 text-amber-700' },
        confirmado: { label: 'CONFIRMADO', className: 'bg-blue-50 text-blue-700' },
        entregado: { label: 'ENTREGADO', className: 'bg-emerald-50 text-emerald-700' },
        anulado: { label: 'ANULADO', className: 'bg-slate-100 text-slate-500' },
    };
    return map[estado] ?? { label: estado.toUpperCase(), className: 'bg-slate-100 text-slate-600' };
}

// Data REAL desde Supabase según el período
async function getRealSalesData(supabase: SupabaseClient, period: TimeFilterType) {
    const now = new Date();
    
    if (period === 'day') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const { data } = await supabase
            .from('pedidos')
            .select('total, created_at')
            .gte('created_at', startOfToday.toISOString())
            .lt('created_at', endOfToday.toISOString())
            .neq('estado', 'anulado');

        const hourlyData = Array.from({ length: 24 }, (_, i) => ({
            name: `${i.toString().padStart(2, '0')}:00`,
            ventas: 0
        }));

        data?.forEach(p => {
            const hour = new Date(p.created_at).getHours();
            hourlyData[hour].ventas += Number(p.total);
        });

        // Retornamos las horas laborales (08:00 a 20:00) para un gráfico más limpio
        return hourlyData.filter((_, i) => i >= 8 && i <= 20);
    }
    
    if (period === 'week') {
        const day = now.getDay() || 7; // Lunes = 1, Domingo = 7
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const { data } = await supabase
            .from('pedidos')
            .select('total, created_at')
            .gte('created_at', startOfWeek.toISOString())
            .lt('created_at', endOfWeek.toISOString())
            .neq('estado', 'anulado');

        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const weeklyData = days.map(d => ({ name: d, ventas: 0 }));

        data?.forEach(p => {
            const d = new Date(p.created_at).getDay();
            const index = d === 0 ? 6 : d - 1; // Ajustar Domingo al final
            weeklyData[index].ventas += Number(p.total);
        });

        return weeklyData;
    }

    if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const { data } = await supabase
            .from('pedidos')
            .select('total, created_at')
            .gte('created_at', startOfMonth.toISOString())
            .lt('created_at', endOfMonth.toISOString())
            .neq('estado', 'anulado');

        const weeks = ['Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4'];
        const monthlyData = weeks.map(w => ({ name: w, ventas: 0 }));

        data?.forEach(p => {
            const date = new Date(p.created_at).getDate();
            let weekIndex = Math.floor((date - 1) / 7);
            if (weekIndex > 3) weekIndex = 3; // Agrupar los últimos días en la semana 4
            monthlyData[weekIndex].ventas += Number(p.total);
        });

        return monthlyData;
    }

    return [];
}

interface PageProps {
    searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const resolvedParams = await searchParams;
    const period = (resolvedParams.period as TimeFilterType) || 'day';

    // Obtener perfil del usuario
    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase
        .from('usuarios')
        .select('nombre, rol')
        .eq('id', user!.id)
        .single();

    const userRole = perfil?.rol;
    const isManager = userRole === 'admin' || userRole === 'gerente';

    // --- Configuración de fechas para hoy ---
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const fechaArchivo = formatDateDDMMYYYY(startOfToday);

    // --- KPI 1: Ingresos Totales (Métrica Diaria - Pagos recibidos hoy) ---
    const { data: pagosHoy } = await supabase
        .from('pagos')
        .select('monto')
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString());

    const ingresosTotales = pagosHoy?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0;
    const ingresosTotalesCLP = formatCLP(ingresosTotales);

    // --- KPI 1.5: Utilidad de Hoy (Métrica Diaria - Ganancia real de pedidos de hoy) ---
    const { data: pedidosHoy } = await supabase
        .from('pedidos')
        .select('id')
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString())
        .neq('estado', 'anulado');

    let utilidadHoy = 0;
    if (pedidosHoy && pedidosHoy.length > 0) {
        const pedidoIds = pedidosHoy.map(p => p.id);
        const { data: detallesHoy } = await supabase
            .from('detalle_pedidos')
            .select('cantidad, precio_unitario, costo_unitario')
            .in('pedido_id', pedidoIds);
            
        utilidadHoy = (detallesHoy ?? []).reduce((acc, det) => {
            const gananciaUnitaria = Number(det.precio_unitario) - Number(det.costo_unitario);
            return acc + (gananciaUnitaria * Number(det.cantidad));
        }, 0);
    }
    const utilidadHoyCLP = formatCLP(utilidadHoy);

    // --- KPI 2: Cuentas por Cobrar (Métrica Histórica) ---
    const { data: pedidosConSaldo } = await supabase
        .from('pedidos')
        .select('saldo')
        .gt('saldo', 0)
        .neq('estado', 'anulado');

    const cuentasPorCobrar = pedidosConSaldo?.reduce((acc, p) => acc + Number(p.saldo), 0) ?? 0;
    const cuentasPorCobrarCLP = formatCLP(cuentasPorCobrar);

    // --- KPI 3: Pedidos Pendientes (Estado Actual) ---
    const { count: numPedidosPendientesRaw } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');
    
    const numPedidosPendientes = numPedidosPendientesRaw ?? 0;
    const pedidosPendientesExport = String(numPedidosPendientes);

    // --- KPI 4: Alertas de Stock (Estado Actual) ---
    const { data: alertasStock } = await supabase
        .from('productos')
        .select('id, nombre, stock_actual, stock_minimo, categorias(nombre)')
        .eq('activo', true);

    // Filtrar en el servidor: productos donde stock_actual <= stock_minimo
    const stockBajo = alertasStock?.filter(
        (p) => Number(p.stock_actual) <= Number(p.stock_minimo)
    ) ?? [];

    // --- Últimos Pedidos ---
    const { data: ultimosPedidos } = await supabase
        .from('pedidos')
        .select('id, estado, total, saldo, created_at, clientes(razon_social)')
        .order('created_at', { ascending: false })
        .limit(5);

    // --- Data Real del Gráfico ---
    const chartData = await getRealSalesData(supabase, period);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">Panel de Control</h2>
                    <p className="text-slate-500 mt-1">
                        Bienvenido, <span className="font-semibold text-slate-700">{perfil?.nombre || 'Usuario'}</span>. Aquí tienes el resumen del día.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <TimeFilter />
                    {isManager && (
                        <ExportReporteButton
                            ingresosTotales={ingresosTotalesCLP}
                            cuentasPorCobrar={cuentasPorCobrarCLP}
                            pedidosPendientes={pedidosPendientesExport}
                            fechaArchivo={fechaArchivo}
                        />
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isManager ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-6`}>
                <KpiCard
                    title="Ingresos Totales"
                    value={ingresosTotalesCLP}
                    icon={DollarSign}
                    colorClass="bg-blue-50 text-blue-600"
                />
                {isManager && (
                    <KpiCard
                        title="Utilidad de Hoy"
                        value={utilidadHoyCLP}
                        icon={TrendingUp}
                        colorClass="bg-emerald-50 text-emerald-600"
                    />
                )}
                {isManager && (
                    <KpiCard
                        title="Cuentas por Cobrar"
                        value={cuentasPorCobrarCLP}
                        icon={ArrowLeftRight}
                        colorClass="bg-orange-50 text-orange-600"
                    />
                )}
                <KpiCard
                    title="Pedidos Pendientes"
                    value={pedidosPendientesExport}
                    subtitle={numPedidosPendientes > 0 ? `${numPedidosPendientes} requieren atención` : 'Todo al día'}
                    icon={ShoppingCart}
                    colorClass="bg-cyan-50 text-cyan-600"
                />
                <KpiCard
                    title="Alertas de Stock"
                    value={String(stockBajo.length)}
                    subtitle={stockBajo.length > 0 ? 'Productos bajo mínimo' : 'Stock saludable'}
                    icon={AlertTriangle}
                    colorClass="bg-rose-50 text-rose-600"
                />
            </div>

            {/* Gráfico de Ventas Real */}
            <SalesChart data={chartData} period={period} />

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stock Alerts Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 rounded-lg">
                                <AlertTriangle size={20} className="text-rose-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Alertas de Stock</h3>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Producto</th>
                                <th className="px-6 py-4">Actual</th>
                                <th className="px-6 py-4 text-center">Mínimo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stockBajo.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-400 italic">
                                        <Package size={32} className="mx-auto mb-2 text-slate-300" />
                                        Todos los productos tienen stock suficiente
                                    </td>
                                </tr>
                            ) : (
                                stockBajo.slice(0, 5).map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-700">{item.nombre}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {((item.categorias as unknown) as { nombre: string } | null)?.nombre ?? 'Sin categoría'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-extrabold text-rose-600">{item.stock_actual}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 text-center">{item.stock_minimo}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Recent Orders Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <ShoppingCart size={20} className="text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Últimos Pedidos</h3>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(!ultimosPedidos || ultimosPedidos.length === 0) ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400 italic">
                                        <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
                                        No hay pedidos registrados aún
                                    </td>
                                </tr>
                            ) : (
                                ultimosPedidos.map((pedido) => {
                                    const badge = getEstadoBadge(pedido.estado);
                                    return (
                                        <tr key={pedido.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-[#005088]">
                                                #PED-{String(pedido.id).padStart(4, '0')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700">
                                                {((pedido.clientes as unknown) as { razon_social: string } | null)?.razon_social ?? '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{formatCLP(Number(pedido.total))}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-tight ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
