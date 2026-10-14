import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// Result counts of the last list revalidation.
export default function RevalidationBanner({ modal }) {
    const {
        revalidationResult, setRevalidationResult
    } = modal;
    return (
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-emerald-700">{revalidationResult.valid_count} Valid</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-amber-700">{revalidationResult.warning_count} Warnings</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span className="font-medium text-rose-700">{revalidationResult.invalid_count} Invalid</span>
                    </div>
                </div>
                <button
                    onClick={() => setRevalidationResult(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
