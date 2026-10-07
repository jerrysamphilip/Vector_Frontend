import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, ShieldCheck, ShieldAlert, AlertTriangle,
    RefreshCcw, CheckCircle2, XCircle, Info,
    Trash2, Loader2, Server, Mail,
    TrendingUp, TrendingDown,
} from 'lucide-react';
import deliverabilityApi from '../api/deliverability';
import ReputationGauge from '../components/deliverability/ReputationGauge';
import DeliverabilityTrendsChart from '../components/deliverability/DeliverabilityTrendsChart';
import KpiTile from '../components/ui/KpiTile';

// ── GradientCard ─────────────────────────────────────────────────
function GradientCard(props) {
    return <KpiTile {...props} />;
}

// ── Auth status helpers ──────────────────────────────────────────
function getAuthInfo(status) {
    if (['PASS', 'VALID', 'HEALTHY'].includes(status))
        return { Icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: status };
    if (['FAIL', 'INVALID', 'CRITICAL'].includes(status))
        return { Icon: XCircle,      color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  label: status };
    if (status === 'WARNING')
        return { Icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: status };
    return { Icon: Info, color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: status || 'UNKNOWN' };
}

// ── DomainCard ───────────────────────────────────────────────────
function DomainCard({ domain, expanded, onToggle, onScan, onDelete, scanning }) {
    // If all auth statuses are UNKNOWN, the domain has never been scanned — don't trust the stored SES status
    const neverScanned = ['spf_status', 'dkim_status', 'dmarc_status']
        .every(k => !domain[k] || domain[k] === 'UNKNOWN');
    const effectiveSesStatus = neverScanned ? 'UNKNOWN' : (domain.ses_reputation_status || 'UNKNOWN');
    const sesInfo = getAuthInfo(effectiveSesStatus);

    return (
        <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border overflow-hidden transition-all duration-300"
            style={{
                borderColor: expanded ? '#2d6bbf' : '#e5e7eb',
                boxShadow: expanded ? '0 0 0 1px rgba(45,107,191,0.15), 0 4px 16px rgba(45,107,191,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
            }}>

            {/* Gradient top strip */}
            <div className="h-1 w-full"
                style={{ background: '#4f46e5' }} />

            <div className="p-5">
                {/* Header row */}
                <div className="flex items-start gap-4">
                    <ReputationGauge score={domain.current_reputation_score} size={52} />

                    <div className="flex-1 min-w-0">
                        <h3 className="font-mono font-bold text-base text-gray-900 truncate" title={domain.domain_name}>
                            {domain.domain_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {/* SES account-level status */}
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                                title="AWS SES account reputation — applies to all domains equally"
                                style={{ background: sesInfo.bg, color: sesInfo.color }}>
                                <sesInfo.Icon className="w-3 h-3" />
                                SES Account: {effectiveSesStatus}
                            </span>
                            {domain.is_blacklisted && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 uppercase tracking-wide">
                                    <AlertTriangle className="w-3 h-3" />
                                    Blacklisted
                                </span>
                            )}
                        </div>
                    </div>

                    <button onClick={() => onToggle(domain.domain_name)}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                        style={expanded
                            ? { background: 'rgba(45,107,191,0.08)', color: '#2d6bbf', borderColor: 'rgba(45,107,191,0.2)' }
                            : { background: '#f9fafb', color: '#6b7280', borderColor: '#e5e7eb' }}>
                        {expanded ? 'Close' : 'Details'}
                    </button>
                </div>

                {/* SPF / DKIM / DMARC pills */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                    {['spf', 'dkim', 'dmarc'].map(auth => {
                        const info = getAuthInfo(domain[`${auth}_status`]);
                        return (
                            <div key={auth} className="flex flex-col items-center justify-center py-2 rounded-xl border"
                                style={{ background: info.bg, borderColor: `${info.color}30` }}>
                                <span className="text-[9px] uppercase font-bold tracking-wider mb-1"
                                    style={{ color: info.color, opacity: 0.8 }}>{auth}</span>
                                <info.Icon className="w-4 h-4" style={{ color: info.color }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Expanded panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t overflow-hidden"
                        style={{ borderColor: 'rgba(45,107,191,0.15)' }}>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6"
                            style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.03), rgba(115,200,210,0.03))' }}>

                            {/* Campaign Activity */}
                            <div>
                                <p className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                                    <Activity className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                                    Campaign Activity
                                </p>
                                {domain.active_campaigns?.length > 0 ? (
                                    <ul className="space-y-1.5">
                                        {domain.active_campaigns.map((camp, i) => (
                                            <li key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                {camp}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No active campaigns linked.</p>
                                )}
                            </div>

                            {/* Inboxes + controls */}
                            <div className="space-y-4">
                                <div>
                                    <p className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                                        <Mail className="w-3.5 h-3.5" style={{ color: '#73C8D2' }} />
                                        Connected Inboxes
                                    </p>
                                    {domain.associated_inboxes?.length > 0 ? (
                                        <ul className="space-y-1.5 max-h-28 overflow-y-auto">
                                            {domain.associated_inboxes.map((inbox, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-100">
                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#2d6bbf' }} />
                                                    {typeof inbox === 'string' ? inbox : inbox.email || inbox.email_address || 'Unknown'}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">No inboxes connected.</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500 mr-auto">
                                        Rep: <strong className="text-gray-700">{(domain.account_reputation_score || 0).toFixed(2)}</strong>
                                    </span>
                                    <button
                                        onClick={() => onScan(domain.domain_name)}
                                        disabled={scanning === domain.domain_name}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                        style={{ background: '#4f46e5' }}>
                                        <RefreshCcw className={`w-3.5 h-3.5 ${scanning === domain.domain_name ? 'animate-spin' : ''}`} />
                                        Run Diagnostics
                                    </button>
                                    <button
                                        onClick={() => onDelete(domain)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Main Page ────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
    return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

function DomainHealthGhost() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 p-2">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-8 w-40 rounded-full" />
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[130px]" />)}
            </div>

            <Skeleton className="h-[320px]" />

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <Skeleton className="h-8 w-52 mb-5" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[180px]" />)}
                </div>
            </div>
        </div>
    );
}

export default function DomainHealth() {
    const [domains, setDomains]             = useState([]);
    const [alerts, setAlerts]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [scanning, setScanning]           = useState(null);
    const [expandedDomain, setExpandedDomain] = useState(null);
    const [domainToDelete, setDomainToDelete] = useState(null);
    const [deleting, setDeleting]           = useState(false);

    const toggleExpand = (name) => setExpandedDomain(expandedDomain === name ? null : name);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [domainsData, alertsData] = await Promise.all([
                deliverabilityApi.getDomains(),
                deliverabilityApi.getAlerts(),
            ]);
            const sorted = [...domainsData].sort((a, b) => {
                const an = a.domain_name?.toLowerCase() || '';
                const bn = b.domain_name?.toLowerCase() || '';
                const aN = an.includes('neutrinotechsystem');
                const bN = bn.includes('neutrinotechsystem');
                if (aN && !bN) return -1;
                if (!aN && bN) return 1;
                return an.localeCompare(bn);
            });
            setDomains(sorted);
            setAlerts(alertsData);
        } catch (err) {
            console.error('Failed to load domain data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (domainName) => {
        try {
            setScanning(domainName);
            await deliverabilityApi.triggerScan(domainName);
            await fetchData();
        } catch (err) {
            console.error('Scan failed:', err);
        } finally {
            setScanning(null);
        }
    };

    const handleDelete = async () => {
        if (!domainToDelete) return;
        try {
            setDeleting(true);
            await deliverabilityApi.deleteDomain(domainToDelete.domain_name);
            setDomains(prev => prev.filter(d => d.domain_name !== domainToDelete.domain_name));
            setDomainToDelete(null);
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleting(false);
        }
    };

    // ── Derived metrics ──
    const avgHealth    = domains.length
        ? Math.round(domains.reduce((a, d) => a + (d.current_reputation_score || 0), 0) / domains.length)
        : 0;
    const atRiskCount  = domains.filter(d =>
        ['WARNING', 'FAIL', 'INVALID'].includes(d.spf_status) ||
        ['WARNING', 'FAIL', 'INVALID'].includes(d.dkim_status) ||
        ['WARNING', 'FAIL', 'INVALID'].includes(d.dmarc_status)
    ).length;
    const mailboxCount = domains.reduce((a, d) => a + (d.associated_inboxes?.length || 0), 0);

    if (loading) return <DomainHealthGhost />;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 p-2">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Domain Health</h1>
                    <p className="text-sm text-gray-400 mt-1">Monitor deliverability, authentication, and sending reputation.</p>
                </div>
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Operational
                </span>
            </div>

            {/* ── Gradient KPI Cards ── */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <GradientCard
                    label="Overall Health"
                    value={`${avgHealth}/100`}
                    sub="average reputation score"
                    from="#2d6bbf" to="#1f56aa"
                    chart="wave"
                    trend={avgHealth >= 80}
                    animDelay="0ms"
                />
                <GradientCard
                    label="Active Domains"
                    value={domains.length}
                    sub="monitored sending domains"
                    from="#F5F1DC" to="#e8e3c0"
                    dark chart="bar"
                    trend={domains.length > 0}
                    animDelay="80ms"
                />
                <GradientCard
                    label="At Risk"
                    value={atRiskCount}
                    sub="auth issues detected"
                    from="#FF9013" to="#cc6f00"
                    chart="bar"
                    trend={atRiskCount === 0}
                    animDelay="160ms"
                />
                <GradientCard
                    label="Mailboxes"
                    value={mailboxCount}
                    sub="total connected inboxes"
                    from="#73C8D2" to="#4db0bb"
                    chart="wave"
                    trend={mailboxCount > 0}
                    animDelay="240ms"
                />
            </div>

            {/* ── Trends Chart ── */}
            <DeliverabilityTrendsChart domains={domains} />

            {/* ── Domains Grid ── */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-4"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                        <Server className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">Sending Domains</p>
                        <p className="text-xs text-gray-400">
                            {domains.length} domain{domains.length !== 1 ? 's' : ''}
                            {atRiskCount > 0 && ` · ${atRiskCount} need attention`}
                        </p>
                    </div>
                </div>

                <div className="p-5">
                    {domains.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}>
                                <Server className="w-7 h-7" style={{ color: '#2d6bbf' }} />
                            </div>
                            <h3 className="text-base font-semibold text-gray-700 mb-1">No domains connected</h3>
                            <p className="text-sm text-gray-400">Add a sending domain to start monitoring deliverability.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {domains.map((domain, idx) => (
                                <div key={domain.domain_name}
                                    className="card-anim"
                                    style={{ animationDelay: `${idx * 60}ms` }}>
                                    <DomainCard
                                        domain={domain}
                                        expanded={expandedDomain === domain.domain_name}
                                        onToggle={toggleExpand}
                                        onScan={handleScan}
                                        onDelete={setDomainToDelete}
                                        scanning={scanning}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Delete Modal ── */}
            <AnimatePresence>
                {domainToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                            <div className="p-6 text-center">
                                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <h3 className="text-base font-bold text-gray-900 mb-2">
                                    Delete {domainToDelete.domain_name}?
                                </h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    This removes the domain from monitoring and reputation tracking. This cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setDomainToDelete(null)}
                                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                                        {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Delete Forever
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
