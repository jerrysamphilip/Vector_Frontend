import React from 'react';

/**
 * Card Component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {'default' | 'glass' | 'plain'} [props.variant='default']
 * @param {'none' | 'sm' | 'md' | 'lg'} [props.padding='md']
 */
export const Card = ({
    children,
    className = '',
    variant = 'default',
    padding = 'md',
    ...props
}) => {
    const baseStyles = 'transition-all duration-200';

    const variants = {
        default: 'card', // Defined in index.css
        glass: 'card-glass', // Defined in index.css
        plain: 'bg-white border border-slate-200 rounded-xl'
    };

    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    return (
        <div
            className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className = '' }) => (
    <div className={`mb-6 ${className}`}>
        {children}
    </div>
);

export const CardTitle = ({ children, className = '' }) => (
    <h3 className={`text-h3 text-slate-900 ${className}`}>
        {children}
    </h3>
);

export const CardDescription = ({ children, className = '' }) => (
    <p className={`text-sm text-slate-500 mt-1 ${className}`}>
        {children}
    </p>
);

export const CardContent = ({ children, className = '' }) => (
    <div className={className}>
        {children}
    </div>
);

export const CardFooter = ({ children, className = '' }) => (
    <div className={`mt-6 pt-6 border-t border-slate-100 flex items-center justify-end gap-3 ${className}`}>
        {children}
    </div>
);
