import { AlertTriangle } from 'lucide-react';

interface AlertProps {
    message: string;
}

export function Alert({ message }: AlertProps) {
    return (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-2" role="alert">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
}
