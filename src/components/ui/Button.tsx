import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}

export function Button({ children, className = '', ...props }: ButtonProps) {
    return (
        <button
            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg text-base font-semibold text-white bg-[#005088] hover:bg-[#003d66] focus:outline-none focus:ring-4 focus:ring-[#005088]/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 ${className}`.trim()}
            {...props}
        >
            {children}
        </button>
    );
}
