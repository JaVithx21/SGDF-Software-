'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function updatePassword(password: string) {
    if (!password || password.length < 6) {
        return { error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.updateUser({
        password: password,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
