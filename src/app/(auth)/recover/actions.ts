'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function recoverPassword(email: string) {
    if (!email) return { error: 'El correo electrónico es requerido.' };

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/update-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}
