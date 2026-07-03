'use client';

import { useState, useMemo, useTransition } from 'react';
import { useUserRole, canAccess } from '@/contexts/UserRoleContext';
import {
    Plus,
    Trash2,
    ChevronLeft,
    Save,
    Search,
    ShoppingCart,
    User,
    FileText,
    AlertCircle,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { crearPedido, crearClienteRapido } from '@/app/(dashboard)/pedidos/actions';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProductoOption {
    id: number;
    nombre: string;
    precio_venta_actual: number;
    stock_actual: number;
    paquetes_por_caja: number;
}

export interface ClienteOption {
    id: number;
    razon_social: string;
}

interface LineaPedido {
    tempId: string;
    producto_id: number | '';
    forma_venta: 'paquetes' | 'cajas';
    cantidad_cajas: number;
    cantidad_paquetes: number;
    cantidad_final: number;
    precio_unitario: number;
    subtotal: number;
}

interface NuevoPedidoClientProps {
    productos: ProductoOption[];
    clientes: ClienteOption[];
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

const InputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const SmallInputClass =
    'bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-xs font-medium focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all h-9 text-center w-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

const MediumInputClass =
    'w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-3 text-xs font-medium focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

// ─── Main Component ─────────────────────────────────────────────────────────

export function NuevoPedidoClient({ productos, clientes }: NuevoPedidoClientProps) {
    const role = useUserRole();
    const isManager = canAccess(role, ['admin', 'gerente']);

    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // --- Form state ---
    const [clienteId, setClienteId] = useState<string>('');
    const [observacion, setObservacion] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const [localClientes, setLocalClientes] = useState(clientes);
    const [showClientModal, setShowClientModal] = useState(false);
    const [newClientData, setNewClientData] = useState({ razon_social: '', rut: '' });
    const [clientError, setClientError] = useState<string | null>(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);

    const [lineas, setLineas] = useState<LineaPedido[]>([
        { tempId: crypto.randomUUID(), producto_id: '', forma_venta: 'paquetes', cantidad_cajas: 1, cantidad_paquetes: 1, cantidad_final: 1, precio_unitario: 0, subtotal: 0 },
    ]);

    // --- Calculated total ---
    const totalFinal = useMemo(() => {
        return lineas.reduce((acc, line) => acc + line.subtotal, 0);
    }, [lineas]);

    // --- Line handlers ---
    const addLinea = () => {
        setLineas([
            ...lineas,
            { tempId: crypto.randomUUID(), producto_id: '', forma_venta: 'paquetes', cantidad_cajas: 1, cantidad_paquetes: 1, cantidad_final: 1, precio_unitario: 0, subtotal: 0 },
        ]);
    };

    const removeLinea = (tempId: string) => {
        if (lineas.length === 1) return;
        setLineas(lineas.filter((l) => l.tempId !== tempId));
    };

    const updateLinea = (tempId: string, updates: Partial<LineaPedido>) => {
        setLineas(
            lineas.map((l) => {
                if (l.tempId !== tempId) return l;

                const updated = { ...l, ...updates };

                // If product changed, update price from catalog
                if ('producto_id' in updates && updates.producto_id !== '') {
                    const prod = productos.find((p) => p.id === Number(updates.producto_id));
                    if (prod) {
                        updated.precio_unitario = prod.precio_venta_actual;
                    }
                }

                // Calculate cantidad final
                const currentProd = productos.find((p) => p.id === Number(updated.producto_id));
                const uxc = currentProd ? currentProd.paquetes_por_caja : 1;

                if (updated.forma_venta === 'cajas') {
                    updated.cantidad_final = updated.cantidad_cajas * uxc;
                } else {
                    updated.cantidad_final = updated.cantidad_paquetes;
                }

                // Recalculate subtotal
                updated.subtotal = updated.cantidad_final * updated.precio_unitario;
                return updated;
            })
        );
    };

    // --- Submit ---
    const handleSave = () => {
        setFormError(null);

        if (!clienteId) {
            setFormError('Debe seleccionar un cliente.');
            return;
        }

        const lineasValidas = lineas.filter((l) => l.producto_id !== '');
        if (lineasValidas.length === 0) {
            setFormError('Debe agregar al menos un producto al pedido.');
            return;
        }

        startTransition(async () => {
            const result = await crearPedido({
                cliente_id: Number(clienteId),
                nota: observacion || undefined,
                lineas: lineasValidas.map((l) => ({
                    producto_id: Number(l.producto_id),
                    cantidad: l.cantidad_final,
                    precio_unitario: l.precio_unitario,
                })),
            });

            if (result.success) {
                router.push('/pedidos');
            } else {
                setFormError(result.error ?? 'Error al crear el pedido.');
            }
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/pedidos">
                    <button className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                </Link>
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                        Nuevo Pedido
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                        Cree un nuevo pedido seleccionando un cliente y añadiendo productos.
                    </p>
                </div>
            </div>

            {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg font-medium">
                    {formError}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ═══════ Left Column ═══════ */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Client Info */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="p-2 bg-blue-50 text-[#005088] rounded-lg">
                                <User size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">
                                Detalles del Cliente
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                    Cliente <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1">
                                        <Search
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                            size={16}
                                        />
                                        <select
                                            value={clienteId}
                                            onChange={(e) => setClienteId(e.target.value)}
                                            className={`${InputClass} pl-10 appearance-none`}
                                        >
                                            <option value="">Seleccione un cliente...</option>
                                            {localClientes.map((c) => (
                                                <option key={c.id} value={String(c.id)}>
                                                    {c.razon_social}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowClientModal(true)}
                                        className="bg-[#005088] text-white px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#003d66] transition-all whitespace-nowrap"
                                    >
                                        <Plus size={16} />
                                        Nuevo
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium italic mt-1">
                                    Seleccione el cliente para asociar este pedido o cree uno nuevo.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Order Lines */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#005088] text-white rounded-lg">
                                    <ShoppingCart size={20} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Líneas de Pedido
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={addLinea}
                                className="text-xs font-black text-[#005088] bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Añadir Línea
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4 w-1/3">Producto</th>
                                        <th className="px-6 py-4 w-40">Cantidad</th>
                                        <th className="px-6 py-4 w-32">Precio Unitario</th>
                                        <th className="px-6 py-4 w-32">Subtotal</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {lineas.map((linea) => (
                                        <tr
                                            key={linea.tempId}
                                            className="hover:bg-slate-50/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <select
                                                    className={InputClass}
                                                    value={linea.producto_id}
                                                    onChange={(e) =>
                                                        updateLinea(linea.tempId, {
                                                            producto_id: Number(e.target.value),
                                                        })
                                                    }
                                                >
                                                    <option value="">
                                                        Seleccionar producto...
                                                    </option>
                                                    {productos.map((p) => (
                                                        <option key={p.id} value={String(p.id)}>
                                                            {p.nombre} (stock: {p.stock_actual})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-2">
                                                    <select
                                                        className={MediumInputClass}
                                                        value={linea.forma_venta}
                                                        onChange={(e) => updateLinea(linea.tempId, { forma_venta: e.target.value as 'paquetes' | 'cajas' })}
                                                    >
                                                        <option value="paquetes">Por Paquete</option>
                                                        <option value="cajas">Por Caja</option>
                                                    </select>
                                                    
                                                    {linea.forma_venta === 'cajas' ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                placeholder="Cajas"
                                                                className={SmallInputClass}
                                                                value={linea.cantidad_cajas || ''}
                                                                onChange={(e) => updateLinea(linea.tempId, { cantidad_cajas: Number(e.target.value) })}
                                                            />
                                                            <span className="text-[10px] text-emerald-600 font-black whitespace-nowrap ml-1" title="Paquetes totales">
                                                                = {linea.cantidad_final} <span className="text-slate-400 font-medium">paq.</span>
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className={MediumInputClass}
                                                            value={linea.cantidad_paquetes || ''}
                                                            onChange={(e) => updateLinea(linea.tempId, { cantidad_paquetes: Number(e.target.value) })}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                                                        $
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className={`${InputClass} pl-6 ${!isManager ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                                                        value={linea.precio_unitario || ''}
                                                        disabled={!isManager}
                                                        onChange={(e) =>
                                                            updateLinea(linea.tempId, {
                                                                precio_unitario: Number(
                                                                    e.target.value
                                                                ),
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900">
                                                    {formatCLP(linea.subtotal)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeLinea(linea.tempId)}
                                                    className="p-2 text-slate-300 hover:text-rose-600 transition-colors rounded-lg disabled:opacity-30"
                                                    disabled={lineas.length === 1}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {lineas.length === 0 && (
                            <div className="p-12 text-center">
                                <ShoppingCart
                                    size={48}
                                    className="mx-auto text-slate-200 mb-4"
                                />
                                <p className="text-slate-500 font-medium">
                                    Aún no hay productos en este pedido.
                                </p>
                            </div>
                        )}
                    </section>
                </div>

                {/* ═══════ Right Column: Summary ═══════ */}
                <div className="space-y-8">
                    {/* Summary Card */}
                    <section className="bg-[#005088] p-8 rounded-2xl shadow-xl shadow-[#005088]/20 text-white space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                Resumen del Pedido
                            </p>
                            <h4 className="text-4xl font-black mt-2">
                                {formatCLP(totalFinal)}
                            </h4>
                            <p className="text-xs font-medium opacity-60 mt-1">
                                Total Final Calculado
                            </p>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/10">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isPending}
                                className="w-full bg-white text-[#005088] py-4 rounded-xl font-black text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98] focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#005088] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={20} />
                                {isPending ? 'Guardando...' : 'Guardar Pedido'}
                            </button>
                            <Link href="/pedidos" className="block">
                                <button
                                    type="button"
                                    className="w-full bg-white/10 text-white py-4 rounded-xl font-bold text-sm hover:bg-white/20 transition-all"
                                >
                                    Cancelar
                                </button>
                            </Link>
                        </div>
                    </section>

                    {/* Additional Info */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                                Información Adicional
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                Notas / Observaciones
                            </label>
                            <textarea
                                rows={4}
                                className={`${InputClass} resize-none`}
                                placeholder="Instrucciones de entrega especiales, referencias del cliente, etc."
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <AlertCircle
                                className="text-amber-600 shrink-0"
                                size={16}
                            />
                            <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                Asegúrese de validar los precios unitarios antes de guardar.
                                Los cambios afectarán el total final del pedido.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* Modal de Cliente Rápido */}
            {showClientModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-slate-900">
                                Nuevo Cliente
                            </h3>
                            <button
                                onClick={() => setShowClientModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {clientError && (
                                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg font-medium">
                                    {clientError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                    Razón Social <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newClientData.razon_social}
                                    onChange={(e) => setNewClientData({ ...newClientData, razon_social: e.target.value })}
                                    className={InputClass}
                                    placeholder="Ej. Distribuidora Las Flores SPA"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block">
                                    RUT
                                </label>
                                <input
                                    type="text"
                                    value={newClientData.rut}
                                    onChange={(e) => setNewClientData({ ...newClientData, rut: e.target.value })}
                                    className={InputClass}
                                    placeholder="Ej. 76.123.456-7"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowClientModal(false)}
                                className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isCreatingClient || !newClientData.razon_social.trim()}
                                onClick={async () => {
                                    setClientError(null);
                                    setIsCreatingClient(true);
                                    const result = await crearClienteRapido(newClientData);
                                    setIsCreatingClient(false);
                                    if (result.success && result.id) {
                                        setLocalClientes([...localClientes, { id: result.id, razon_social: newClientData.razon_social.trim() }]);
                                        setClienteId(String(result.id));
                                        setShowClientModal(false);
                                        setNewClientData({ razon_social: '', rut: '' });
                                    } else {
                                        setClientError(result.error ?? 'Error al crear cliente');
                                    }
                                }}
                                className="bg-[#005088] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#003d66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreatingClient ? 'Guardando...' : 'Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
