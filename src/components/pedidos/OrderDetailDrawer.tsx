'use client';

import { useEffect } from 'react';
import {
    X,
    FileText,
    CreditCard,
    CheckCircle2,
    Calendar,
    Trash2,
    RefreshCcw,
    PlusCircle,
    Download,
} from 'lucide-react';
import { useUserRole } from '@/contexts/UserRoleContext';
import type { PedidoDetalleResult } from '@/app/(dashboard)/pedidos/actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    pedido: {
        id: number;
        cliente: string;
        rut: string;
        estado: string;
        total: number;
        saldo: number;
    } | null;
    detalles: PedidoDetalleResult['detalles'];
    pagos: PedidoDetalleResult['pagos'];
    loading: boolean;
    // Callbacks for actions
    onAnular: (id: number) => void;
    onCambiarEstado: (id: number) => void;
    onRegistrarPago: (id: number) => void;
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

function StatusBadge({ estado }: { estado: string }) {
    const styles: Record<string, string> = {
        pendiente: 'bg-amber-50 text-amber-600 border-amber-100',
        confirmado: 'bg-blue-50 text-blue-600 border-blue-100',
        entregado: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        anulado: 'bg-rose-50 text-rose-600 border-rose-100',
    };
    return (
        <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${styles[estado] ?? styles.pendiente
                }`}
        >
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
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${style}`}>
            {label}
        </span>
    );
}

// ─── Main Drawer Component ──────────────────────────────────────────────────

export function OrderDetailDrawer({
    isOpen,
    onClose,
    pedido,
    detalles,
    pagos,
    loading,
    onAnular,
    onCambiarEstado,
    onRegistrarPago,
}: OrderDetailDrawerProps) {
    const userRole = useUserRole();
    const isAdmin = (userRole as unknown as { isAdmin?: boolean }).isAdmin ?? false;
    const isManager = (userRole as unknown as { isManager?: boolean }).isManager ?? false;
    const canSeeCostAndUtility = isAdmin || isManager;

    // Block body scroll while drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleDownloadPDF = () => {
        if (!pedido) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;
        const primaryColor: [number, number, number] = [31, 78, 121]; // #1f4e79
        const borderColor: [number, number, number] = [210, 210, 210];

        // --- 1. Header ---
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('FLORES CATALÁN', margin, 30);

        // Right box (Nota de Venta)
        const boxWidth = 50;
        const boxHeight = 16;
        const boxX = pageWidth - margin - boxWidth;
        const boxY = 20;

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);
        doc.line(boxX, boxY + 8, boxX + boxWidth, boxY + 8); // middle divider

        doc.setFontSize(8);
        doc.text('NOTA DE VENTA', boxX + boxWidth / 2, boxY + 5.5, { align: 'center' });
        
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        const dateStr = new Date().toLocaleDateString('es-CL');
        doc.text(`FECHA`, boxX + 5, boxY + 13.5);
        doc.setTextColor(0, 0, 0);
        doc.text(dateStr, boxX + boxWidth - 5, boxY + 13.5, { align: 'right' });

        // --- 2. Client Section ---
        let currentY = 50;
        const clientBoxHeight = 35;
        
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, currentY, pageWidth - margin * 2, clientBoxHeight, 2, 2);

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        
        // Line 1
        doc.text('CLIENTE:', margin + 5, currentY + 10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(pedido.cliente || 'Consumidor Final', margin + 25, currentY + 10);
        
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('RUT:', margin + 120, currentY + 10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(pedido.rut || '76.XXX.XXX-X', margin + 130, currentY + 10);

        // Lines for inputs
        doc.setDrawColor(220, 220, 220);
        doc.line(margin + 25, currentY + 11, margin + 115, currentY + 11);
        doc.line(margin + 130, currentY + 11, pageWidth - margin - 5, currentY + 11);

        // Line 2
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('DIRECCIÓN:', margin + 5, currentY + 20);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('No especificada', margin + 25, currentY + 20);
        doc.line(margin + 25, currentY + 21, pageWidth - margin - 5, currentY + 21);

        // Line 3
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('E-MAIL:', margin + 5, currentY + 30);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('contacto@cliente.com', margin + 25, currentY + 30);
        doc.line(margin + 25, currentY + 31, pageWidth - margin - 5, currentY + 31);

        // --- 3. Product Table ---
        currentY += clientBoxHeight + 10;

        const tableData = detalles.map((item) => [
            item.cantidad,
            item.producto_nombre,
            new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.precio_unitario),
            new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(item.subtotal)
        ]);

        // Add empty rows to match the visual style of a formal receipt
        for (let i = 0; i < 5; i++) {
            tableData.push(['', '', '', '']);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['CANT.', 'DESCRIPCIÓN', 'P. UNIT.', 'IMPORTE']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [100, 100, 100],
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: borderColor,
                halign: 'center'
            },
            bodyStyles: {
                textColor: [0, 0, 0],
                lineWidth: 0.1,
                lineColor: borderColor
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 20 },
                1: { halign: 'left' },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 }
            },
            margin: { left: margin, right: margin }
        });

        // --- 4. Bottom Section ---
        const finalY = (((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY) ?? currentY + 40) + 15;
        
        // Left side: Cantidad con letra / Expedida por
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('CANTIDAD CON LETRA:', margin, finalY);

        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.rect(margin, finalY + 10, 50, 20);
        doc.setFontSize(7);
        doc.text('EXPEDIDA POR:', margin + 5, finalY + 15);
        
        doc.line(margin + 5, finalY + 25, margin + 45, finalY + 25);
        doc.setFont('helvetica', 'normal');
        doc.text('Administración', margin + 25, finalY + 28, { align: 'center' }); 

        // Right side: Totals Box
        const summaryWidth = 60;
        const summaryX = pageWidth - margin - summaryWidth;
        const summaryY = finalY;

        const subtotalCalc = Math.round(pedido.total / 1.19);
        const ivaCalc = pedido.total - subtotalCalc;
        const formatVal = (v: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(v);

        // Subtotal
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.rect(summaryX, summaryY, summaryWidth, 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('SUB-TOTAL', summaryX + 5, summaryY + 5.5);
        doc.setTextColor(0, 0, 0);
        doc.text(formatVal(subtotalCalc), summaryX + summaryWidth - 2, summaryY + 5.5, { align: 'right' });

        // I.V.A. (19%)
        doc.rect(summaryX, summaryY + 8, summaryWidth, 8);
        doc.setTextColor(100, 100, 100);
        doc.text('I.V.A. (19%)', summaryX + 5, summaryY + 13.5);
        doc.setTextColor(0, 0, 0);
        doc.text(formatVal(ivaCalc), summaryX + summaryWidth - 2, summaryY + 13.5, { align: 'right' });

        // TOTAL (Blue block)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(summaryX, summaryY + 16, summaryWidth, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text('TOTAL', summaryX + 5, summaryY + 22.5);
        doc.text(formatVal(pedido.total), summaryX + summaryWidth - 2, summaryY + 22.5, { align: 'right' });
        
        // Add Saldo Status below
        doc.setFontSize(8);
        if (pedido.saldo === 0) {
            doc.setTextColor(16, 185, 129); // emerald
            doc.text('ESTADO: PAGADO', summaryX + summaryWidth, summaryY + 34, { align: 'right' });
        } else {
            doc.setTextColor(225, 29, 72); // rose
            doc.text(`SALDO PENDIENTE: ${formatVal(pedido.saldo)}`, summaryX + summaryWidth, summaryY + 34, { align: 'right' });
        }

        // Save
        doc.save(`Nota_Venta_${String(pedido.id).padStart(4, '0')}.pdf`);
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-100 transition-opacity duration-300 ${isOpen
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed right-0 top-0 h-full w-full sm:w-600px lg:w-[45%] bg-white shadow-2xl z-101 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <header className="p-8 border-b border-slate-100 shrink-0 bg-white">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                Pedido #{pedido?.id}
                            </h2>
                            <p className="text-sm font-bold text-slate-400 mt-1">
                                {pedido?.cliente ?? ''}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all outline-none focus:ring-2 focus:ring-[#005088]"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        {pedido && (
                            <div className="flex gap-2">
                                <StatusBadge estado={pedido.estado} />
                                {pedido.estado !== 'anulado' && <FinancialStatusBadge saldo={pedido.saldo} total={pedido.total} />}
                            </div>
                        )}
                        {pedido && (
                            <span className="text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                Total: {formatCLP(pedido.total)}
                            </span>
                        )}
                        {pedido && pedido.saldo > 0 && (
                            <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">
                                Saldo: {formatCLP(pedido.saldo)}
                            </span>
                        )}
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 space-y-8">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#005088] rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm text-slate-400 font-medium">
                                Cargando detalle...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Products Table */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <FileText size={18} />
                                    <h3 className="text-sm font-black uppercase tracking-widest">
                                        Detalle de Productos
                                    </h3>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                                    <table className="w-full text-left border-collapse min-w-500px">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <th className="px-6 py-4">Producto</th>
                                                <th className="px-6 py-4 text-center">Cant.</th>
                                                <th className="px-6 py-4 text-right">Precio</th>
                                                {canSeeCostAndUtility && (
                                                    <th className="px-6 py-4 text-right text-[#005088]">Utilidad</th>
                                                )}
                                                <th className="px-6 py-4 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-sm">
                                            {detalles.map((item) => {
                                                const utilidad = (item.precio_unitario - item.costo_unitario) * item.cantidad;
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-900">
                                                            {item.producto_nombre}
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium text-slate-600">
                                                            {item.cantidad}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-600">
                                                            {formatCLP(item.precio_unitario)}
                                                        </td>
                                                        {canSeeCostAndUtility && (
                                                            <td className="px-6 py-4 text-right text-[#005088] font-bold">
                                                                {formatCLP(utilidad)}
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-right font-black text-slate-900">
                                                            {formatCLP(item.subtotal)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {detalles.length === 0 && (
                                                <tr>
                                                    <td colSpan={canSeeCostAndUtility ? 5 : 4} className="px-6 py-8 text-center text-slate-500 text-sm">
                                                        No hay productos en este pedido.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Payments Log */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <CreditCard size={18} />
                                    <h3 className="text-sm font-black uppercase tracking-widest">
                                        Historial de Pagos
                                    </h3>
                                </div>
                                <div className="space-y-2">
                                    {pagos.length > 0 ? (
                                        pagos.map((pago) => (
                                            <div
                                                key={pago.id}
                                                className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 uppercase">
                                                            {pago.metodo_pago}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
                                                            <Calendar size={12} />
                                                            {formatFecha(pago.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-base font-black text-emerald-700">
                                                        {formatCLP(pago.monto)}
                                                    </p>
                                                    {pago.referencia && (
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 max-w-120px] truncate">
                                                            Ref: {pago.referencia}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                                            <p className="text-sm text-slate-400 font-medium">
                                                No se registran abonos para este pedido.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <footer className="p-6 border-t border-slate-100 bg-white grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={loading || !pedido}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        <Download size={18} />
                        PDF
                    </button>
                    <button
                        onClick={() => pedido && onAnular(pedido.id)}
                        disabled={loading || pedido?.estado === 'anulado' || pedido?.estado === 'entregado'}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-rose-500 bg-rose-50 hover:bg-rose-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-rose-500"
                        title={pedido?.estado === 'entregado' ? 'No se puede anular un pedido entregado' : 'Anular pedido'}
                    >
                        <Trash2 size={18} />
                        Anular
                    </button>
                    <button
                        onClick={() => pedido && onCambiarEstado(pedido.id)}
                        disabled={loading || pedido?.estado === 'anulado'}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-[#005088] bg-blue-50 hover:bg-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-[#005088]"
                    >
                        <RefreshCcw size={18} />
                        Estado
                    </button>
                    <button
                        onClick={() => pedido && onRegistrarPago(pedido.id)}
                        disabled={loading || pedido?.estado === 'anulado' || (pedido?.saldo ?? 0) <= 0}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <PlusCircle size={18} />
                        Pago
                    </button>
                </footer>
            </div>
        </>
    );
}
