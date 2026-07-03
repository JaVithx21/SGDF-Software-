import type { ReactNode } from 'react';
import Image from 'next/image';

interface LoginCardProps {
    children: ReactNode;
}

export function LoginCard({ children }: LoginCardProps) {
    return (
        <div className="max-w-110 w-full bg-white/85 backdrop-blur-xl p-8 sm:p-12 rounded-2xl shadow-2xl border border-white/50 z-10">
            <div className="text-center mb-10">
                <div className="flex justify-center mb-4">
                    <Image
                        src="/logo/Logo%20Distribuidora%20flores.png"
                        alt="Logo Distribuidora de Flores"
                        width={400}
                        height={160}
                        className="h-20 w-auto object-contain drop-shadow-sm"
                        priority
                    />
                </div>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-widest">
                    Acceso Administrativo
                </p>
            </div>

            {children}

            <div className="mt-8 text-center text-xs text-gray-500">
                Sistema de Gestión Distribuidora de Flores v2.4.0
                <br />
                Uso restringido a personal autorizado.
            </div>
        </div>
    );
}
