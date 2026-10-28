import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Server-side pager footer: "1–20 of 230", previous / next and an optional "Rows per page" picker.
export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, sizeOptions = PAGE_SIZE_OPTIONS }) {
    const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
    const from = total ? (page - 1) * pageSize + 1 : 0;
    const to = Math.min(page * pageSize, total || 0);
    const arrow = 'p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm">
            <span className="text-slate-500">{total ? `${from}–${to} of ${total}` : 'No results'}</span>
            <div className="flex flex-wrap items-center gap-4">
                {onPageSizeChange && (
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                        Rows per page
                        <select
                            value={pageSize}
                            onChange={e => onPageSizeChange(Number(e.target.value))}
                            aria-label="Rows per page"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {sizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                    </label>
                )}
                <div className="flex items-center gap-1">
                    <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={arrow} aria-label="Previous page">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-600 px-2">Page {page} of {totalPages}</span>
                    <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={arrow} aria-label="Next page">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
