import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down';
    subtitle?: string;
    icon: LucideIcon;
    colorClass: string;
}

export function KpiCard({ title, value, change, trend, subtitle, icon: Icon, colorClass }: KpiCardProps) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-start hover:shadow-md transition-shadow duration-200">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{value}</h3>
                {change && (
                    <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{change}</span>
                    </div>
                )}
                {subtitle && (
                    <p className="text-xs text-slate-400 mt-2 italic">{subtitle}</p>
                )}
            </div>
            <div className={`p-3 rounded-lg ${colorClass}`}>
                <Icon size={24} />
            </div>
        </div>
    );
}
