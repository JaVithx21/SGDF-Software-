'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export type TimeFilterType = 'day' | 'week' | 'month';

export function TimeFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentPeriod = (searchParams.get('period') as TimeFilterType) || 'day';

    const handlePeriodChange = (period: TimeFilterType) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('period', period);
        router.push(`?${params.toString()}`);
    };

    return (
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
                onClick={() => handlePeriodChange('day')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors ${
                    currentPeriod === 'day' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
                Día
            </button>
            <button
                onClick={() => handlePeriodChange('week')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors ${
                    currentPeriod === 'week' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
                Semana
            </button>
            <button
                onClick={() => handlePeriodChange('month')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-sm transition-colors ${
                    currentPeriod === 'month' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
                Mes
            </button>
        </div>
    );
}
