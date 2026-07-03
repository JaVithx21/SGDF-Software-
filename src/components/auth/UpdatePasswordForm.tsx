'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { updatePassword } from '@/app/(auth)/update-password/actions';

export function UpdatePasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            setIsLoading(false);
            return;
        }

        const result = await updatePassword(password);
        
        if (result?.error) {
            setError(result.error);
        } else {
            setSuccess(true);
        }
        
        setIsLoading(false);
    };

    if (success) {
        return (
            <div className="space-y-6 text-center">
                <div className="flex justify-center">
                    <div className="bg-emerald-50 p-3 rounded-full">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Contraseña Actualizada</h3>
                    <p className="text-sm text-slate-500">
                        Tu contraseña se ha actualizado correctamente. Ya puedes iniciar sesión con tu nueva clave.
                    </p>
                </div>
                <Link href="/login" className="block w-full">
                    <Button className="w-full">
                        Ir a Iniciar Sesión
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h3 className="text-2xl font-bold text-slate-900">Nueva Contraseña</h3>
                <p className="text-sm text-slate-500">
                    Ingresa tu nueva contraseña para acceder a tu cuenta.
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <PasswordInput
                    id="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    label="Nueva Contraseña"
                    placeholder="••••••••"
                />

                <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    label="Confirmar Contraseña"
                    placeholder="••••••••"
                />

                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </Button>
            </form>

            <div className="text-center">
                <Link href="/login" className="text-sm font-medium text-[#005088] hover:text-[#003d66] hover:underline flex items-center justify-center gap-2 transition-colors">
                    <ArrowLeft size={16} />
                    Volver al inicio de sesión
                </Link>
            </div>
        </div>
    );
}
