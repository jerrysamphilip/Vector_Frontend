import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, Download, History } from 'lucide-react';
import { contactsApi, importsApi, listsApi, errorMessage } from '../api/contacts';
import { getStoredUser } from '../lib/authStorage';
import {
    ErrorNote, Field, inputClass, OwnerSelect, PrimaryButton, SecondaryButton, formatDateTime, relativeDate,
} from '../components/contacts/shared';

const NEW_TYPES = { TEXT: 'Text', NUMBER: 'Number', DATE: 'Date', SELECT: 'Dropdown', MULTI_CHECKBOX: 'Multiple checkboxes', PHONE: 'Phone', URL: 'Link' };
const card = 'bg-white rounded-2xl border border-gray-100 p-6';
const cardStyle = { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };

/** Column → property picker; "Create new property" asks for a type and label (BR-CM-26). */
function MappingRow({ header, sample, value, targets, onChange }) {
    const isNew = value?.startsWith('new:');
    const parts = isNew ? value.split(':') : [];
    const newType = parts[1] || 'TEXT';
    const label = isNew ? parts.slice(2).join(':') : header;
    return (
        <tr className="border-t border-slate-100 align-top">
            <td className="py-2.5 pr-3">
                <p className="text-sm font-semibold text-slate-800">{header}</p>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">{sample.filter(v => v != null && v !== '').slice(0, 3).join(' · ') || 'empty'}</p>
            </td>
            <td className="py-2.5">
                <select className={inputClass} value={isNew ? '__new__' : value || 'skip'}
                    onChange={e => onChange(e.target.value === '__new__' ? `new:TEXT:${header}` : e.target.value)}>
                    <option value="skip">Don’t import</option>
                    <optgroup label="Contact">{targets.contact.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>
                    <optgroup label="Company">{targets.company.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>
                    {targets.custom.length > 0 && <optgroup label="Custom properties">{targets.custom.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>}
                    <option value="__new__">+ Create new property…</option>
                </select>
                {isNew && (
                    <div className="grid grid-cols-[1fr_150px] gap-2 mt-2">
                        <input className={inputClass} value={label} placeholder="Property label"
                            onChange={e => onChange(`new:${newType}:${e.target.value}`)} />
                        <select className={inputClass} value={newType} onChange={e => onChange(`new:${e.target.value}:${label}`)}>
                            {Object.entries(NEW_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                )}
            </td>
        </tr>
    );
}

function ResultCard({ job, onAgain }) {
    const failed = job.status === 'FAILED';
    return (
        <div className={card} style={cardStyle}>
            <div className="flex items-start gap-4">
                {failed ? <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />}
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-slate-800">{failed ? 'Import stopped' : 'Import finished'}</h2>
                    <p className="text-sm text-slate-500">{job.file_name} · {job.total_rows.toLocaleString()} rows</p>
                    {job.message && <p className="text-sm text-red-600 mt-1">{job.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
                {[['Contacts created', job.contacts_created], ['Contacts updated', job.contacts_updated],
                  ['Companies created', job.companies_created], ['Companies updated', job.companies_updated],
                  ['Rows with errors', job.error_count]].map(([label, n]) => (
                    <div key={label} className={`rounded-xl px-4 py-3 ${label.startsWith('Rows') && n ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                        <p className="text-xl font-bold text-slate-800">{(n || 0).toLocaleString()}</p>
                    </div>
                ))}
            </div>
            {job.errors?.length > 0 && (
                <div className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-700">Rows that were not imported</p>
                        <button onClick={() => importsApi.downloadErrors(job.import_id)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5">
                            <Download className="w-4 h-4" /> Download error file
                        </button>
                    </div>
                    <ul className="border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-64 overflow-y-auto text-sm">
                        {job.errors.map(e => <li key={`${e.row}-${e.reason}`} className="px-4 py-2"><span className="font-semibold text-slate-700">Row {e.row}:</span> <span className="text-slate-600">{e.reason}</span></li>)}
                    </ul>
                </div>
            )}
            <div className="flex gap-2 mt-6">
                <Link to={job.options?.list_id ? `/app/contacts?list_id=${job.options.list_id}` : '/app/contacts'}
                    className="h-10 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center">View contacts</Link>
                <SecondaryButton onClick={onAgain}>Import another file</SecondaryButton>
            </div>
        </div>
    );
}

function ImportHistory() {
    const { data } = useQuery({ queryKey: ['imports'], queryFn: () => importsApi.history({ page_size: 20 }) });
    const items = data?.items || [];
    if (!items.length) return null;
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={cardStyle}>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-5 py-4 border-b border-slate-100"><History className="w-4 h-4 text-indigo-500" /> Past imports</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="text-xs font-semibold text-left text-slate-400 uppercase tracking-wide bg-slate-50/80">
                        <th className="pl-5 pr-3 py-2.5">File</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Created</th>
                        <th className="px-3 py-2.5">Updated</th><th className="px-3 py-2.5">Errors</th><th className="px-3 py-2.5">By</th><th className="px-3 pr-5 py-2.5">When</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {items.map(j => (
                            <tr key={j.import_id}>
                                <td className="pl-5 pr-3 py-2.5 font-medium text-slate-800">{j.file_name}</td>
                                <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${j.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : j.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{j.status.toLowerCase()}</span></td>
                                <td className="px-3 py-2.5 text-slate-600">{j.contacts_created + j.companies_created}</td>
                                <td className="px-3 py-2.5 text-slate-600">{j.contacts_updated + j.companies_updated}</td>
                                <td className="px-3 py-2.5">{j.error_count ? <button onClick={() => importsApi.downloadErrors(j.import_id)} className="font-semibold text-red-600 hover:text-red-800">{j.error_count} ↓</button> : <span className="text-slate-400">0</span>}</td>
                                <td className="px-3 py-2.5 text-slate-600">{j.created_by_name || '—'}</td>
                                <td className="px-3 pr-5 py-2.5 text-slate-500 whitespace-nowrap" title={formatDateTime(j.started_at)}>{relativeDate(j.started_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ImportContacts() {
    const queryClient = useQueryClient();
    const me = getStoredUser();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [mapping, setMapping] = useState({});
    const [options, setOptions] = useState({ owner_id: me?.user_id || '', list_mode: 'none', list_id: '', new_list_name: '', update_existing: true });
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: lists } = useQuery({ queryKey: ['lists', 'STATIC'], queryFn: () => listsApi.list({ list_type: 'STATIC' }) });

    const doPreview = useMutation({
        mutationFn: importsApi.preview,
        onSuccess: res => { setPreview(res); setMapping(res.suggested_mapping); setError(null); },
        onError: err => setError(errorMessage(err, 'Could not read that file.')),
    });
    const doImport = useMutation({
        mutationFn: () => {
            const opts = { owner_id: options.owner_id || null, update_existing: options.update_existing };
            if (options.list_mode === 'existing' && options.list_id) opts.list_id = options.list_id;
            if (options.list_mode === 'new' && options.new_list_name.trim()) opts.new_list_name = options.new_list_name.trim();
            return importsApi.run(file, mapping, opts);
        },
        onSuccess: res => {
            setResult(res);
            ['contacts', 'accounts', 'imports', 'lists', 'contact-fields', 'contact-facets'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
        },
        onError: err => setError(errorMessage(err, 'Import failed.')),
    });

    const reset = () => { setFile(null); setPreview(null); setMapping({}); setResult(null); setError(null); };
    const pick = f => { if (!f) return; reset(); setFile(f); doPreview.mutate(f); };

    const mapped = Object.values(mapping);
    const hasEmail = mapped.includes('contact.email');
    const hasCompany = mapped.some(t => ['company.name', 'company.domain', 'company.website'].includes(t));
    const duplicateTargets = mapped.filter(t => t !== 'skip' && !t.startsWith('new:')).filter((t, i, all) => all.indexOf(t) !== i);

    return (
        <div className="w-full max-w-5xl space-y-6">
            <div>
                <Link to="/app/contacts" className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 mb-3"><ArrowLeft className="w-4 h-4" /> Contacts</Link>
                <h1 className="text-2xl font-bold text-gray-900">Import contacts and companies</h1>
                <p className="text-sm text-gray-400 mt-1">CSV or Excel. Contacts match on email, companies on domain then name; existing records are updated.</p>
            </div>

            {result ? <ResultCard job={result} onAgain={reset} /> : <>
                <div className={card} style={cardStyle}>
                    <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
                        className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30">
                        {doPreview.isPending ? <Loader2 className="w-8 h-8 animate-spin text-indigo-500" /> : file ? <FileSpreadsheet className="w-8 h-8 text-indigo-500" /> : <Upload className="w-8 h-8 text-slate-400" />}
                        <p className="text-sm font-semibold text-slate-700">{file ? file.name : 'Drop a file here or click to choose'}</p>
                        <p className="text-xs text-slate-400">{preview ? `${preview.row_count.toLocaleString()} rows · ${preview.headers.length} columns` : '.csv, .xlsx or .xls'}</p>
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => pick(e.target.files?.[0])} />
                    </label>
                </div>

                {preview && <>
                    <div className={card} style={cardStyle}>
                        <h2 className="text-base font-bold text-slate-800">Map columns</h2>
                        <p className="text-sm text-slate-500 mb-3">Map an Email column to import contacts, a Company name or domain column to import companies, or both.</p>
                        <table className="w-full">
                            <thead><tr className="text-xs font-semibold text-left text-slate-400 uppercase tracking-wide"><th className="pb-2 w-1/3">Column in file</th><th className="pb-2">Import as</th></tr></thead>
                            <tbody>
                                {preview.headers.map(h => (
                                    <MappingRow key={h} header={h} sample={preview.sample.map(r => r[h])} value={mapping[h]} targets={preview.targets}
                                        onChange={v => setMapping(m => ({ ...m, [h]: v }))} />
                                ))}
                            </tbody>
                        </table>
                        {!hasEmail && !hasCompany && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5 mt-3">Map an Email column or a Company name/domain column.</p>}
                        {duplicateTargets.length > 0 && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5 mt-3">More than one column maps to the same property; the last one wins.</p>}
                    </div>

                    <div className={card} style={cardStyle}>
                        <h2 className="text-base font-bold text-slate-800 mb-3">Options</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Owner of new contacts" hint="Used when the file has no Owner column">
                                <OwnerSelect owners={owners} value={options.owner_id} onChange={v => setOptions(o => ({ ...o, owner_id: v }))} />
                            </Field>
                            <Field label="Add imported contacts to a list">
                                <select className={inputClass} value={options.list_mode} disabled={!hasEmail} onChange={e => setOptions(o => ({ ...o, list_mode: e.target.value }))}>
                                    <option value="none">Don’t add to a list</option>
                                    <option value="new">A new list</option>
                                    <option value="existing">An existing list</option>
                                </select>
                            </Field>
                            {options.list_mode === 'new' && (
                                <Field label="New list name"><input className={inputClass} value={options.new_list_name} placeholder={file?.name.replace(/\.[^.]+$/, '')}
                                    onChange={e => setOptions(o => ({ ...o, new_list_name: e.target.value }))} /></Field>
                            )}
                            {options.list_mode === 'existing' && (
                                <Field label="List">
                                    <select className={inputClass} value={options.list_id} onChange={e => setOptions(o => ({ ...o, list_id: e.target.value }))}>
                                        <option value="">Choose a list…</option>
                                        {(lists?.items || []).map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
                                    </select>
                                </Field>
                            )}
                            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                                <input type="checkbox" className="accent-indigo-600" checked={options.update_existing}
                                    onChange={e => setOptions(o => ({ ...o, update_existing: e.target.checked }))} />
                                Update existing contacts and companies with values from the file (blank cells never overwrite)
                            </label>
                        </div>
                    </div>
                </>}

                <ErrorNote message={error} />
                {preview && (
                    <div className="flex gap-2">
                        <PrimaryButton onClick={() => doImport.mutate()} loading={doImport.isPending}
                            disabled={(!hasEmail && !hasCompany) || (options.list_mode === 'existing' && !options.list_id)}>
                            <Upload className="w-4 h-4" /> Import {preview.row_count.toLocaleString()} rows
                        </PrimaryButton>
                        <SecondaryButton onClick={reset}>Cancel</SecondaryButton>
                    </div>
                )}
            </>}

            <ImportHistory />
        </div>
    );
}
