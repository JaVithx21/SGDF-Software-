import type { ReactNode } from 'react';

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 sm:px-6 lg:px-8 font-sans">
            {/* Background Image Layer */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url("/logo/fondo.png")',
                    filter: 'brightness(0.7)'
                }}
            />

            {/* Content Layer */}
            <div className="relative z-10 w-full flex justify-center">
                {children}
            </div>
        </div>
    );
}
