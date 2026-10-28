import { useState } from 'react';
import { X, Server, Loader2, Plus } from 'lucide-react';
import deliverabilityApi from '../../api/deliverability';
import DnsRecordsPanel from './DnsRecordsPanel';
import DialogPanel from '../ui/DialogPanel';
import { useApiQuery } from '../../lib/useApiQuery';
import { errorText } from '../../lib/apiErrors';

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** Same rules as the API (normalize_domain_name): a bare hostname such as mail.example.com. */
export function normalizeDomain(raw) {
    let name = String(raw || '').trim().toLowerCase();
    if (name.endsWith('.')) name = name.slice(0, -1);
    if (!name || name.length > 253) return null;
    const labels = name.split('.');
    if (labels.length < 2 || !labels.every(l => LABEL.test(l)) || !TLD.test(labels[labels.length - 1])) return null;
    return name;
}

const detail = (err, fallback) => errorText(err, fallback);

/**
 * "Add domain" (domainName null: form, then the DNS records to publish) or the DNS records
 * of an existing domain. "Check status" runs the existing diagnostics scan and reloads.
 */
export default function DomainDnsModal({ domainName: initialName = null, canManage, onClose, onChanged }) {
    const [domainName, setDomainName] = useState(initialName);
    
    const [input, setInput] = useState('');
    const [fresh, setInfo] = useState(null);      // { dns_records, dkim_tokens_available, *_status } after add / check
    const [adding, setAdding] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [actionError, setError] = useState(null);

    // The records of an existing domain (initialName); add / "Check status" replace them with their own answer
    const initial = useApiQuery(['deliverability-dns', initialName], () => deliverabilityApi.getDnsRecords(initialName),
        { enabled: !!initialName, retry: false, staleTime: 0, gcTime: 0 });
    const info = fresh ?? initial.data ?? null;
    const loading = !!initialName && initial.isLoading;
    const error = actionError ?? (!fresh && initial.error ? detail(initial.error, 'Could not load the DNS records') : null);

    const load = async (name) => {
        const data = await deliverabilityApi.getDnsRecords(name);
        setInfo(data);
        return data;
    };

    const valid = normalizeDomain(input);

    const add = async (e) => {
        e.preventDefault();
        if (!valid) { setError('Enter a domain name like example.com (no http://, @ or path)'); return; }
        setAdding(true); setError(null);
        try {
            const res = await deliverabilityApi.addDomain(valid);
            setDomainName(valid);
            setInfo({ ...(res.domain || {}), dns_records: res.dns_records, dkim_tokens_available: res.dkim_tokens_available });
            onChanged?.();
        } catch (err) {
            setError(detail(err, 'Could not add the domain'));
        } finally {
            setAdding(false);
        }
    };

    const refresh = async () => {
        setRefreshing(true); setError(null);
        try {
            await deliverabilityApi.triggerScan(domainName);
            await load(domainName);
            onChanged?.();
        } catch (err) {
            setError(detail(err, 'The check could not run'));
        } finally {
            setRefreshing(false);
        }
    };

    // The accessible name stays the aria-label ("DNS records for <domain>" / "Add sending domain"); DialogPanel adds
    // aria-modal, the focus trap, Escape and focus return.
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <DialogPanel onClose={onClose} aria-label={domainName ? `DNS records for ${domainName}` : 'Add sending domain'}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto outline-none">
                <div className="px-6 py-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center"><Server className="w-4 h-4 text-white" /></div>
                        <div>
                            <h3 className="font-semibold !text-white">{domainName ? domainName : 'Add sending domain'}</h3>
                            <p className="text-xs text-white/70">{domainName ? 'DNS records for SPF, DKIM and DMARC' : 'Send campaigns from your own domain'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {!domainName && (
                        <form onSubmit={add} className="space-y-3">
                            <label className="block">
                                <span className="text-sm font-medium text-gray-700 block mb-1.5">Domain name</span>
                                <input value={input} onChange={e => { setInput(e.target.value); setError(null); }} autoFocus maxLength={253}
                                    placeholder="example.com" aria-label="Domain name"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                <span className="block text-xs text-gray-400 mt-1">The part after the @ in your sending addresses. You will get the DNS records to add next.</span>
                            </label>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={adding || !input.trim()}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Add domain
                                </button>
                            </div>
                        </form>
                    )}

                    {error && <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}

                    {loading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}

                    {domainName && info && (
                        <DnsRecordsPanel domainName={domainName} records={info.dns_records || []} statuses={info}
                            dkimTokensAvailable={info.dkim_tokens_available} onRefresh={refresh} refreshing={refreshing} canRefresh={canManage}
                            liveSummary={info.live_summary} liveCheckedAt={info.live_checked_at} />
                    )}

                    {domainName && info && (
                        <div className="flex justify-end">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Done</button>
                        </div>
                    )}
                </div>
            </DialogPanel>
        </div>
    );
}
