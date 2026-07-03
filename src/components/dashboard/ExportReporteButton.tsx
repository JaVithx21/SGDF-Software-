'use client';

import { FileDown } from 'lucide-react';

import * as XLSX from 'xlsx';

type ExportReporteButtonProps = {
    ingresosTotales: string;
    cuentasPorCobrar: string;
    pedidosPendientes: string;
    fechaArchivo: string;
};

export function ExportReporteButton({
    ingresosTotales,
    cuentasPorCobrar,
    pedidosPendientes,
    fechaArchivo,                
}: ExportReporteButtonProps) {
    const handleExportExcel = () => {
        const rows = [
            ['Métrica', 'Valor'],
            ['Ingresos Totales', ingresosTotales],
            ['Cuentas por Cobrar', cuentasPorCobrar],
            ['Pedidos Pendientes', pedidosPendientes],
        ];

        // Crear hoja de trabajo (worksheet)
        const ws = XLSX.utils.aoa_to_sheet(rows);
        
        // Estilos básicos (ancho de columnas)
        ws['!cols'] = [{ wch: 20 }, { wch: 20 }];

        // Crear libro de trabajo (workbook)
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte_KPI");

        // Generar y descargar archivo Excel
        XLSX.writeFile(wb, `reporte_sgdf_${fechaArchivo}.xlsx`);
    };

    return (
        <button
            type="button"
            onClick={handleExportExcel}
            className="bg-[#005088] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#003d66] transition-colors shadow-lg shadow-[#005088]/20"
        >
            <FileDown size={18} />
            Exportar Reporte
        </button>
    );
}
