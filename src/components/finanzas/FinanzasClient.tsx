'use client';

import { useState, useMemo, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUserRole, canAccess } from '@/contexts/UserRoleContext';
import {
    DollarSign,
    CreditCard,
    Banknote,
    ArrowRightLeft,
    History,
    PlusCircle,
    Search,
    CheckCircle2,
    Calendar,
    User,
    Hash,
    FileText,
} from 'lucide-react';
import { registrarPago } from '@/app/(dashboard)/finanzas/actions';

// ─── Types (serializable data from server) ──────────────────────────────────

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque' | 'otro';

export interface PagoData {
    id: number;
    cliente_razon_social: string;
    pedido_id: number;
    monto: number;
    metodo_pago: MetodoPago;
    referencia: string | null;
    nota: string | null;
    created_at: string;
}

export interface ClienteDeudorData {
    id: number;
    razon_social: string;
    saldo_pendiente: number;
}

export interface PedidoPendienteData {
    id: number;
    cliente_id: number;
    total: number;
    saldo: number;
}

interface FinanzasClientProps {
    pagos: PagoData[];
    clientesDeudores: ClienteDeudorData[];
    pedidosPendientes: PedidoPendienteData[];
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
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const InputStyle =
    'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all placeholder:text-slate-400';

function MetodoIcon({ metodo }: { metodo: MetodoPago }) {
    switch (metodo) {
        case 'efectivo': return <Banknote size={14} className="text-emerald-600" />;
        case 'transferencia': return <ArrowRightLeft size={14} className="text-blue-600" />;
        case 'cheque': return <CreditCard size={14} className="text-purple-600" />;
        default: return <FileText size={14} className="text-slate-400" />;
    }
}

function FormField({
    label,
    children,
    helperText,
    helperType = 'default',
}: {
    label: string;
    children: React.ReactNode;
    helperText?: string;
    helperType?: 'default' | 'error';
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                {label}
            </label>
            {children}
            {helperText && (
                <p className={`text-[10px] font-bold italic ${helperType === 'error' ? 'text-rose-600' : 'text-slate-400'}`}>
                    {helperText}
                </p>
            )}
        </div>
    );
}

// ─── Main Client Component ──────────────────────────────────────────────────

export function FinanzasClient({
    pagos,
    clientesDeudores,
    pedidosPendientes,
}: FinanzasClientProps) {
    const role = useUserRole();
    const isManager = canAccess(role, ['admin', 'gerente']);
    const searchParams = useSearchParams();

    // --- Form state ---
    const [selectedCliente, setSelectedCliente] = useState<string>(() => searchParams.get('cliente_id') ?? '');
    const [selectedPedido, setSelectedPedido] = useState<string>(() => searchParams.get('pedido_id') ?? '');
    const [monto, setMonto] = useState<string>('');
    const [metodo, setMetodo] = useState<MetodoPago>('transferencia');
    const [referencia, setReferencia] = useState('');
    const [notas, setNotas] = useState('');

    // --- Submit state ---
    const [isPending, startTransition] = useTransition();
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState(false);

    // --- Search state ---
    const [searchQuery, setSearchQuery] = useState('');

    // --- Derived data ---
    const activeClienteData = useMemo(() => {
        return clientesDeudores.find((c) => c.id === Number(selectedCliente));
    }, [clientesDeudores, selectedCliente]);

    const availablePedidos = useMemo(() => {
        return pedidosPendientes.filter(
            (p) => p.cliente_id === Number(selectedCliente) && p.saldo > 0
        );
    }, [pedidosPendientes, selectedCliente]);

    const selectedPedidoData = useMemo(() => {
        return pedidosPendientes.find((p) => p.id === Number(selectedPedido));
    }, [pedidosPendientes, selectedPedido]);

    // --- KPIs ---
    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const pagosHoy = pagos.filter((p) => new Date(p.created_at).toDateString() === today);
        const recaudacionHoy = pagosHoy.reduce((acc, p) => acc + p.monto, 0);
        const transferencias = pagosHoy.filter((p) => p.metodo_pago === 'transferencia').reduce((acc, p) => acc + p.monto, 0);
        const efectivo = pagosHoy.filter((p) => p.metodo_pago === 'efectivo').reduce((acc, p) => acc + p.monto, 0);
        return { recaudacionHoy, transferencias, efectivo };
    }, [pagos]);

    // --- Filtered pagos ---
    const filteredPagos = useMemo(() => {
        if (!searchQuery.trim()) return pagos;
        const q = searchQuery.toLowerCase();
        return pagos.filter(
            (p) =>
                p.cliente_razon_social.toLowerCase().includes(q) ||
                String(p.id).includes(searchQuery) ||
                String(p.pedido_id).includes(searchQuery)
        );
    }, [pagos, searchQuery]);

    // --- Submit ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(false);

        if (!selectedCliente || !selectedPedido || !monto) {
            setFormError('Complete todos los campos obligatorios.');
            return;
        }

        startTransition(async () => {
            const result = await registrarPago({
                pedido_id: Number(selectedPedido),
                cliente_id: Number(selectedCliente),
                monto: Number(monto),
                metodo_pago: metodo,
                referencia: referencia || undefined,
                nota: notas || undefined,
            });

            if (result.success) {
                setFormSuccess(true);
                setSelectedCliente('');
                setSelectedPedido('');
                setMonto('');
                setReferencia('');
                setNotas('');
                setTimeout(() => setFormSuccess(false), 3000);
            } else {
                setFormError(result.error ?? 'Error al registrar el pago.');
            }
        });
    };

    return (
        <div className="max-w-400 mx-auto space-y-8">
            {/* Header & KPIs */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Registro de Pagos y Finanzas
                    </h2>
                    <p className="text-slate-500 mt-1 font-medium">
                        Control de abonos y conciliación de cuentas por cobrar.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recaudación Total Hoy</p>
                            <h3 className="text-2xl font-black text-slate-900">{formatCLP(stats.recaudacionHoy)}</h3>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign size={24} /></div>
                    </div>
                    {/* KPIs detallados — Solo admin/gerente */}
                    {isManager && (
                        <>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagos por Transferencia</p>
                                    <h3 className="text-2xl font-black text-slate-900">{formatCLP(stats.transferencias)}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><ArrowRightLeft size={24} /></div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pagos en Efectivo</p>
                                    <h3 className="text-2xl font-black text-slate-900">{formatCLP(stats.efectivo)}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Banknote size={24} /></div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ═══════ LEFT: Registration Form ═══════ */}
                <div className="lg:col-span-1">
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                            <div className="p-2 bg-[#10B981] rounded-lg text-white">
                                <PlusCircle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Registrar Pago</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {formSuccess && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-lg font-medium">
                                    <CheckCircle2 size={16} />
                                    Pago registrado exitosamente.
                                </div>
                            )}
                            {formError && (
                                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg font-medium">
                                    {formError}
                                </div>
                            )}

                            {/* Cliente */}
                            <FormField
                                label="Cliente"
                                helperText={
                                    activeClienteData
                                        ? `Saldo Total Pendiente: ${formatCLP(activeClienteData.saldo_pendiente)}`
                                        : 'Seleccione un cliente para ver su deuda'
                                }
                                helperType={activeClienteData && activeClienteData.saldo_pendiente > 0 ? 'error' : 'default'}
                            >
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className={`${InputStyle} pl-10 appearance-none`}
                                        value={selectedCliente}
                                        onChange={(e) => {
                                            setSelectedCliente(e.target.value);
                                            setSelectedPedido('');
                                        }}
                                        required
                                    >
                                        <option value="">Buscar Cliente...</option>
                                        {clientesDeudores.map((c) => (
                                            <option key={c.id} value={String(c.id)}>
                                                {c.razon_social}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </FormField>

                            {/* Pedido */}
                            <FormField
                                label="Pedido Asignado"
                                helperText={
                                    selectedPedidoData
                                        ? `Saldo del pedido: ${formatCLP(selectedPedidoData.saldo)}`
                                        : undefined
                                }
                                helperType={selectedPedidoData && selectedPedidoData.saldo > 0 ? 'error' : 'default'}
                            >
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        className={`${InputStyle} pl-10 appearance-none`}
                                        value={selectedPedido}
                                        onChange={(e) => setSelectedPedido(e.target.value)}
                                        disabled={!selectedCliente}
                                        required
                                    >
                                        <option value="">Seleccionar Pedido Pendiente...</option>
                                        {availablePedidos.map((p) => (
                                            <option key={p.id} value={String(p.id)}>
                                                Pedido #{String(p.id).padStart(4, '0')} — Saldo: {formatCLP(p.saldo)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </FormField>

                            {/* Monto + Método */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Monto a Pagar">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                        <input
                                            type="number"
                                            className={`${InputStyle} pl-6`}
                                            placeholder="0"
                                            min="1"
                                            value={monto}
                                            onChange={(e) => setMonto(e.target.value)}
                                            required
                                        />
                                    </div>
                                </FormField>
                                <FormField label="Método">
                                    <select
                                        className={`${InputStyle} appearance-none`}
                                        value={metodo}
                                        onChange={(e) => setMetodo(e.target.value as MetodoPago)}
                                    >
                                        <option value="transferencia">Transferencia</option>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </FormField>
                            </div>

                            {/* Referencia */}
                            <FormField label="Referencia (Opcional)">
                                <input
                                    type="text"
                                    className={InputStyle}
                                    placeholder="Ej: N° Transacción, N° Cheque..."
                                    value={referencia}
                                    onChange={(e) => setReferencia(e.target.value)}
                                />
                            </FormField>

                            {/* Notas */}
                            <FormField label="Notas">
                                <textarea
                                    rows={2}
                                    className={`${InputStyle} resize-none`}
                                    placeholder="Detalles adicionales del abono..."
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                />
                            </FormField>

                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full bg-[#10B981] text-white py-4 rounded-xl font-black text-sm hover:bg-[#0da371] transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 active:scale-[0.98] focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircle2 size={18} />
                                {isPending ? 'Registrando...' : 'Registrar Pago'}
                            </button>
                        </form>
                    </section>
                </div>

                {/* ═══════ RIGHT: History Table ═══════ */}
                <div className="lg:col-span-2">
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                    <History size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Historial de Abonos Recientes
                                </h3>
                                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                    {filteredPagos.length} registros
                                </span>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Filtrar por cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-[#005088] w-48"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">ID Pago</th>
                                        <th className="px-6 py-4">Fecha / Hora</th>
                                        <th className="px-6 py-4">Cliente / Pedido</th>
                                        <th className="px-6 py-4">Método</th>
                                        <th className="px-6 py-4">Referencia</th>
                                        <th className="px-6 py-4 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {filteredPagos.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <DollarSign size={40} className="mx-auto mb-3 text-slate-300" />
                                                <p className="text-sm font-semibold text-slate-400">No se encontraron pagos</p>
                                                <p className="text-xs text-slate-400 mt-1">Registra un nuevo pago para comenzar.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPagos.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-black text-[#005088]">
                                                    #{p.id}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                                                        <Calendar size={14} className="opacity-40" />
                                                        <span suppressHydrationWarning>
                                                            {formatFecha(p.created_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900">{p.cliente_razon_social}</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">
                                                        Pedido #{String(p.pedido_id).padStart(4, '0')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 font-bold capitalize text-slate-600">
                                                        <MetodoIcon metodo={p.metodo_pago} />
                                                        {p.metodo_pago}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 italic text-xs font-medium">
                                                    {p.referencia || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-base font-black text-emerald-700">
                                                        {formatCLP(p.monto)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                            <p className="text-xs text-slate-400 font-medium">
                                Mostrando {filteredPagos.length} de {pagos.length} registros
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
