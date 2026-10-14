import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ListPlus } from 'lucide-react';
import { listsApi, errorMessage } from '../../../api/contacts';

// ── Add selected prospects to another static list, or a new one (DF-03) ──
export default function AddToListPanel({ ids, currentListId, onDone, onCancel }) {
    const queryClient = useQueryClient();
    const { data } = useQuery({ queryKey: ['lists', 'STATIC'], queryFn: () => listsApi.list({ list_type: 'STATIC' }) });
    const [target, setTarget] = useState('');
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(null);
    const add = useMutation({
        mutationFn: async () => {
            const listId = target === '__new__' ? (await listsApi.create({ list_name: newName.trim(), list_type: 'STATIC' })).list_id : target;
            const res = await listsApi.addMembers(listId, ids);
            return { ...res, name: target === '__new__' ? newName.trim() : data?.items.find(l => l.list_id === target)?.list_name };
        },
        onSuccess: res => {
            ['lists', 'prospect-lists', 'prospect-stats', 'contact-facets'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
            onDone(`Added ${res.added} to “${res.name}”${res.already_in_list ? ` (${res.already_in_list} already there)` : ''}.`);
        },
        onError: err => setError(errorMessage(err)),
    });
    const options = (data?.items || []).filter(l => l.list_id !== currentListId);
    return (
        <div className="px-6 py-3 border-b border-slate-100 bg-blue-50/40 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-600">Add {ids.length} to</span>
            <select value={target} onChange={e => setTarget(e.target.value)}
                className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none">
                <option value="">Choose a list…</option>
                <option value="__new__">+ New list</option>
                {options.map(l => <option key={l.list_id} value={l.list_id}>{l.list_name}</option>)}
            </select>
            {target === '__new__' && (
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="List name" autoFocus
                    className="h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none" />
            )}
            <button onClick={() => add.mutate()} disabled={add.isPending || !target || (target === '__new__' && !newName.trim())}
                className="px-3 h-8 text-xs font-semibold text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                {add.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListPlus className="w-3 h-3" />} Add
            </button>
            <button onClick={onCancel} className="px-3 h-8 text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
            {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
    );
}
