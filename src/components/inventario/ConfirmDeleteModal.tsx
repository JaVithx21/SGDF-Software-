'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    confirmText?: string;
    pendingText?: string;
    variant?: 'warning' | 'danger';
    onConfirm: () => Promise<{ success: boolean; error?: string }>;
}

export function ConfirmDeleteModal({
    isOpen,
    onClose,
    title,
    description,
    confirmText = 'Eliminar',
    pendingText = 'Eliminando...',
    variant = 'warning',
    onConfirm,
}: ConfirmDeleteModalProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setError(null);
        startTransition(async () => {
            const result = await onConfirm();
            if (result.success) {
                onClose();
            } else {
                setError(result.error ?? 'Ocurrió un error.');
            }
        });
    };

    const isDanger = variant === 'danger';
    const IconComponent = isDanger ? Trash2 : AlertTriangle;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`p-3 rounded-full ${isDanger ? 'bg-rose-100' : 'bg-amber-50'}`}>
                        <IconComponent size={28} className={isDanger ? 'text-rose-600' : 'text-amber-600'} />
                    </div>

                    <h3 className="text-lg font-black text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{description}</p>

                    {error && (
                        <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3 rounded-lg font-medium text-left">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 w-full pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isPending}
                            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                isDanger
                                    ? 'bg-rose-600 hover:bg-rose-700'
                                    : 'bg-amber-500 hover:bg-amber-600'
                            }`}
                        >
                            {isPending ? pendingText : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
