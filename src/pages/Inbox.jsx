import React from 'react';
import PageTransition from '../components/layout/PageTransition';
import InboxTab from '../components/campaigns/tabs/InboxTab';

export default function Inbox() {
    return (
        <PageTransition>
            <div className="h-[calc(100vh-100px)] flex flex-col space-y-5">
                {/* ── Header ── */}
                <div className="flex items-center justify-between shrink-0">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Unified Inbox</h1>
                        <p className="text-sm text-gray-400 mt-1">All your prospect replies in one place.</p>
                    </div>
                </div>

                {/* ── Inbox Panel ── */}
                <div className="flex-1 min-h-0">
                    <InboxTab className="h-full" />
                </div>
            </div>
        </PageTransition>
    );
}
