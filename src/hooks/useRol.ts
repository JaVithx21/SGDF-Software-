'use client';

import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/constants/roles';
import { useCallback, useEffect, useState } from 'react';

interface UseRolReturn {
    rol: UserRole | null;
    nombre: string | null;
    email: string | null;
    isLoading: boolean;
    isAdmin: boolean;
    isGerente: boolean;
    isVendedor: boolean;
    hasAccess: (allowedRoles: UserRole[]) => boolean;
}

export function useRol(): UseRolReturn {
    const [rol, setRol] = useState<UserRole | null>(null);
    const [nombre, setNombre] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRol = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setIsLoading(false);
                return;
            }

            setEmail(user.email ?? null);

            const { data: perfil } = await supabase
                .from('usuarios')
                .select('nombre, rol')
                .eq('id', user.id)
                .single();

            if (perfil) {
                setRol(perfil.rol as UserRole);
                setNombre(perfil.nombre);
            }

            setIsLoading(false);
        };

        fetchRol();
    }, []);

    const hasAccess = useCallback(
        (allowedRoles: UserRole[]) => {
            if (!rol) return false;
            return allowedRoles.includes(rol);
        },
        [rol]
    );

    return {
        rol,
        nombre,
        email,
        isLoading,
        isAdmin: rol === 'admin',
        isGerente: rol === 'gerente',
        isVendedor: rol === 'vendedor',
        hasAccess,
    };
}
