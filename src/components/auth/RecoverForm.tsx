'use client';

import { useState, type FormEvent } from 'react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { recoverPassword } from '@/app/(auth)/recover/actions';

export function RecoverForm() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        const result = await recoverPassword(email);
        
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
                    <h3 className="text-xl font-bold text-slate-900">Correo enviado</h3>
                    <p className="text-sm text-slate-500">
                        Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Por favor revisa tu bandeja de entrada.
                    </p>
                </div>
                <Link href="/login" className="block w-full">
                    <Button className="w-full">
                        Volver al inicio de sesión
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <h3 className="text-2xl font-bold text-slate-900">Recuperar Contraseña</h3>
                <p className="text-sm text-slate-500">
                    Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
            </div>

            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    label="Correo Electrónico"
                    leadingIcon={<Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />}
                    placeholder="ejemplo@distribuidora.com"
                />

                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Enviando...' : 'Enviar enlace'}
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
