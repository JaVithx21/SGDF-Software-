'use client';

import { useState, useTransition } from 'react';
import { X } from 'lucide-react';

interface CategoriaModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoria?: {
        id: number;
        nombre: string;
        descripcion: string | null;
    } | null;
    onSubmit: (data: {
        nombre: string;
        descripcion?: string;
    }) => Promise<{ success: boolean; error?: string }>;
}

export function CategoriaModal({ isOpen, onClose, categoria, onSubmit }: CategoriaModalProps) {
    const isEditing = !!categoria;
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [nombre, setNombre] = useState(categoria?.nombre ?? '');
    const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? '');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            const result = await onSubmit({
                nombre,
                descripcion: descripcion || undefined,
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
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-xl font-black text-slate-900">
                        {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    >
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
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Nombre de la Categoría *
                        </label>
                        <input
                            type="text"
                            required
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Rosas"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Descripción
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Descripción opcional de la categoría..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-4 text-sm focus:ring-2 focus:ring-[#005088] focus:border-transparent outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-[#005088] rounded-lg hover:bg-[#003d66] transition-all shadow-lg shadow-[#005088]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending
                                ? 'Guardando...'
                                : isEditing
                                    ? 'Guardar Cambios'
                                    : 'Crear Categoría'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
