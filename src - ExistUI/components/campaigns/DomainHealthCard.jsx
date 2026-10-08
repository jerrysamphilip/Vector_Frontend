import { ShieldCheck, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function HealthItem({ label, status, value }) {
    const isPass = status === 'pass';
    const isWarning = status === 'warning';

    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
            <span className="text-sm font-medium text-slate-600">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase ${isPass ? 'text-emerald-600' : isWarning ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                    {value}
                </span>
                {isPass ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                )}
            </div>
        </div>
    );
}

export default function DomainHealthCard() {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-800">Domain Health</h3>
                </div>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                    Healthy
                </span>
            </div>

            {/* Health Signals */}
            <div className="space-y-1 mb-6">
                <HealthItem label="SPF Record" status="pass" value="Pass" />
                <HealthItem label="DKIM Signature" status="pass" value="Pass" />
                <HealthItem label="DMARC Policy" status="warning" value="Quarantine" />
            </div>

            {/* Reputation Risk */}
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reputation Risk</span>
                    <span className="text-sm font-bold text-slate-700">Low</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full w-[15%] bg-emerald-500 rounded-full" />
                </div>
            </div>

            {/* Auto-Pause Toggle */}
            <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-600">Auto-pause at high risk</span>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600 cursor-pointer">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
                </div>
            </div>
        </div>
    );
}
