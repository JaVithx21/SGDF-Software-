import { Suspense } from 'react';
import { LoginCard } from '@/components/auth/LoginCard';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function LoginPage() {
    return (
        <AuthLayout>
            <LoginCard>
                <Suspense fallback={
                    <div className="flex justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#005088]" />
                    </div>
                }>
                    <LoginForm />
                </Suspense>
            </LoginCard>
        </AuthLayout>
    );
}
