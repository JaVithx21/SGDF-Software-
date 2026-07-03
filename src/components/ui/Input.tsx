import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
    id: string;
    label: string;
    leadingIcon?: ReactNode;
    trailingElement?: ReactNode;
}

export function Input({
    id,
    label,
    leadingIcon,
    trailingElement,
    className = '',
    ...props
}: InputProps) {
    const leftPadding = leadingIcon ? 'pl-10' : 'pl-4';
    const rightPadding = trailingElement ? 'pr-11' : 'pr-4';

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-semibold text-gray-900 mb-2">
                {label}
            </label>
            <div className="relative rounded-lg shadow-sm">
                {leadingIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {leadingIcon}
                    </div>
                )}

                <input
                    id={id}
                    name={id}
                    className={`block w-full ${leftPadding} ${rightPadding} py-3 border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-[#005088] focus:ring-4 focus:ring-[#005088]/15 sm:text-base text-gray-900 ${className}`.trim()}
                    {...props}
                />

                {trailingElement && (
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                        {trailingElement}
                    </div>
                )}
            </div>
        </div>
    );
}
