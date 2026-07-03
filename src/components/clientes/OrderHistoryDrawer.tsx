'use client';

import { useEffect } from 'react';
import {
    X,
    ExternalLink,
    CircleDollarSign,
    TrendingUp,
    Package,
    AlertCircle,
    Calendar,
    FileText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PedidoHistorialResult } from '@/app/(dashboard)/clientes/actions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OrderHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: {
        razon_social: string;
        rut: string | null;
        saldo_pendiente: number;
    } | null;
    pedidos: PedidoHistorialResult[];
    totalVentas: number;
    pedidosActivos: number;
    loading: boolean;
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

function StatBox({
    label,
    value,
    icon: Icon,
    colorClass,
}: {
    label: string;
    value: string;
    // allow any props for icon components from lucide-react
    icon: LucideIcon;
    colorClass: string;
}) {
    return (
        <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={colorClass} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {label}
                </span>
            </div>
            <p className="text-sm font-black text-slate-900">{value}</p>
        </div>
    );
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
        <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${style}`}
        >
            {label}
        </span>
    );
}

// ─── Main Drawer Component ──────────────────────────────────────────────────

export function OrderHistoryDrawer({
    isOpen,
    onClose,
    cliente,
    pedidos,
    totalVentas,
    pedidosActivos,
    loading,
}: OrderHistoryDrawerProps) {
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

    // Generate Estado de Cuenta text and download as file
    const handleDownloadStatement = () => {
        if (!cliente) return;

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

        // Right box (Estado de Cuenta)
        const boxWidth = 55;
        const boxHeight = 16;
        const boxX = pageWidth - margin - boxWidth;
        const boxY = 20;

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.rect(boxX, boxY, boxWidth, boxHeight);
        doc.line(boxX, boxY + 8, boxX + boxWidth, boxY + 8); // middle divider

        doc.setFontSize(8);
        doc.text('ESTADO DE CUENTA', boxX + boxWidth / 2, boxY + 5.5, { align: 'center' });

        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        const dateStr = new Date().toLocaleDateString('es-CL');
        doc.text(`FECHA`, boxX + 5, boxY + 13.5);
        doc.setTextColor(0, 0, 0);
        doc.text(dateStr, boxX + boxWidth - 5, boxY + 13.5, { align: 'right' });

        // --- 2. Client Section ---
        let currentY = 50;
        const clientBoxHeight = 25;

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
        doc.text(cliente.razon_social || 'Consumidor Final', margin + 25, currentY + 10);

        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('RUT:', margin + 120, currentY + 10);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(cliente.rut || '76.XXX.XXX-X', margin + 130, currentY + 10);

        // Lines for inputs
        doc.setDrawColor(220, 220, 220);
        doc.line(margin + 25, currentY + 11, margin + 115, currentY + 11);
        doc.line(margin + 130, currentY + 11, pageWidth - margin - 5, currentY + 11);

        // Line 2
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('PEDIDOS ACTIVOS:', margin + 5, currentY + 20);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(pedidosActivos.toString(), margin + 35, currentY + 20);
        doc.line(margin + 35, currentY + 21, pageWidth - margin - 5, currentY + 21);

        // --- 3. Orders Table ---
        currentY += clientBoxHeight + 10;

        const tableData = pedidos.map(p => [
            `#${p.id}`,
            formatFecha(p.created_at),
            p.estado.toUpperCase(),
            formatCLP(p.total),
            formatCLP(p.saldo)
        ]);

        // Add some empty rows to match the visual style of a formal receipt if needed
        const rowsToAdd = Math.max(0, 5 - tableData.length);
        for (let i = 0; i < rowsToAdd; i++) {
            tableData.push(['', '', '', '', '']);
        }

        autoTable(doc, {
            startY: currentY,
            head: [['NO.', 'FECHA', 'ESTADO', 'TOTAL', 'SALDO PEND.']],
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
                1: { halign: 'center', cellWidth: 30 },
                2: { halign: 'center', cellWidth: 30 },
                3: { halign: 'right' },
                4: { halign: 'right' }
            },
            margin: { left: margin, right: margin }
        });

        // --- 4. Bottom Section ---
        const typedDoc = doc as unknown as { lastAutoTable?: { finalY?: number } };
        const finalY = ((typedDoc.lastAutoTable?.finalY ?? currentY + 40) + 15);

        // Left side: Signature box
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.rect(margin, finalY + 10, 50, 20);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPEDIDA POR:', margin + 5, finalY + 15);

        doc.line(margin + 5, finalY + 25, margin + 45, finalY + 25);
        doc.setFont('helvetica', 'normal');
        doc.text('Administración', margin + 25, finalY + 28, { align: 'center' });

        // Right side: Totals Box
        const summaryWidth = 60;
        const summaryX = pageWidth - margin - summaryWidth;
        const summaryY = finalY;

        // VENTAS HISTÓRICAS
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.rect(summaryX, summaryY, summaryWidth, 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('VENTAS TOTALES', summaryX + 5, summaryY + 5.5);
        doc.setTextColor(0, 0, 0);
        doc.text(formatCLP(totalVentas), summaryX + summaryWidth - 2, summaryY + 5.5, { align: 'right' });

        // PAGADO APROX.
        doc.rect(summaryX, summaryY + 8, summaryWidth, 8);
        doc.setTextColor(100, 100, 100);
        doc.text('PAGADO APROX.', summaryX + 5, summaryY + 13.5);
        doc.setTextColor(0, 0, 0);
        doc.text(formatCLP(totalVentas - cliente.saldo_pendiente), summaryX + summaryWidth - 2, summaryY + 13.5, { align: 'right' });

        // DEUDA TOTAL (Blue block)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(summaryX, summaryY + 16, summaryWidth, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text('DEUDA TOTAL', summaryX + 5, summaryY + 22.5);
        doc.text(formatCLP(cliente.saldo_pendiente), summaryX + summaryWidth - 2, summaryY + 22.5, { align: 'right' });

        // Add Saldo Status below
        doc.setFontSize(8);
        if (cliente.saldo_pendiente <= 0) {
            doc.setTextColor(16, 185, 129); // emerald
            doc.text('ESTADO: AL DÍA (SIN DEUDA)', summaryX + summaryWidth, summaryY + 34, { align: 'right' });
        } else {
            doc.setTextColor(225, 29, 72); // rose
            doc.text(`DEUDA PENDIENTE`, summaryX + summaryWidth, summaryY + 34, { align: 'right' });
        }

        // --- 5. Footer real ---
        const bottomY = doc.internal.pageSize.height - 15;
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text('Flores Catalán - Distribución al por mayor', pageWidth / 2, bottomY, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('www.florescatalan.cl | contacto@florescatalan.cl | +56 9 XXXX XXXX', pageWidth / 2, bottomY + 5, { align: 'center' });

        // Trigger Download
        doc.save(`Estado_Cuenta_${cliente.razon_social.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
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
                className={`fixed right-0 top-0 h-full w-full sm:w-520px lg:w-[40%] bg-white shadow-2xl z-101 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <header className="p-8 border-b border-slate-100 shrink-0">
                    <div className="flex justify-between items-start mb-6">
                        <div className="pr-4">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                {cliente?.razon_social ?? ''}
                            </h2>
                            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                RUT: {cliente?.rut ?? 'N/A'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all outline-none focus:ring-2 focus:ring-[#005088]"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex gap-3">
                        <StatBox
                            label="Total Ventas"
                            value={formatCLP(totalVentas)}
                            icon={TrendingUp}
                            colorClass="text-blue-600"
                        />
                        <StatBox
                            label="Pedidos Activos"
                            value={pedidosActivos.toString()}
                            icon={Package}
                            colorClass="text-[#005088]"
                        />
                        <StatBox
                            label="Saldo Pendiente"
                            value={formatCLP(cliente?.saldo_pendiente ?? 0)}
                            icon={AlertCircle}
                            colorClass="text-orange-600"
                        />
                    </div>
                </header>

                {/* Content: Order Table */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">
                        Historial de Pedidos
                    </h3>

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#005088] rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm text-slate-400 font-medium">
                                Cargando historial...
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-4 py-3">#ID</th>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Saldo
                                        </th>
                                        <th className="px-4 py-3 text-center">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {pedidos.length > 0 ? (
                                        pedidos.map((p) => (
                                            <tr
                                                key={p.id}
                                                className="hover:bg-slate-50/50 transition-colors group"
                                            >
                                                <td className="px-4 py-4 text-xs font-black text-[#005088]">
                                                    #{p.id}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                        <Calendar
                                                            size={12}
                                                            className="opacity-40"
                                                        />
                                                        {formatFecha(
                                                            p.created_at
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 flex flex-col gap-1 items-start">
                                                    <StatusBadge
                                                        estado={p.estado}
                                                    />
                                                    {p.estado !== 'anulado' && <FinancialStatusBadge saldo={p.saldo} total={p.total} />}
                                                </td>
                                                <td className="px-4 py-4 text-right text-xs font-bold text-slate-900">
                                                    {formatCLP(p.total)}
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span
                                                        className={`text-xs font-black ${p.saldo > 0
                                                                ? 'text-orange-600'
                                                                : 'text-slate-400'
                                                            }`}
                                                    >
                                                        {formatCLP(p.saldo)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <a
                                                            href={`/pedidos?id=${p.id}`}
                                                            title="Ver Detalle"
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#005088] hover:bg-blue-50 transition-all"
                                                        >
                                                            <ExternalLink
                                                                size={16}
                                                            />
                                                        </a>
                                                        {p.saldo > 0 && (
                                                            <a
                                                                href="/finanzas"
                                                                title="Registrar Pago"
                                                                className="p-1.5 rounded-lg text-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                                                            >
                                                                <CircleDollarSign
                                                                    size={16}
                                                                />
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-6 py-20 text-center"
                                            >
                                                <Package
                                                    size={48}
                                                    className="mx-auto text-slate-200 mb-4"
                                                />
                                                <p className="text-slate-500 font-medium">
                                                    Este cliente aún no registra
                                                    pedidos.
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="p-6 border-t border-slate-100 flex justify-between items-center bg-white shrink-0">
                    {pedidos.length > 0 && (
                        <button
                            onClick={handleDownloadStatement}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#005088] bg-blue-50 hover:bg-blue-100 transition-all outline-none focus:ring-2 focus:ring-[#005088]"
                        >
                            <FileText size={16} />
                            Descargar Estado de Cuenta
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all outline-none focus:ring-2 focus:ring-[#005088] ml-auto"
                    >
                        Cerrar
                    </button>
                </footer>
            </div>
        </>
    );
}
