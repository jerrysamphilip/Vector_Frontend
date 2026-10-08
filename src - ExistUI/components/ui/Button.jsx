import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className = '',
    disabled,
    ...props
}) {
    const baseClass = 'btn';

    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        destructive: 'bg-red-500 text-white hover:bg-red-600 border-transparent'
    };

    // Note: 'size' is largely controlled by CSS strict height, 
    // but we can add utility padding if needed for 'sm' or 'lg'.
    // For this strict design, we keep standard height.

    return (
        <button
            className={`${baseClass} ${variantClasses[variant]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 className="spinner w-4 h-4" />}
            {children}
        </button>
    );
}
