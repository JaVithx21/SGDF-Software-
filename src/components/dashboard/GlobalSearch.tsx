'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Package,
    ShoppingCart,
    Loader2,
    Command,
    SearchX,
} from 'lucide-react';
import { busquedaGlobal } from '@/app/(dashboard)/actions';
import type { GlobalSearchResult } from '@/app/(dashboard)/actions';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCLP(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

const ESTADO_COLORS: Record<string, string> = {
    pendiente: 'bg-amber-50 text-amber-600 border-amber-200',
    confirmado: 'bg-blue-50 text-blue-600 border-blue-200',
    entregado: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    anulado: 'bg-rose-50 text-rose-600 border-rose-200',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function GlobalSearch() {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Total result count
    const totalResults = results
        ? results.productos.length + results.pedidos.length
        : 0;

    // ── Debounced search ────────────────────────────────────────────────────
    const handleSearch = useCallback(async (searchQuery: string) => {
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) {
            setResults(null);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setIsOpen(true);

        try {
            const data = await busquedaGlobal(trimmed);
            setResults(data);
        } catch {
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInputChange = (value: string) => {
        setQuery(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.trim().length < 2) {
            setResults(null);
            setIsOpen(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            handleSearch(value);
        }, 300);
    };

    // ── Click outside to close ──────────────────────────────────────────────
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ctrl+K or Cmd+K to focus
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
            // Escape to close
            if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ── Cleanup debounce on unmount ─────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    // ── Navigation handlers ─────────────────────────────────────────────────
    const navigateTo = (path: string) => {
        setIsOpen(false);
        setQuery('');
        setResults(null);
        router.push(path);
    };

    return (
        <div ref={containerRef} className="relative w-96" id="global-search">
            {/* Search Input */}
            <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
                size={18}
            />
            <input
                ref={inputRef}
                id="global-search-input"
                type="text"
                placeholder="Buscar productos, clientes, pedidos..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => {
                    if (results && query.trim().length >= 2) setIsOpen(true);
                }}
                className="w-full bg-slate-100 border-none rounded-lg py-2.5 pl-10 pr-20 text-sm focus:ring-2 focus:ring-[#005088]/20 focus:bg-white outline-none transition-all duration-200"
            />
            {/* Keyboard shortcut hint */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                {isLoading ? (
                    <Loader2 size={16} className="text-[#005088] animate-spin" />
                ) : (
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-bold text-slate-400 border border-slate-300/50">
                        <Command size={10} />K
                    </kbd>
                )}
            </div>

            {/* ── Results Dropdown ────────────────────────────────────────── */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[28rem] overflow-y-auto">
                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm font-medium">Buscando...</span>
                        </div>
                    )}

                    {/* No results */}
                    {!isLoading && results && totalResults === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                            <SearchX size={32} className="mb-2 text-slate-300" />
                            <p className="text-sm font-semibold">Sin resultados</p>
                            <p className="text-xs mt-0.5">
                                No se encontraron coincidencias para &quot;{query}&quot;
                            </p>
                        </div>
                    )}

                    {/* Results by category */}
                    {!isLoading && results && totalResults > 0 && (
                        <>
                            {/* ── Productos ────────────────────────────── */}
                            {results.productos.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                        <Package size={14} className="text-[#005088]" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Productos ({results.productos.length})
                                        </span>
                                    </div>
                                    {results.productos.map((p) => (
                                        <button
                                            key={`prod-${p.id}`}
                                            onClick={() => navigateTo('/inventario')}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                                <Package size={16} className="text-[#005088]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900 truncate">
                                                    {p.nombre}
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    {p.categoria_nombre ?? 'Sin categoría'} · Stock: {p.stock_actual}
                                                </p>
                                            </div>
                                            {!p.activo && (
                                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-500 border border-rose-100 uppercase">
                                                    Inactivo
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}



                            {/* ── Pedidos ──────────────────────────────── */}
                            {results.pedidos.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 border-t flex items-center gap-2">
                                        <ShoppingCart size={14} className="text-amber-600" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Pedidos ({results.pedidos.length})
                                        </span>
                                    </div>
                                    {results.pedidos.map((p) => (
                                        <button
                                            key={`ped-${p.id}`}
                                            onClick={() => navigateTo('/pedidos')}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/30 transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                                                <ShoppingCart size={16} className="text-amber-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-900">
                                                    #{String(p.id).padStart(4, '0')}
                                                    <span className="font-medium text-slate-400 ml-2">
                                                        {p.cliente_razon_social}
                                                    </span>
                                                </p>
                                                <p className="text-[11px] text-slate-400">
                                                    Total: {formatCLP(p.total)}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                                                    ESTADO_COLORS[p.estado] ?? 'bg-slate-50 text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                {p.estado}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Footer hint */}
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {totalResults} resultado{totalResults !== 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    Haz clic para ir al módulo
                                </span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
