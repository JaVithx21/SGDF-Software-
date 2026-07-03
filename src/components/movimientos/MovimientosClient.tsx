'use client';

import { useState, useMemo, useTransition } from 'react';
import { useUserRole, canAccess } from '@/contexts/UserRoleContext';
import {
    ArrowDownLeft,
    ArrowUpRight,
    History,
    PlusCircle,
    Search,
    Package,
    Truck,
    DollarSign,
    FileText,
    Calendar,
    CheckCircle2,
    ArrowLeftRight,
} from 'lucide-react';
import { registrarMovimiento } from '@/app/(dashboard)/movimientos/actions';

// ─── Types (serializable data from server) ──────────────────────────────────

export interface MovimientoData {
    id: number;
    producto_nombre: string;
    producto_varas: number;
    proveedor_nombre: string | null;
    cantidad: number;
    costo_unitario: number;
    costo_total: number;
    tipo: 'entrada' | 'salida';
    nota: string | null;
    pedido_id: number | null;
    creado_por_nombre: string | null;
    created_at: string; // ISO string (serializable)
}

export interface ProductoOption {
    id: number;
    nombre: string;
    stock_actual: number;
    maneja_cajas: boolean;
    paquetes_por_caja: number;
}

export interface ProveedorOption {
    id: number;
    nombre: string;
}

interface MovimientosClientProps {
    movimientos: MovimientoData[];
    productos: ProductoOption[];
    proveedores: ProveedorOption[];
}

// ─── Formatear CLP ─────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatFecha(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-CL', {
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

function FormField({
    label,
    children,
    id,
}: {
    label: string;
    children: React.ReactNode;
    id: string;
}) {
    return (
        <div className="space-y-1.5 flex-1 min-w-50">
            <label
                htmlFor={id}
                className="text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
                {label}
            </label>
            {children}
        </div>
    );
}

// ─── Main Client Component ──────────────────────────────────────────────────

export function MovimientosClient({
    movimientos,
    productos,
    proveedores,
}: MovimientosClientProps) {
    const role = useUserRole();
    const isManager = canAccess(role, ['admin', 'gerente']);

    // --- Form state (vendedor solo puede registrar salidas) ---
    const [tipo, setTipo] = useState<'entrada' | 'salida'>(isManager ? 'entrada' : 'salida');
    const [productoId, setProductoId] = useState('');
    const [proveedorId, setProveedorId] = useState('');
    const [costoUnitario, setCostoUnitario] = useState<number>(0);
    const [nota, setNota] = useState('');

    // --- Cantidad state ---
    const [formaIngreso, setFormaIngreso] = useState<'paquetes' | 'cajas'>('paquetes');
    const [cantidadPaquetes, setCantidadPaquetes] = useState<number>(0);
    const [cantidadCajas, setCantidadCajas] = useState<number>(0);

    // Auto-derivar paquetes_por_caja del producto seleccionado
    const selectedProducto = useMemo(
        () => productos.find((p) => String(p.id) === productoId),
        [productos, productoId]
    );
    const paquetesPorCaja = selectedProducto?.paquetes_por_caja ?? 1;
    const productoVieneEnCajas = selectedProducto?.maneja_cajas ?? false;

    const cantidadFinal = formaIngreso === 'cajas' && tipo === 'entrada'
        ? (cantidadCajas || 0) * paquetesPorCaja
        : (cantidadPaquetes || 0);

    // --- Submit state ---
    const [isPending, startTransition] = useTransition();
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState(false);

    // --- Search state ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTipo, setFilterTipo] = useState<'' | 'entrada' | 'salida'>('');

    // --- Calculated cost ---
    const costoTotalEstimado = useMemo(() => {
        return cantidadFinal * (costoUnitario || 0);
    }, [cantidadFinal, costoUnitario]);

    // --- Filtered movements ---
    const filteredMovimientos = useMemo(() => {
        let result = movimientos;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (m) =>
                    m.producto_nombre.toLowerCase().includes(query) ||
                    m.proveedor_nombre?.toLowerCase().includes(query) ||
                    m.nota?.toLowerCase().includes(query)
            );
        }

        if (filterTipo) {
            result = result.filter((m) => m.tipo === filterTipo);
        }

        return result;
    }, [movimientos, searchQuery, filterTipo]);

    // --- Form submit ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormSuccess(false);

        startTransition(async () => {
            const result = await registrarMovimiento({
                producto_id: Number(productoId),
                proveedor_id: tipo === 'entrada' && proveedorId ? Number(proveedorId) : null,
                cantidad: cantidadFinal,
                costo_unitario: costoUnitario,
                tipo,
                nota: nota || undefined,
            });

            if (result.success) {
                setFormSuccess(true);
                // Reset form
                setProductoId('');
                setProveedorId('');
                setCantidadPaquetes(0);
                setCantidadCajas(0);
                setFormaIngreso('paquetes');
                setCostoUnitario(0);
                setNota('');
                // Auto-hide success after 3s
                setTimeout(() => setFormSuccess(false), 3000);
            } else {
                setFormError(result.error ?? 'Ocurrió un error inesperado.');
            }
        });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                    Movimientos de Bodega
                </h2>
                <p className="text-slate-500 mt-1">
                    Gestión y registro de flujos de inventario.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* ═══════════════ FORMULARIO ═══════════════ */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#005088] rounded-lg text-white">
                                <PlusCircle size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Registrar Nuevo Movimiento
                            </h3>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Success / Error messages */}
                        {formSuccess && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-lg font-medium">
                                <CheckCircle2 size={16} />
                                Movimiento registrado exitosamente. El stock se actualizó automáticamente.
                            </div>
                        )}
                        {formError && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg font-medium">
                                {formError}
                            </div>
                        )}

                        {/* Tipo Selector — Vendedor bloqueado en Salida */}
                        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                            {isManager && (
                                <button
                                    type="button"
                                    onClick={() => setTipo('entrada')}
                                    className={`px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all ${tipo === 'entrada'
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <ArrowDownLeft size={18} />
                                    Entrada
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setTipo('salida')}
                                className={`px-6 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all ${tipo === 'salida'
                                    ? 'bg-white text-orange-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <ArrowUpRight size={18} />
                                Salida
                            </button>
                        </div>

                        {/* Forma de Ingreso (solo si el producto viene en cajas) */}
                        {tipo === 'entrada' && productoVieneEnCajas && (
                            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Forma de Ingreso:</label>
                                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setFormaIngreso('paquetes')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                            formaIngreso === 'paquetes'
                                                ? 'bg-white text-[#005088] shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        Por Paquetes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormaIngreso('cajas')}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                            formaIngreso === 'cajas'
                                                ? 'bg-white text-[#005088] shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        Por Cajas ({paquetesPorCaja} paq/caja)
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                            {/* Producto */}
                            <FormField label="Producto *" id="producto">
                                <select
                                    id="producto"
                                    value={productoId}
                                    onChange={(e) => setProductoId(e.target.value)}
                                    className={InputStyle}
                                    required
                                >
                                    <option value="">Seleccione un producto...</option>
                                    {productos.map((p) => (
                                        <option key={p.id} value={String(p.id)}>
                                            {p.nombre} (stock: {p.stock_actual})
                                        </option>
                                    ))}
                                </select>
                            </FormField>

                            {/* Cantidad */}
                            {tipo === 'entrada' && formaIngreso === 'cajas' && productoVieneEnCajas ? (
                                <>
                                    <FormField label="Cantidad de Cajas *" id="cajas">
                                        <div className="relative">
                                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="number"
                                                id="cajas"
                                                min="1"
                                                placeholder="0"
                                                value={cantidadCajas || ''}
                                                onChange={(e) => setCantidadCajas(Number(e.target.value))}
                                                className={`${InputStyle} pl-10`}
                                                required
                                            />
                                        </div>
                                    </FormField>
                                    <FormField label="Paquetes / Caja" id="paquetes_caja_info">
                                        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-bold text-[#005088] h-10.5">
                                            <Package size={16} />
                                            {paquetesPorCaja} paq/caja
                                        </div>
                                    </FormField>
                                    <div className="flex items-center text-sm font-black text-[#005088] bg-blue-50 px-4 py-2.5 rounded-lg border border-blue-100 h-10.5 mb-px">
                                        Total a ingresar: {cantidadFinal} paq.
                                    </div>
                                </>
                            ) : (
                                <FormField label="Cantidad (paquetes) *" id="cantidad">
                                    <div className="relative">
                                        <Package
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            size={16}
                                        />
                                        <input
                                            type="number"
                                            id="cantidad"
                                            min="1"
                                            placeholder="0"
                                            value={cantidadPaquetes || ''}
                                            onChange={(e) => setCantidadPaquetes(Number(e.target.value))}
                                            className={`${InputStyle} pl-10`}
                                            required
                                        />
                                    </div>
                                </FormField>
                            )}

                            {/* Proveedor y Costo (solo entrada + admin/gerente) */}
                            {tipo === 'entrada' && isManager && (
                                <>
                                    <FormField label="Proveedor *" id="proveedor">
                                        <div className="relative">
                                            <Truck
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={16}
                                            />
                                            <select
                                                id="proveedor"
                                                value={proveedorId}
                                                onChange={(e) => setProveedorId(e.target.value)}
                                                className={`${InputStyle} pl-10`}
                                                required={tipo === 'entrada'}
                                            >
                                                <option value="">Seleccione un proveedor...</option>
                                                {proveedores.map((p) => (
                                                    <option key={p.id} value={String(p.id)}>
                                                        {p.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </FormField>

                                    <FormField label="Costo Unitario (CLP) *" id="costo">
                                        <div className="relative">
                                            <DollarSign
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={16}
                                            />
                                            <input
                                                type="number"
                                                id="costo"
                                                min="0"
                                                placeholder="0"
                                                value={costoUnitario || ''}
                                                onChange={(e) =>
                                                    setCostoUnitario(Number(e.target.value))
                                                }
                                                className={`${InputStyle} pl-10`}
                                                required={tipo === 'entrada'}
                                            />
                                        </div>
                                    </FormField>
                                </>
                            )}

                            {/* Notas */}
                            <div className={tipo === 'entrada' ? 'lg:col-span-1' : 'md:col-span-1'}>
                                <FormField label="Notas / Referencia" id="notas">
                                    <div className="relative">
                                        <FileText
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            size={16}
                                        />
                                        <input
                                            type="text"
                                            id="notas"
                                            placeholder="Ej: Factura #123, Pedido #456..."
                                            value={nota}
                                            onChange={(e) => setNota(e.target.value)}
                                            className={`${InputStyle} pl-10`}
                                        />
                                    </div>
                                </FormField>
                            </div>
                        </div>

                        {/* Footer: Cost + Submit */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                            {tipo === 'entrada' && (
                                <div
                                    className={`text-sm font-bold px-4 py-2 rounded-lg ${costoTotalEstimado > 0
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                        }`}
                                >
                                    Costo Total Estimado:{' '}
                                    <span className="text-lg font-black ml-1">
                                        {formatCLP(costoTotalEstimado)}
                                    </span>
                                </div>
                            )}
                            {tipo === 'salida' && <div />}
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full sm:w-auto bg-[#005088] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#003d66] transition-all shadow-lg shadow-[#005088]/20 active:scale-[0.98] focus:ring-2 focus:ring-[#005088] focus:ring-offset-2 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? 'Registrando...' : 'Registrar Movimiento'}
                            </button>
                        </div>
                    </form>
                </section>

                {/* ═══════════════ HISTORIAL ═══════════════ */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                <History size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Historial de Movimientos
                            </h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                {filteredMovimientos.length} registros
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative hidden sm:block">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    size={16}
                                />
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium outline-none focus:ring-2 focus:ring-[#005088] w-56"
                                />
                            </div>
                            {/* Type filter */}
                            <select
                                value={filterTipo}
                                onChange={(e) =>
                                    setFilterTipo(e.target.value as '' | 'entrada' | 'salida')
                                }
                                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-3 pr-7 text-xs font-bold outline-none focus:ring-2 focus:ring-[#005088] appearance-none cursor-pointer"
                            >
                                <option value="">Todos</option>
                                <option value="entrada">Entradas</option>
                                <option value="salida">Salidas</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Fecha / Hora</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">Proveedor / Destino</th>
                                    <th className="px-6 py-4">Cantidad</th>
                                    {isManager && <th className="px-6 py-4">C. Unitario</th>}
                                    {isManager && <th className="px-6 py-4">C. Total</th>}
                                    <th className="px-6 py-4">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredMovimientos.length === 0 ? (
                                    <tr>
                                        <td colSpan={isManager ? 8 : 6} className="px-6 py-12 text-center">
                                            <ArrowLeftRight
                                                size={40}
                                                className="mx-auto mb-3 text-slate-300"
                                            />
                                            <p className="text-sm font-semibold text-slate-400">
                                                No se encontraron movimientos
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                Registra un nuevo movimiento para comenzar.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMovimientos.map((m) => (
                                        <tr
                                            key={m.id}
                                            className="hover:bg-slate-50/50 transition-colors"
                                        >
                                            {/* Fecha */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                                    <Calendar
                                                        size={14}
                                                        className="text-slate-300 shrink-0"
                                                    />
                                                    <span suppressHydrationWarning>
                                                        {formatFecha(m.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Tipo */}
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${m.tipo === 'entrada'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-orange-50 text-orange-700'
                                                        }`}
                                                >
                                                    {m.tipo === 'entrada' ? (
                                                        <ArrowDownLeft size={12} />
                                                    ) : (
                                                        <ArrowUpRight size={12} />
                                                    )}
                                                    {m.tipo}
                                                </span>
                                            </td>

                                            {/* Producto */}
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {m.producto_nombre}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {m.producto_varas} varas/paq.
                                                </p>
                                            </td>

                                            {/* Proveedor */}
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {m.proveedor_nombre || (
                                                    m.pedido_id
                                                        ? `Pedido #${String(m.pedido_id).padStart(4, '0')}`
                                                        : '—'
                                                )}
                                            </td>

                                            {/* Cantidad */}
                                            <td className="px-6 py-4 text-sm font-black text-slate-900">
                                                {m.cantidad}
                                            </td>

                                            {/* C. Unitario — Solo admin/gerente */}
                                            {isManager && (
                                                <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                                    {Number(m.costo_unitario) > 0
                                                        ? formatCLP(Number(m.costo_unitario))
                                                        : '—'}
                                                </td>
                                            )}

                                            {/* C. Total — Solo admin/gerente */}
                                            {isManager && (
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-black text-slate-900">
                                                        {Number(m.costo_total) > 0
                                                            ? formatCLP(Number(m.costo_total))
                                                            : '—'}
                                                    </span>
                                                </td>
                                            )}

                                            {/* Notas */}
                                            <td className="px-6 py-4">
                                                <p
                                                    className="text-xs text-slate-500 italic max-w-50 truncate"
                                                    title={m.nota || ''}
                                                >
                                                    {m.nota || '—'}
                                                </p>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                        <p className="text-xs text-slate-400 font-medium">
                            Mostrando {filteredMovimientos.length} de {movimientos.length} registros
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
