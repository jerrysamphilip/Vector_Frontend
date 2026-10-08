import { Eye, Trash2, Users, ChevronUp, ChevronDown, Check, Plus } from 'lucide-react';

// ── Avatar from list name initials ─────────────────────────────
const GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-pink-400 to-rose-500',
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-pink-500',
  'from-teal-400 to-emerald-500',
];

function listGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function listInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
}

function relativeDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  if (diff < 365) return `${Math.floor(diff / 30)}mo ago`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Skeleton ────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="divide-y divide-slate-50">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="w-4 h-4 rounded bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200 animate-pulse rounded-md" style={{ width: `${40 + (i * 13) % 40}%` }} />
            <div className="h-3 bg-slate-100 animate-pulse rounded-md w-24" />
          </div>
          <div className="h-6 w-14 bg-slate-100 animate-pulse rounded-full" />
          <div className="h-3.5 w-20 bg-slate-100 animate-pulse rounded-md" />
          <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center mb-5 shadow-inner">
        <Users className="w-9 h-9 text-indigo-400" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">No prospect lists yet</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6 leading-relaxed">
        Upload an Excel or CSV file to create your first list and start reaching out.
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200"
      >
        <Plus className="w-4 h-4" />
        Upload your first list
      </button>
    </div>
  );
}

// ── Sort Header Button ──────────────────────────────────────────
function SortTh({ children, column, sortBy, sortOrder, onSort, className = '' }) {
  const active = sortBy === column;
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none ${className}`}
      onClick={() => onSort?.(column, active && sortOrder === 'asc' ? 'desc' : 'asc')}>
      <span className={`inline-flex items-center gap-1 ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors`}>
        {children}
        {active
          ? sortOrder === 'asc'
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          : <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-50" />
        }
      </span>
    </th>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN TABLE
// ══════════════════════════════════════════════════════════════
export default function ProspectListsTable({
  lists = [],
  isLoading,
  onView,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  selectedIds = [],
  onSelectionChange,
  onUpload,
}) {
  const allSelected = lists.length > 0 && lists.every(l => selectedIds.includes(l.list_id));
  const someSelected = lists.some(l => selectedIds.includes(l.list_id));

  const toggleAll = () => onSelectionChange?.(allSelected ? [] : lists.map(l => l.list_id));
  const toggleOne = id => onSelectionChange?.(
    selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
  );

  if (isLoading) return <Skeleton />;
  if (lists.length === 0) return <EmptyState onUpload={onUpload} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-100">
            <th className="pl-5 pr-2 py-3 w-10">
              <button
                onClick={toggleAll}
                className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all ${
                  allSelected
                    ? 'bg-indigo-600 border-indigo-600'
                    : someSelected
                    ? 'bg-indigo-100 border-indigo-400'
                    : 'border-slate-300 hover:border-indigo-400 bg-white'
                }`}
              >
                {allSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                {someSelected && !allSelected && <div className="w-1.5 h-0.5 bg-indigo-600 rounded-full" />}
              </button>
            </th>

            <SortTh column="list_name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-left">
              List Name
            </SortTh>

            <SortTh column="prospect_count" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-right">
              Contacts
            </SortTh>

            <SortTh column="uploaded_at" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="text-right">
              Uploaded
            </SortTh>

            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-50">
          {lists.map(list => {
            const selected = selectedIds.includes(list.list_id);
            const grad = listGradient(list.list_name);
            const initials = listInitials(list.list_name);

            return (
              <tr
                key={list.list_id}
                onClick={() => onView?.(list)}
                className={`group cursor-pointer transition-colors ${
                  selected ? 'bg-indigo-50/70' : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Checkbox */}
                <td className="pl-5 pr-2 py-3.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => toggleOne(list.list_id)}
                    className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all ${
                      selected
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-slate-300 hover:border-indigo-400 bg-white'
                    }`}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </button>
                </td>

                {/* Name + avatar */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-xs font-bold text-white">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[280px]">
                        {list.list_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {(list.prospect_count ?? 0).toLocaleString()} contacts
                      </p>
                    </div>
                  </div>
                </td>

                {/* Count badge */}
                <td className="px-4 py-3.5 text-right">
                  <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                    {(list.prospect_count ?? 0).toLocaleString()}
                  </span>
                </td>

                {/* Date */}
                <td className="px-4 py-3.5 text-right">
                  <span className="text-xs text-slate-400 font-medium">{relativeDate(list.uploaded_at)}</span>
                </td>

                {/* Actions */}
                <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onView?.(list)}
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => onDelete?.(list)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
