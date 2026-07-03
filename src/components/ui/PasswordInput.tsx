'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from './Input';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
    id: string;
    label: string;
}

export function PasswordInput({ id, label, ...props }: PasswordInputProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Input
            id={id}
            label={label}
            type={showPassword ? 'text' : 'password'}
            leadingIcon={<Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />}
            trailingElement={(
                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#005088]/50 rounded-md transition-colors"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                    {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                </button>
            )}
            {...props}
        />
    );
}
