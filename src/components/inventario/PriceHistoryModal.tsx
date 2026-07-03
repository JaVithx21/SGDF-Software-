'use client';

import {
    X,
    TrendingUp,
    TrendingDown,
    User,
    Calendar,
    ArrowRight,
    DollarSign,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CambioPrecioData {
    id: number;
    precio_anterior: number;
    precio_nuevo: number;
    created_at: string;
    usuario_nombre: string;
}

interface PriceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    nombreProducto: string;
    precioActual: number;
    cambios: CambioPrecioData[];
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

function PriceBadge({ anterior, nuevo }: { anterior: number; nuevo: number }) {
    const diferencia = nuevo - anterior;
    const subio = diferencia > 0;

    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border ${
                subio
                    ? 'bg-rose-50 text-rose-600 border-rose-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}
        >
            {subio ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {subio ? '+' : ''}
            {formatCLP(diferencia)}
        </span>
    );
}

// ─── Main Modal Component ───────────────────────────────────────────────────

export function PriceHistoryModal({
    isOpen,
    onClose,
    nombreProducto,
    precioActual,
    cambios,
}: PriceHistoryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <header className="px-8 py-6 border-b border-slate-100 relative bg-slate-50/50">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all outline-none focus:ring-2 focus:ring-[#005088]"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>

                    <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                            Historial de Precios
                        </h3>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight pr-10">
                            {nombreProducto}
                        </h2>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-3 bg-[#005088] text-white px-4 py-2 rounded-xl">
                        <DollarSign size={16} className="opacity-70" />
                        <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">
                            Precio Actual
                        </span>
                        <span className="text-xl font-black">
                            {formatCLP(precioActual)}
                        </span>
                    </div>
                </header>

                {/* Content: Timeline */}
                <div className="px-8 py-8 max-h-[60vh] overflow-y-auto bg-white scrollbar-thin">
                    {cambios.length === 0 ? (
                        <div className="text-center py-12">
                            <DollarSign
                                size={40}
                                className="mx-auto mb-3 text-slate-300"
                            />
                            <p className="text-sm font-semibold text-slate-400">
                                No hay cambios registrados
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                El precio no ha sido modificado desde su creación.
                            </p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-slate-100 ml-4 space-y-10 pb-4">
                            {cambios.map((cambio, index) => (
                                <div key={cambio.id} className="relative pl-10">
                                    {/* Timeline Node */}
                                    <div
                                        className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm transition-transform hover:scale-125 cursor-default ${
                                            index === 0
                                                ? 'bg-[#005088] ring-4 ring-blue-50'
                                                : 'bg-slate-300'
                                        }`}
                                    />

                                    <div className="space-y-3">
                                        {/* Date */}
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Calendar
                                                size={14}
                                                className="opacity-60"
                                            />
                                            {formatFecha(cambio.created_at)}
                                        </div>

                                        {/* Price Transition */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-slate-400 line-through">
                                                    {formatCLP(
                                                        Number(
                                                            cambio.precio_anterior
                                                        )
                                                    )}
                                                </span>
                                                <ArrowRight
                                                    size={14}
                                                    className="text-slate-300"
                                                />
                                                <span className="text-lg font-black text-slate-900">
                                                    {formatCLP(
                                                        Number(
                                                            cambio.precio_nuevo
                                                        )
                                                    )}
                                                </span>
                                            </div>
                                            <PriceBadge
                                                anterior={Number(
                                                    cambio.precio_anterior
                                                )}
                                                nuevo={Number(
                                                    cambio.precio_nuevo
                                                )}
                                            />
                                        </div>

                                        {/* User Attribution */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                                <User
                                                    size={12}
                                                    className="text-slate-400"
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600">
                                                Modificado por{' '}
                                                <span className="text-[#005088]">
                                                    {cambio.usuario_nombre}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all outline-none focus:ring-2 focus:ring-[#005088]"
                    >
                        Cerrar Historial
                    </button>
                </footer>
            </div>
        </div>
    );
}
