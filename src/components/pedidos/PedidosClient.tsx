'use client';

import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { useUserRole, canAccess } from '@/contexts/UserRoleContext';
import {
    Search,
    Plus,
    Eye,
    RefreshCcw,
    Clock,
    CheckCircle2,
    XCircle,
    TrendingUp,
    AlertCircle,
    ShoppingCart,
    PackageCheck,
} from 'lucide-react';
import Link from 'next/link';
import { cambiarEstadoPedido, obtenerDetallePedido } from '@/app/(dashboard)/pedidos/actions';
import type { PedidoDetalleResult } from '@/app/(dashboard)/pedidos/actions';
import { OrderDetailDrawer } from '@/components/pedidos/OrderDetailDrawer';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// ─── Types ──────────────────────────────────────────────────────────────────

export type EstadoPedido = 'pendiente' | 'confirmado' | 'entregado' | 'anulado';

export interface PedidoData {
    id: number;
    cliente_id: number;
    cliente_rut: string;
    created_at: string;
    cliente_razon_social: string;
    estado: EstadoPedido;
    total: number;
    saldo: number;
    nota: string | null;
}

interface PedidosClientProps {
    pedidos: PedidoData[];
    totalPages?: number;
    currentPage?: number;
    totalRegistros?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<EstadoPedido, { style: string; Icon: React.ComponentType<{ size?: number }> }> = {
    pendiente: { style: 'bg-amber-50 text-amber-600 border-amber-100', Icon: Clock },
    confirmado: { style: 'bg-blue-50 text-blue-600 border-blue-100', Icon: PackageCheck },
    entregado: { style: 'bg-emerald-50 text-emerald-600 border-emerald-100', Icon: CheckCircle2 },
    anulado: { style: 'bg-rose-50 text-rose-600 border-rose-100', Icon: XCircle },
};

function StatusBadge({ estado }: { estado: EstadoPedido }) {
    const config = ESTADO_CONFIG[estado];
    const { Icon } = config;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${config.style}`}>
            <Icon size={12} />
            {estado}
        </span>
    );
}

function FinancialStatusBadge({ saldo, total }: { saldo: number; total: number }) {
    let label = '';
    let style = '';
    
    if (saldo === 0) {
        label = 'Pagado';
        style = 'bg-emerald-50 text-emerald-600 border-emerald-100';
    } else if (saldo > 0 && saldo < total) {
        label = 'Abonado';
        style = 'bg-blue-50 text-blue-600 border-blue-100';
    } else {
        label = 'Por Pagar';
        style = 'bg-orange-50 text-orange-600 border-orange-100';
    }
    
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${style}`}>
            {label}
        </span>
    );
}

const NEXT_ESTADO: Record<EstadoPedido, EstadoPedido | null> = {
    pendiente: 'confirmado',
    confirmado: 'entregado',
    entregado: null,
    anulado: null,
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function PedidosClient({ pedidos, totalPages = 1, currentPage = 1, totalRegistros = 0 }: PedidosClientProps) {
    const role = useUserRole();
    const isManager = canAccess(role, ['admin', 'gerente']);

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState(searchParams?.get('query') || '');
    const [filterEstado, setFilterEstado] = useState<'' | EstadoPedido>((searchParams?.get('estado') as EstadoPedido) || '');
    const [isPending, startTransition] = useTransition();

    // Drawer state
    const [drawerPedido, setDrawerPedido] = useState<PedidoData | null>(null);
    const [drawerDetalles, setDrawerDetalles] = useState<PedidoDetalleResult['detalles']>([]);
    const [drawerPagos, setDrawerPagos] = useState<PedidoDetalleResult['pagos']>([]);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // KPIs
    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const ventasHoy = pedidos
            .filter((p) => new Date(p.created_at).toDateString() === today && p.estado !== 'anulado')
            .reduce((acc, p) => acc + p.total, 0);
        const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
        const entregados = pedidos.filter((p) => p.estado === 'entregado').length;
        const saldoCobrar = pedidos.reduce((acc, p) => acc + p.saldo, 0);
        return { ventasHoy, pendientes, entregados, saldoCobrar };
    }, [pedidos]);

    // --- Push filters to URL ---
    const initialRender = useRef(true);
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }
        const timeoutId = setTimeout(() => {
            const params = new URLSearchParams(searchParams?.toString() || '');
            
            if (searchQuery) params.set('query', searchQuery);
            else params.delete('query');
            
            if (filterEstado) params.set('estado', filterEstado);
            else params.delete('estado');

            params.set('page', '1');
            router.push(`${pathname}?${params.toString()}`);
        }, 500);
        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, filterEstado, pathname, router]);

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams?.toString() || '');
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    // Filtered
    const filteredPedidos = pedidos;

    const handleChangeEstado = (pedidoId: number, estado: EstadoPedido) => {
        const next = NEXT_ESTADO[estado];
        if (!next) return;
        startTransition(async () => {
            await cambiarEstadoPedido(pedidoId, next);
            if (drawerPedido && drawerPedido.id === pedidoId) {
                setDrawerPedido({ ...drawerPedido, estado: next });
            }
        });
    };

    const handleViewDetail = async (pedido: PedidoData) => {
        setDrawerPedido(pedido);
        setDrawerLoading(true);
        const result = await obtenerDetallePedido(pedido.id);
        if (result.success) {
            setDrawerDetalles(result.detalles);
            setDrawerPagos(result.pagos);
        } else {
            setDrawerDetalles([]);
            setDrawerPagos([]);
        }
        setDrawerLoading(false);
    };

    const handleCloseDrawer = () => {
        setDrawerPedido(null);
        setDrawerDetalles([]);
        setDrawerPagos([]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Gestión de Ventas
                    </h2>
                    <p className="text-slate-500 mt-1 text-sm font-medium">
                        Administra y monitorea el estado de tus pedidos B2B.
                    </p>
                </div>
                <Link href="/pedidos/nuevo">
                    <button className="bg-[#005088] text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#003d66] transition-all shadow-lg shadow-[#005088]/20 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-[#005088] outline-none">
                        <Plus size={18} />
                        Nuevo Pedido
                    </button>
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventas de Hoy</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{formatCLP(stats.ventasHoy)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-blue-50 text-[#005088]"><TrendingUp size={20} /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos Pendientes</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{stats.pendientes}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600"><Clock size={20} /></div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entregados</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{stats.entregados}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></div>
                </div>
                {/* Saldo a Cobrar — Solo admin/gerente */}
                {isManager && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo a Cobrar</p>
                            <p className="text-xl font-black text-slate-900 mt-1">{formatCLP(stats.saldoCobrar)}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600"><AlertCircle size={20} /></div>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cliente o ID de pedido..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all"
                    />
                </div>
                <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value as '' | EstadoPedido)}
                    className="bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3 pr-8 text-sm font-bold outline-none focus:ring-2 focus:ring-[#005088] appearance-none cursor-pointer"
                >
                    <option value="">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="entregado">Entregado</option>
                    <option value="anulado">Anulado</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">ID Pedido</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Saldo Pendiente</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredPedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <ShoppingCart size={40} className="mx-auto mb-3 text-slate-300" />
                                        <p className="text-sm font-semibold text-slate-400">No se encontraron pedidos</p>
                                        <p className="text-xs text-slate-400 mt-1">Intenta ajustar los filtros o crea un nuevo pedido.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredPedidos.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-black text-[#005088]">
                                            #{String(p.id).padStart(4, '0')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-medium">
                                            {formatFecha(p.created_at)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900">
                                            {p.cliente_razon_social}
                                        </td>
                                        <td className="px-6 py-4 flex flex-col gap-1 items-start">
                                            <StatusBadge estado={p.estado} />
                                            {p.estado !== 'anulado' && <FinancialStatusBadge saldo={p.saldo} total={p.total} />}
                                        </td>
                                        <td className="px-6 py-4 font-bold">
                                            {formatCLP(p.total)}
                                        </td>
                                        <td className="px-6 py-4 font-bold">
                                            <span className={p.saldo > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                                {formatCLP(p.saldo)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleViewDetail(p)}
                                                    title="Ver Detalle"
                                                    className="p-2 rounded-lg text-slate-400 hover:text-[#005088] hover:bg-blue-50 transition-all"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                {NEXT_ESTADO[p.estado] && (
                                                    <button
                                                        title={`Cambiar a ${NEXT_ESTADO[p.estado]}`}
                                                        disabled={isPending}
                                                        onClick={() => handleChangeEstado(p.id, p.estado)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
                                                    >
                                                        <RefreshCcw size={18} />
                                                    </button>
                                                )}
                                                {/* Anular — Solo admin/gerente y solo si NO está entregado ni anulado */}
                                                {isManager && p.estado !== 'anulado' && p.estado !== 'entregado' && (
                                                    <button
                                                        title="Anular Pedido"
                                                        disabled={isPending}
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de que deseas anular el pedido #${p.id}? Se devolverá el stock de los productos.`)) {
                                                                startTransition(async () => {
                                                                    await cambiarEstadoPedido(p.id, 'anulado');
                                                                });
                                                            }
                                                        }}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400 font-medium">
                        Mostrando página {currentPage} de {totalPages} ({totalRegistros} pedidos)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            <OrderDetailDrawer
                isOpen={!!drawerPedido}
                onClose={handleCloseDrawer}
                pedido={
                    drawerPedido
                        ? {
                              id: drawerPedido.id,
                              cliente: drawerPedido.cliente_razon_social,
                              rut: drawerPedido.cliente_rut,
                              estado: drawerPedido.estado,
                              total: drawerPedido.total,
                              saldo: drawerPedido.saldo,
                          }
                        : null
                }
                detalles={drawerDetalles}
                pagos={drawerPagos}
                loading={drawerLoading}
                onAnular={(id) => {
                    if (drawerPedido && drawerPedido.estado === 'entregado') {
                        alert('No se puede anular un pedido que ya fue entregado.');
                        return;
                    }
                    if (confirm(`¿Estás seguro de que deseas anular el pedido #${id}? Se devolverá el stock de los productos.`)) {
                        startTransition(async () => {
                            await cambiarEstadoPedido(id, 'anulado');
                            if (drawerPedido) setDrawerPedido({ ...drawerPedido, estado: 'anulado' });
                        });
                    }
                }}
                onCambiarEstado={(id) => {
                    if (drawerPedido) handleChangeEstado(id, drawerPedido.estado);
                }}
                onRegistrarPago={(pedidoId) => {
                    const targetPedido = pedidos.find(p => p.id === pedidoId);
                    if (targetPedido) {
                        router.push(`/finanzas?cliente_id=${targetPedido.cliente_id}&pedido_id=${pedidoId}`);
                    }
                }}
            />
        </div>
    );
}
