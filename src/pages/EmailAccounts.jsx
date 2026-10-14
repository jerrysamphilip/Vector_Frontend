import { BellRing, Loader2, Plus, RefreshCcw, X } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import ConnectionWizard from '../components/inbox/ConnectionWizard';
import AlertPreferencesModal from '../components/inbox/AlertPreferencesModal';
import SenderIdentityCard from '../components/inbox/SenderIdentityCard';
import { useEmailAccounts } from '../components/inbox/accounts/useEmailAccounts';
import WarmupKpiRow from '../components/inbox/accounts/WarmupKpiRow';
import WarmupPoolCard from '../components/inbox/accounts/WarmupPoolCard';
import InboxListSection from '../components/inbox/accounts/InboxListSection';
import InboxDetailPanel from '../components/inbox/accounts/InboxDetailPanel';
import DnsVerificationDialog from '../components/inbox/accounts/DnsVerificationDialog';
import DeleteInboxDialog from '../components/inbox/accounts/DeleteInboxDialog';

// Email Accounts (/app/email-accounts): sending mailboxes, their warm-up and sender reputation.
// State and actions: useEmailAccounts; sections and dialogs: components/inbox/accounts/.

export default function EmailAccounts() {
    const accounts = useEmailAccounts();
    const {
        ms365Notice, setMs365Notice, runWarmupMutation, alertPrefsLoading, setFormError, setIsAlertPrefsOpen,
        openConnectionWizard, isModalOpen, setIsModalOpen, isEditMode, setIsEditMode, selectedInbox, setSelectedInbox,
        updateMutation, createMutation, formError, isAlertPrefsOpen, alertPreferences, saveAlertPrefsMutation,
    } = accounts;

    return (
        <PageTransition>
            <div className="space-y-6">

                {ms365Notice && (
                    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${ms365Notice.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        {ms365Notice.text}
                        <button onClick={() => setMs365Notice(null)} aria-label="Dismiss"><X size={14}/></button>
                    </div>
                )}

                {/* ── Header ─────────────────────────────────────────────────── */}
                <header className="w-full flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">Email Accounts</h2>
                        <p className="text-sm text-gray-400 mt-1">Manage inboxes, warmup scheduling, and sender reputation.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => runWarmupMutation.mutate()}
                            disabled={runWarmupMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#0046FF]/30 hover:text-[#0046FF] disabled:opacity-50"
                        >
                            {runWarmupMutation.isPending
                                ? <Loader2 size={15} className="animate-spin"/>
                                : <RefreshCcw size={15}/>}
                            Run Warmup
                        </button>
                        <button
                            onClick={() => { setFormError(''); setIsAlertPrefsOpen(true); }}
                            disabled={alertPrefsLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#0046FF]/30 hover:text-[#0046FF] disabled:opacity-50"
                        >
                            {alertPrefsLoading ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
                            Alert Preferences
                        </button>
                        <button
                            onClick={() => openConnectionWizard()}
                            className="flex items-center gap-2 text-white h-9 px-4 rounded-lg text-sm font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #0046FF, #73C8D2)' }}
                        >
                            <Plus size={15}/> Connect Mailbox
                        </button>
                    </div>
                </header>

                {/* ── Row 1: Gradient KPI cards (Dashboard-style) ─────────────── */}
                <SenderIdentityCard/>

                <WarmupKpiRow accounts={accounts} />

                {/* ── Row 2: Pool summary + Reputation (Dashboard-style white card) ── */}
                <WarmupPoolCard accounts={accounts} />

                {/* ── Row 3: Main content — table + detail panel ──────────────── */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(340px,1fr)] xl:items-start">

                    {/* Left: Search + table */}
                    <InboxListSection accounts={accounts} />

                    {/* Right: detail panel */}
                    <InboxDetailPanel accounts={accounts} />
                </div>
            </div>

            {/* ── ConnectionWizard modal ─────────────────────────────────────── */}
            <ConnectionWizard
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={(formData) => {
                    setFormError('');
                    if (isEditMode && selectedInbox?.inbox_id) {
                        updateMutation.mutate({ id: selectedInbox.inbox_id, data: formData }, {
                            onSuccess: () => { setIsModalOpen(false); setIsEditMode(false); setSelectedInbox(null); },
                        });
                        return;
                    }
                    createMutation.mutate(formData);
                }}
                isSubmitting={createMutation.isPending || updateMutation.isPending}
                error={formError}
                initialData={isEditMode ? selectedInbox : null}
            />

            <AlertPreferencesModal
                isOpen={isAlertPrefsOpen}
                onClose={() => setIsAlertPrefsOpen(false)}
                data={alertPreferences}
                isSaving={saveAlertPrefsMutation.isPending}
                onSave={(preferences) => saveAlertPrefsMutation.mutate(preferences)}
            />

            {/* ── DNS verification modal ─────────────────────────────────────── */}
            <DnsVerificationDialog accounts={accounts} />

            {/* ── Delete confirm ─────────────────────────────────────────────── */}
            <DeleteInboxDialog accounts={accounts} />
        </PageTransition>
    );
}
