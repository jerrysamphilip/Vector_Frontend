// Import wizard (C-03..C-06, F-16): upload -> map (saved mappings) -> options -> preview (dry run) -> start
// -> live progress (cancel) -> result with the error CSV. The drawer can be closed at any time: a started
// import keeps running on the server and shows its progress in the imports history.
import { useState, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Save, Upload, X } from 'lucide-react';
import DialogPanel from '../ui/DialogPanel';
import { contactsApi, errorMessage, listsApi } from '../../api/contacts';
import { DATE_ORDERS, IMPORT_MODES, backgroundImportsApi as api, isActive, savedMappingsApi } from '../../api/imports';
import { getStoredUser } from '../../lib/authStorage';
import { BRAND_GRADIENT, ErrorNote, Field, OwnerSelect, PrimaryButton, SecondaryButton, inputClass } from '../contacts/shared';
import MappingRow, { mappingProblems } from './MappingRow';

const STEPS = [['upload', 'File'], ['map', 'Columns'], ['options', 'Options'], ['preview', 'Preview'], ['run', 'Import']];

function Steps({ current }) {
    const index = STEPS.findIndex(([key]) => key === current);
    return (
        <ol className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-4" aria-label="Import steps">
            {STEPS.map(([key, label], i) => (
                <li key={key} aria-current={i === index ? 'step' : undefined}
                    className={`px-2 py-1 rounded-full ${i === index ? 'bg-indigo-600 text-white' : i < index ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100'}`}>
                    {i + 1}. {label}
                </li>
            ))}
        </ol>
    );
}

const COUNTS = [['contacts_created', 'Contacts created'], ['contacts_updated', 'Contacts updated'],
    ['companies_created', 'Companies created'], ['companies_updated', 'Companies updated'],
    ['skipped', 'Skipped'], ['error_count', 'Rows with errors']];

function Counts({ values }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {COUNTS.map(([key, label]) => (
                <div key={key} className={`rounded-xl px-3 py-2.5 ${key === 'error_count' && values[key] ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-bold text-slate-800">{(values[key] || 0).toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
}

export function ProgressBar({ job }) {
    const pct = job.progress ?? 0;
    return (
        <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>{(job.processed_rows || 0).toLocaleString()} of {(job.total_rows || 0).toLocaleString()} rows</span>
                <span>{pct}%</span>
            </div>
            <div role="progressbar" aria-label="Import progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
                className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: BRAND_GRADIENT }} />
            </div>
        </div>
    );
}

function UploadStep({ upload, file, onPick, onSheet }) {
    const preview = upload.data;
    return (
        <div className="space-y-4">
            <label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); onPick(e.dataTransfer.files?.[0]); }}
                className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30">
                {upload.isPending ? <Loader2 className="w-8 h-8 animate-spin text-indigo-500" /> : file ? <FileSpreadsheet className="w-8 h-8 text-indigo-500" /> : <Upload className="w-8 h-8 text-slate-400" />}
                <p className="text-sm font-semibold text-slate-700">{file ? file.name : 'Drop a file here or click to choose'}</p>
                <p className="text-xs text-slate-400">{preview ? `${preview.row_count.toLocaleString()} rows · ${preview.headers.length} columns` : '.csv or .xlsx, up to 50,000 rows'}</p>
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" aria-label="Choose a file" onChange={e => onPick(e.target.files?.[0])} />
            </label>
            {preview?.sheet_names?.length > 1 && (
                <Field label="Sheet">
                    <select className={inputClass} value={preview.sheet || ''} onChange={e => onSheet(e.target.value)}>
                        {preview.sheet_names.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </Field>
            )}
        </div>
    );
}

function applySaved(headers, saved) {
    return Object.fromEntries(headers.map(h => [h, saved.mapping[h] || 'skip']));
}

function MapStep({ preview, mapping, setMapping, setOptions }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const saved = useQuery({ queryKey: ['import-mappings'], queryFn: savedMappingsApi.list });
    const save = useMutation({
        mutationFn: () => savedMappingsApi.save(name.trim(), mapping, null),
        onSuccess: () => { setName(''); queryClient.invalidateQueries({ queryKey: ['import-mappings'] }); },
    });
    const { problems } = mappingProblems(mapping);
    const use = (id) => {
        const found = (saved.data || []).find(m => m.mapping_id === id);
        if (!found) return;
        setMapping(applySaved(preview.headers, found));
        setOptions(o => ({ ...o, ...found.options }));
    };
    return (
        <div className="space-y-4">
            {(saved.data || []).length > 0 && (
                <Field label="Use a saved mapping">
                    <select className={inputClass} defaultValue="" onChange={e => use(e.target.value)}>
                        <option value="">Choose…</option>
                        {saved.data.map(m => <option key={m.mapping_id} value={m.mapping_id}>{m.name}</option>)}
                    </select>
                </Field>
            )}
            <table className="w-full">
                <thead><tr className="text-xs font-semibold text-left text-slate-400 uppercase tracking-wide"><th className="pb-2 w-1/3">Column in file</th><th className="pb-2">Import as</th></tr></thead>
                <tbody>
                    {preview.headers.map(h => (
                        <MappingRow key={h} header={h} sample={preview.sample.map(r => r[h])} value={mapping[h]} targets={preview.targets}
                            onChange={v => setMapping(m => ({ ...m, [h]: v }))} />
                    ))}
                </tbody>
            </table>
            {problems.map(p => <p key={p} className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5">{p}</p>)}
            <div className="flex gap-2 items-end">
                <Field label="Save this mapping as" className="flex-1">
                    <input className={inputClass} value={name} maxLength={100} placeholder="e.g. Trade show leads" onChange={e => setName(e.target.value)} />
                </Field>
                <SecondaryButton onClick={() => save.mutate()} disabled={!name.trim() || problems.length > 0 || save.isPending}>
                    <Save className="w-4 h-4" /> Save
                </SecondaryButton>
            </div>
            {save.isSuccess && <p className="text-xs text-emerald-700">Mapping saved.</p>}
            <ErrorNote message={save.error && errorMessage(save.error, 'Could not save the mapping.')} />
        </div>
    );
}

function OptionsStep({ options, setOptions, hasEmail, fileName }) {
    const { data: owners = [] } = useQuery({ queryKey: ['contact-owners'], queryFn: contactsApi.owners });
    const { data: lists } = useQuery({ queryKey: ['lists', 'STATIC'], queryFn: () => listsApi.list({ list_type: 'STATIC' }) });
    const set = (key) => (value) => setOptions(o => ({ ...o, [key]: value }));
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="What to do">
                <select className={inputClass} value={options.mode} onChange={e => set('mode')(e.target.value)}>
                    {Object.entries(IMPORT_MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </Field>
            <Field label="Dates like 03/04/2026">
                <select className={inputClass} value={options.date_order} onChange={e => set('date_order')(e.target.value)}>
                    {Object.entries(DATE_ORDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </Field>
            <Field label="Owner of new contacts" hint="Used when the file has no Owner column">
                <OwnerSelect owners={owners} value={options.owner_id} onChange={set('owner_id')} />
            </Field>
            <Field label="Lead source for new contacts" hint="Used when the row has none">
                <input className={inputClass} value={options.default_source} maxLength={100} placeholder="e.g. Trade show"
                    onChange={e => set('default_source')(e.target.value)} />
            </Field>
            <Field label="Add imported contacts to a list">
                <select className={inputClass} value={options.list_mode} disabled={!hasEmail} onChange={e => set('list_mode')(e.target.value)}>
                    <option value="none">Don’t add to a list</option>
                    <option value="new">A new list</option>
                    <option value="existing">An existing list</option>
                </select>
            </Field>
            {options.list_mode === 'new' && (
                <Field label="New list name"><input className={inputClass} value={options.new_list_name} placeholder={fileName?.replace(/\.[^.]+$/, '')}
                    onChange={e => set('new_list_name')(e.target.value)} /></Field>
            )}
            {options.list_mode === 'existing' && (
                <Field label="List">
                    <select className={inputClass} value={options.list_id} onChange={e => set('list_id')(e.target.value)}>
                        <option value="">Choose a list…</option>
                        {(lists?.items || []).map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
                    </select>
                </Field>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input type="checkbox" className="accent-indigo-600" checked={options.update_existing}
                    onChange={e => set('update_existing')(e.target.checked)} />
                Overwrite values of existing records (otherwise only empty fields are filled; blank cells never overwrite)
            </label>
        </div>
    );
}

function PreviewStep({ dry }) {
    if (dry.isPending) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Checking every row…</p>;
    if (dry.error) return <ErrorNote message={errorMessage(dry.error, 'Could not check the file.')} />;
    const d = dry.data;
    if (!d) return null;
    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-500">Nothing has been imported yet. This is what the import will do with {d.total_rows.toLocaleString()} rows:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[['Create', d.create + (d.companies_create || 0)], ['Update', d.update + (d.companies_update || 0)], ['Skip', d.skip], ['Fail', d.fail]].map(([label, n]) => (
                    <div key={label} className={`rounded-xl px-3 py-2.5 ${label === 'Fail' && n ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                        <p className="text-lg font-bold text-slate-800">{n.toLocaleString()}</p>
                    </div>
                ))}
            </div>
            {d.errors.length > 0 && (
                <ul className="border border-slate-100 rounded-xl divide-y divide-slate-50 max-h-56 overflow-y-auto text-sm" aria-label="Sample errors">
                    {d.errors.map(e => <li key={`${e.row}-${e.reason}`} className="px-4 py-2"><span className="font-semibold text-slate-700">Row {e.row}:</span> <span className="text-slate-600">{e.reason}</span></li>)}
                </ul>
            )}
        </div>
    );
}

function RunStep({ job, onCancel, cancelling }) {
    const running = isActive(job);
    const failed = job.status === 'FAILED';
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                {running ? <Loader2 className="w-7 h-7 animate-spin text-indigo-500 flex-shrink-0" />
                    : failed || job.status === 'CANCELLED' ? <AlertTriangle className="w-7 h-7 text-amber-500 flex-shrink-0" />
                        : <CheckCircle2 className="w-7 h-7 text-emerald-500 flex-shrink-0" />}
                <div>
                    <p className="text-base font-bold text-slate-800">
                        {running ? (job.cancel_requested ? 'Stopping…' : job.status === 'QUEUED' ? 'Waiting to start…' : 'Importing…')
                            : failed ? 'Import stopped' : job.status === 'CANCELLED' ? 'Import cancelled' : 'Import finished'}
                    </p>
                    <p className="text-sm text-slate-500">{job.file_name}</p>
                    {job.message && <p className="text-sm text-slate-600 mt-1">{job.message}</p>}
                </div>
            </div>
            <ProgressBar job={job} />
            {running && <p className="text-xs text-slate-500">You can close this panel: the import keeps running and its progress shows in the import history.</p>}
            <Counts values={job} />
            <div className="flex flex-wrap gap-2">
                {running && <SecondaryButton onClick={onCancel} disabled={cancelling || job.cancel_requested}>Cancel import</SecondaryButton>}
                {!running && job.error_count > 0 && (
                    <SecondaryButton onClick={() => api.downloadErrors(job.import_id)}><Download className="w-4 h-4" /> Download error file</SecondaryButton>
                )}
                {!running && (
                    <Link to={job.options?.list_id ? `/app/contacts?list_id=${job.options.list_id}` : '/app/contacts'}
                        className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center">View contacts</Link>
                )}
            </div>
        </div>
    );
}

function requestOptions(options) {
    const out = { mode: options.mode, update_existing: options.update_existing, date_order: options.date_order,
        owner_id: options.owner_id || null, default_source: options.default_source.trim() || null };
    if (options.list_mode === 'existing' && options.list_id) out.list_id = options.list_id;
    if (options.list_mode === 'new' && options.new_list_name.trim()) out.new_list_name = options.new_list_name.trim();
    return out;
}

const NEXT = { upload: 'map', map: 'options', options: 'preview' };
const BACK = { map: 'upload', options: 'map', preview: 'options' };

export default function ImportDrawer({ onClose, initialJob = null }) {
    const queryClient = useQueryClient();
    const titleId = useId();
    const me = getStoredUser();
    const [step, setStep] = useState(initialJob ? 'run' : 'upload');
    const [file, setFile] = useState(null);
    const [mapping, setMapping] = useState({});
    const [options, setOptions] = useState({ mode: 'CREATE_AND_UPDATE', update_existing: true, date_order: 'MDY', default_source: '',
        owner_id: me?.user_id || '', list_mode: 'none', list_id: '', new_list_name: '' });
    const [jobId, setJobId] = useState(initialJob?.import_id || null);

    const refresh = () => ['contacts', 'accounts', 'imports', 'lists', 'contact-fields', 'contact-facets']
        .forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
    const upload = useMutation({
        mutationFn: ({ f, sheet }) => api.upload(f, sheet),
        onSuccess: res => setMapping(res.suggested_mapping),
    });
    const dry = useMutation({ mutationFn: () => api.dryRun(upload.data.import.import_id, mapping, requestOptions(options)) });
    const start = useMutation({
        mutationFn: () => api.start(upload.data.import.import_id, mapping, requestOptions(options)),
        onSuccess: job => { setJobId(job.import_id); setStep('run'); queryClient.setQueryData(['import', job.import_id], job); refresh(); },
    });
    const progress = useQuery({
        queryKey: ['import', jobId], queryFn: () => api.get(jobId), enabled: !!jobId,
        initialData: initialJob || undefined,
        refetchInterval: q => (isActive(q.state.data) ? 1500 : false),
    });
    const cancel = useMutation({ mutationFn: () => api.cancel(jobId), onSuccess: job => queryClient.setQueryData(['import', jobId], job) });

    // A stored upload that never started is dropped (cancelled) when it is replaced or the drawer closes
    const discardUpload = () => {
        const id = upload.data?.import?.import_id;
        if (id && !jobId) api.cancel(id).catch(() => {});
    };
    const pick = f => { if (!f) return; discardUpload(); setFile(f); setMapping({}); upload.mutate({ f }); };
    const pickSheet = sheet => { discardUpload(); upload.mutate({ f: file, sheet }); };
    const job = progress.data;
    const preview = upload.data;
    const { problems, hasEmail } = mappingProblems(mapping);
    const canNext = { upload: !!preview, map: problems.length === 0,
        options: !(options.list_mode === 'existing' && !options.list_id) }[step];
    const next = () => { const to = NEXT[step]; setStep(to); if (to === 'preview') dry.mutate(); };
    const close = () => { discardUpload(); refresh(); onClose(); };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/30" onClick={close} />
            <DialogPanel onClose={onClose} labelledBy={titleId} className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col outline-none" onClick={e => e.stopPropagation()}>
                <div className="h-1.5 w-full flex-shrink-0" style={{ background: BRAND_GRADIENT }} />
                <div className="px-5 sm:px-6 pt-5 pb-2 flex items-start justify-between gap-3">
                    <div>
                        <h2 id={titleId} className="text-lg font-bold text-gray-900">Import contacts and companies</h2>
                        <p className="text-sm text-gray-400">Contacts match on email, companies on domain then name.</p>
                    </div>
                    <button type="button" onClick={close} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl" aria-label="Close">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-5 sm:px-6 pb-4 overflow-y-auto flex-1 min-h-0">
                    <Steps current={step} />
                    {step === 'upload' && <UploadStep upload={upload} file={file} onPick={pick} onSheet={pickSheet} />}
                    {step === 'map' && preview && <MapStep preview={preview} mapping={mapping} setMapping={setMapping} setOptions={setOptions} />}
                    {step === 'options' && <OptionsStep options={options} setOptions={setOptions} hasEmail={hasEmail} fileName={file?.name} />}
                    {step === 'preview' && <PreviewStep dry={dry} />}
                    {step === 'run' && job && <RunStep job={job} onCancel={() => cancel.mutate()} cancelling={cancel.isPending} />}
                    {step === 'run' && !job && <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />}
                    <div className="mt-4 space-y-2">
                        <ErrorNote message={upload.error && errorMessage(upload.error, 'Could not read that file.')} />
                        <ErrorNote message={start.error && errorMessage(start.error, 'The import could not start.')} />
                        <ErrorNote message={cancel.error && errorMessage(cancel.error, 'Could not cancel the import.')} />
                    </div>
                </div>
                {step !== 'run' && (
                    <div className="px-5 sm:px-6 py-4 border-t border-slate-100 flex gap-2.5">
                        {BACK[step] && <SecondaryButton onClick={() => setStep(BACK[step])}>Back</SecondaryButton>}
                        {step === 'preview'
                            ? <PrimaryButton onClick={() => start.mutate()} loading={start.isPending} disabled={!dry.data}>
                                <Upload className="w-4 h-4" /> Start import
                            </PrimaryButton>
                            : <PrimaryButton onClick={next} disabled={!canNext}>Next</PrimaryButton>}
                        <SecondaryButton onClick={close} className="ml-auto">Cancel</SecondaryButton>
                    </div>
                )}
            </DialogPanel>
        </div>
    );
}
