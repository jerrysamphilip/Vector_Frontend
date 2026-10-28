import { useCallback, useEffect, useRef, useState } from 'react';
import { inputFilter, normalizeForm, serverFieldErrors, validateField, validateForm } from './fieldValidation';

/**
 * Inline field errors for a form described by a fieldValidation spec table (F-07 / F-08).
 *
 *   const v = useFieldErrors(CONTACT_FIELDS, form, setForm);
 *   <form ref={v.formRef}>
 *     <Field label="Email" error={v.errors.email}><input {...v.bind('email')} /></Field>
 *   if (!v.validate()) return;              // shows every error, focuses the first invalid field
 *   payload = v.normalized();               // trimmed / E.164 phone / ISO country ...
 *   catch (err) { v.fromServer(err) }       // the server's 422 field errors next to their fields
 *
 * A field is checked when it loses focus; once it shows an error it is re-checked on every change, so the
 * message goes away as soon as the value is fixed.
 */
export function useFieldErrors(specs, form, setForm) {
    const [errors, setErrors] = useState({});
    const formRef = useRef(null);
    const focusPending = useRef(false);

    useEffect(() => {
        if (!focusPending.current) return;
        focusPending.current = false;
        const first = formRef.current?.querySelector('[aria-invalid="true"]');
        if (first && typeof first.focus === 'function') first.focus();
    }, [errors]);

    const setFieldError = useCallback((key, message) => {
        setErrors(prev => (prev[key] === message || (!prev[key] && !message) ? prev : { ...prev, [key]: message }));
    }, []);

    const validate = () => {
        const next = validateForm(specs, form);
        focusPending.current = Object.keys(next).length > 0;
        setErrors(next);
        return !focusPending.current;
    };

    const fromServer = (error) => {
        const fieldErrors = serverFieldErrors(error);
        const known = Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => k in specs || k in form));
        if (Object.keys(known).length) {
            focusPending.current = true;
            setErrors(prev => ({ ...prev, ...known }));
        }
        return known;
    };

    /** Props for a plain <input>: value, onChange (filtered), onBlur (checks), maxLength. */
    const bind = (key) => {
        const spec = specs[key];
        const filter = inputFilter(spec);
        return {
            name: key,
            value: form[key] ?? '',
            maxLength: spec?.max && spec.kind !== 'number' ? spec.max : undefined,
            onChange: (e) => {
                const raw = e?.target ? e.target.value : e;
                const value = filter && typeof raw === 'string' ? filter(raw) : raw;
                setForm(f => ({ ...f, [key]: value }));
                if (errors[key]) setFieldError(key, validateField(spec, value, { ...form, [key]: value }));
            },
            onBlur: () => setFieldError(key, validateField(spec, form[key], form)),
        };
    };

    return {
        errors,
        formRef,
        bind,
        validate,
        fromServer,
        setErrors,
        normalized: () => normalizeForm(specs, form),
        hasErrors: Object.values(errors).some(Boolean),
    };
}
