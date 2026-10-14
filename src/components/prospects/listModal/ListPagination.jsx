import { ChevronLeft, ChevronRight } from 'lucide-react';

// Previous / next page of the list's prospects.
export default function ListPagination({ modal }) {
    const {
        page, pageSize, setPage, total, totalPages
    } = modal;
    return (
        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between text-sm">
            <span className="text-slate-500">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-slate-600">
                    Page {page} of {totalPages}
                </span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                    className="p-2 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
