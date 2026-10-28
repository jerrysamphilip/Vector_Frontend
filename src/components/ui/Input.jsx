import React, { useId } from 'react';

// Form fields (F-24): with `error`, the control gets aria-invalid and aria-describedby pointing at the error
// text (role="alert", so it is announced when it appears). `hint` is extra help text, also described-by.
// An aria-describedby passed by the caller is kept.

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
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </label>
);

/** ids and aria props shared by Input / Select / Textarea. */
function useFieldA11y({ id, error, hint, describedBy, invalid }) {
    const generated = useId().replace(/:/g, '');
    const base = id || `field-${generated}`;
    const errorId = `${base}-error`;
    const hintId = `${base}-hint`;
    const ids = [describedBy, hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
    const isInvalid = Boolean(error) || invalid === true || invalid === 'true';
    return {
        controlProps: {
            'aria-invalid': isInvalid ? 'true' : undefined,
            'aria-describedby': ids || undefined,
        },
        errorId,
        hintId,
    };
}

function FieldMessages({ error, hint, errorId, hintId }) {
    return (
        <>
            {hint && (
                <p id={hintId} className="mt-1.5 text-xs text-slate-500">{hint}</p>
            )}
            {error && (
                <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-500 font-medium animate-fade-in">
                    {error}
                </p>
            )}
        </>
    );
}

export const Input = React.forwardRef(({ className = '', error, hint, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) => {
    const { controlProps, errorId, hintId } = useFieldA11y({ id: props.id, error, hint, describedBy, invalid });
    return (
        <div className="relative">
            <input
                ref={ref}
                className={`input ${error ? 'border-red-300 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''} ${className}`}
                {...props}
                {...controlProps}
            />
            <FieldMessages error={error} hint={hint} errorId={errorId} hintId={hintId} />
        </div>
    );
});

export const Select = React.forwardRef(({ className = '', children, error, hint, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) => {
    const { controlProps, errorId, hintId } = useFieldA11y({ id: props.id, error, hint, describedBy, invalid });
    return (
        <div className="relative">
            <select
                ref={ref}
                className={`select w-full ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
                {...props}
                {...controlProps}
            >
                {children}
            </select>
            <FieldMessages error={error} hint={hint} errorId={errorId} hintId={hintId} />
        </div>
    );
});

export const Textarea = React.forwardRef(({ className = '', error, hint, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...props }, ref) => {
    const { controlProps, errorId, hintId } = useFieldA11y({ id: props.id, error, hint, describedBy, invalid });
    return (
        <div className="relative">
            <textarea
                ref={ref}
                className={`input min-h-[96px] ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
                {...props}
                {...controlProps}
            />
            <FieldMessages error={error} hint={hint} errorId={errorId} hintId={hintId} />
        </div>
    );
});

Input.displayName = 'Input';
Select.displayName = 'Select';
Textarea.displayName = 'Textarea';
