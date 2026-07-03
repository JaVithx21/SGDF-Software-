'use client';

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';

interface SalesData {
    name: string;
    ventas: number;
}

interface SalesChartProps {
    data: SalesData[];
    period: 'day' | 'week' | 'month';
}

export function SalesChart({ data, period }: SalesChartProps) {
    const periodLabel = {
        day: 'Ventas de Hoy (por hora)',
        week: 'Ventas de la Semana (por día)',
        month: 'Ventas del Mes (por semana)',
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">{periodLabel[period]}</h3>
            </div>
            
            <div className="h-80 w-full">
                {data.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <span className="font-medium text-sm italic">No hay datos para este período</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                tickFormatter={(value) => `$${(value / 1000)}k`}
                                dx={-10}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value, name) => {
                                    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);

                                    return [
                                        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(numericValue),
                                        typeof name === 'string' ? name : 'Ventas',
                                    ];
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="ventas"
                                stroke="#0ea5e9"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorVentas)"
                                activeDot={{ r: 6, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
