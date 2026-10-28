import { AlertCircle, User } from 'lucide-react';
import { inputFilter, SENDER_FIELDS, validateField } from '../../../lib/fieldValidation';

const INPUT = 'w-full h-11 px-4 bg-gray-50 border rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white transition-all';

// Step 1 "Sender Details": sender name, title and CTA / booking link.
// F-07 / F-08: each field is checked when it loses focus (and again on every change while it shows an error);
// handleStep1Submit checks all three before saving and the server's 422 field errors land here too.
export default function SenderDetailsSection({ wizard }) {
    const {
        formData, setFormData, errors = {}, setErrors
    } = wizard;
    const setError = (key, message) => setErrors?.(prev => ((prev?.[key] || '') === message ? prev : { ...prev, [key]: message }));
    const field = (key, hint) => {
        const spec = SENDER_FIELDS[key];
        const filter = inputFilter(spec);
        const error = errors[key];
        const describedBy = [hint ? `${key}-hint` : null, error ? `${key}-error` : null].filter(Boolean).join(' ');
        return {
            id: `wizard-${key}`,
            name: key,
            value: formData[key] ?? '',
            maxLength: spec.max,
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': describedBy || undefined,
            onChange: (e) => {
                const value = filter ? filter(e.target.value) : e.target.value;
                setFormData(prev => ({ ...prev, [key]: value }));
                if (error) setError(key, validateField(spec, value));
            },
            onBlur: () => setError(key, validateField(spec, formData[key])),
            className: `${INPUT} ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-400'}`,
        };
    };
    const message = (key) => errors[key] && (
        <p id={`${key}-error`} role="alert" className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{errors[key]}
        </p>
    );
    return (
        <div className="space-y-4" data-sender-details>
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #73C8D222, #4db0bb22)' }}>
                    <User className="w-3.5 h-3.5" style={{ color: '#73C8D2' }} />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                    <label htmlFor="wizard-sender_name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender Name</label>
                    <input {...field('sender_name')} placeholder="e.g. John Smith" autoComplete="name" />
                    {message('sender_name')}
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="wizard-sender_title" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender Title</label>
                    <input {...field('sender_title')} placeholder="e.g. Account Executive" />
                    {message('sender_title')}
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="wizard-cta_link" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">CTA / Booking Link</label>
                    <input {...field('cta_link', true)} type="url" inputMode="url" placeholder="https://calendly.com/..." />
                    <p id="cta_link-hint" className="text-[11px] text-gray-400">The full link, starting with https://</p>
                    {message('cta_link')}
                </div>
            </div>
        </div>
    );
}
