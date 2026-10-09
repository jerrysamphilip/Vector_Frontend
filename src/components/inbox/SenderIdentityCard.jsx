import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle2, Loader2, AlertTriangle, Pencil } from 'lucide-react';
import { getSenderIdentity, saveSenderIdentity } from '../../api/companyProfiles';

/** Company name and postal address shown in every email footer; campaigns can't launch without them. */
export default function SenderIdentityCard() {
    const queryClient = useQueryClient();
    const { data, isLoading, isError } = useQuery({ queryKey: ['sender-identity'], queryFn: getSenderIdentity });
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ company_name: '', postal_address: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (data) setForm({ company_name: data.company_name || '', postal_address: data.postal_address || '' });
        if (data && !data.is_complete) setEditing(true);
    }, [data]);

    const save = useMutation({
        mutationFn: saveSenderIdentity,
        onSuccess: (saved) => {
            queryClient.setQueryData(['sender-identity'], saved);
            setEditing(false); setError('');
        },
        onError: (err) => {
            const d = err?.response?.data?.detail;
            setError(typeof d === 'string' ? d : 'Could not save. Check both fields and try again.');
        },
    });

    if (isLoading || isError) return null;
    const complete = data?.is_complete;

    return (
        <div className={`rounded-2xl border p-5 ${complete ? 'border-gray-100 bg-white' : 'border-amber-200 bg-amber-50/60'}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${complete ? 'bg-[#eff3ff] text-[#0046FF]' : 'bg-amber-100 text-amber-700'}`}>
                        {complete ? <Building2 size={16}/> : <AlertTriangle size={16}/>}
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-gray-900">Sender identity</p>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                            {complete
                                ? 'Shown at the bottom of every email you send, as anti-spam law requires.'
                                : 'Add your company name and postal address. Anti-spam law requires them in every email, and campaigns can\'t launch until they are set.'}
                        </p>
                        {complete && !editing && (
                            <p className="text-xs text-gray-700 mt-2 whitespace-pre-line"><span className="font-semibold">{data.company_name}</span>{'\n'}{data.postal_address}</p>
                        )}
                    </div>
                </div>
                {complete && !editing && (
                    <button onClick={() => setEditing(true)} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#0046FF] hover:text-[#0046FF]">
                        <Pencil size={12}/> Edit
                    </button>
                )}
            </div>
            {editing && (
                <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={e => { e.preventDefault(); save.mutate(form); }}>
                    <label className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Company name</span>
                        <input required maxLength={200} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0046FF] focus:outline-none" placeholder="Acme Inc."/>
                    </label>
                    <label className="block sm:row-span-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Postal address</span>
                        <textarea required minLength={5} maxLength={1000} rows={3} value={form.postal_address} onChange={e => setForm(f => ({ ...f, postal_address: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#0046FF] focus:outline-none" placeholder={'100 Main Street, Suite 200\nAustin, TX 78701, USA'}/>
                    </label>
                    <div className="flex items-end gap-2">
                        <button type="submit" disabled={save.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0046FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                            {save.isPending ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} Save
                        </button>
                        {complete && <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>}
                    </div>
                    {error && <p role="alert" className="sm:col-span-2 text-xs font-medium text-red-600">{error}</p>}
                </form>
            )}
        </div>
    );
}
