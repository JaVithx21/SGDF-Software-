import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
    id: string;
    label: string;
}

export function Checkbox({ id, label, className = '', ...props }: CheckboxProps) {
    return (
        <label htmlFor={id} className="flex items-center gap-2 cursor-pointer group">
            <input
                id={id}
                name={id}
                type="checkbox"
                className={`h-4 w-4 text-[#005088] border-gray-300 rounded focus:ring-[#005088] cursor-pointer transition-colors ${className}`.trim()}
                {...props}
            />
            <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                {label}
            </span>
        </label>
    );
}
