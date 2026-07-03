'use client';

import { Bell, HelpCircle } from 'lucide-react';
import type { UserRole } from '@/constants/roles';
import { ROLE_LABELS } from '@/constants/roles';
import { GlobalSearch } from '@/components/dashboard/GlobalSearch';

interface TopbarProps {
    userName: string;
    userRole: UserRole;
}

export function Topbar({ userName, userRole }: TopbarProps) {
    return (
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
            {/* Global Search */}
            <GlobalSearch />

            {/* Right section */}
            <div className="flex items-center gap-5">
                <button
                    className="relative text-slate-400 hover:text-[#005088] transition-colors p-2 rounded-lg hover:bg-slate-100"
                    aria-label="Notificaciones"
                >
                    <Bell size={20} />
                    {/* Notification badge */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                </button>

                <button
                    className="text-slate-400 hover:text-[#005088] transition-colors p-2 rounded-lg hover:bg-slate-100"
                    aria-label="Ayuda"
                >
                    <HelpCircle size={20} />
                </button>

                <div className="h-8 w-px bg-slate-200" />

                {/* User info */}
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 leading-none">{userName}</p>
                        <p className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wider">{ROLE_LABELS[userRole]}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#005088] flex items-center justify-center text-white font-bold text-sm shadow-md uppercase">
                        {userName?.charAt(0) || '?'}
                    </div>
                </div>
            </div>
        </header>
    );
}
