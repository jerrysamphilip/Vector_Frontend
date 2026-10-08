import React from 'react';

export const FormGroup = ({ children, className = '' }) => (
    <div className={`space-y-1.5 ${className}`}>
        {children}
    </div>
);

export const Label = ({ children, htmlFor, className = '', required }) => (
    <label
        htmlFor={htmlFor}
        className={`block text-sm font-medium text-slate-700 ${className}`}
    >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
    </label>
);

export const Input = React.forwardRef(({ className = '', error, ...props }, ref) => {
    return (
        <div className="relative">
            <input
                ref={ref}
                className={`input ${error ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''} ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in">
                    {error}
                </p>
            )}
        </div>
    );
});

export const Select = React.forwardRef(({ className = '', children, error, ...props }, ref) => {
    return (
        <div className="relative">
            <select
                ref={ref}
                className={`select w-full ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
                {...props}
            >
                {children}
            </select>
            {error && (
                <p className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in">
                    {error}
                </p>
            )}
        </div>
    );
});
