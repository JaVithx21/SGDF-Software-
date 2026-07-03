'use client';

import { useState, useTransition } from 'react';
import { X, Building2, CreditCard, Phone, Mail, MapPin } from 'lucide-react';

interface ProveedorModalProps {
    isOpen: boolean;
    onClose: () => void;
    proveedor?: {
        id: number;
        nombre: string;
        rut: string | null;
        telefono: string | null;
        email: string | null;
        direccion: string | null;
        activo: boolean;
    } | null;
    onSubmit: (data: {
        nombre: string;
        rut?: string;
        telefono?: string;
        email?: string;
        direccion?: string;
        activo: boolean;
    }) => Promise<{ success: boolean; error?: string }>;
}

export function ProveedorModal({ isOpen, onClose, proveedor, onSubmit }: ProveedorModalProps) {
    const isEditing = !!proveedor;
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [nombre, setNombre] = useState(proveedor?.nombre ?? '');
    const [rut, setRut] = useState(proveedor?.rut ?? '');
    const [telefono, setTelefono] = useState(proveedor?.telefono ?? '');
    const [email, setEmail] = useState(proveedor?.email ?? '');
    const [direccion, setDireccion] = useState(proveedor?.direccion ?? '');
    const [activo, setActivo] = useState(proveedor?.activo ?? true);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            const result = await onSubmit({
                nombre,
                rut: rut || undefined,
                telefono: telefono || undefined,
                email: email || undefined,
                direccion: direccion || undefined,
                activo,
            });
            if (result.success) {
                onClose();
            } else {
                setError(result.error ?? 'Ocurrió un error inesperado.');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-900">
                        {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg font-medium">
                            {error}
                        </div>
                    )}

                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Razón Social *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Flores del Valle S.A." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all" />
                        </div>
                    </div>

                    {/* RUT + Teléfono */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">RUT</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="76.123.456-7" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+56 2 2345 6789" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@proveedor.cl" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all" />
                        </div>
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dirección</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Av. Las Industrias 1020, Santiago" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all" />
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <input type="checkbox" id="prov-activo" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-[#005088] focus:ring-[#005088]" />
                        <label htmlFor="prov-activo" className="text-sm font-semibold text-slate-700 cursor-pointer">
                            Proveedor activo (visible para movimientos)
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={isPending} className="px-5 py-2.5 text-sm font-bold text-white bg-[#005088] rounded-lg hover:bg-[#003d66] transition-all shadow-lg shadow-[#005088]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Proveedor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
