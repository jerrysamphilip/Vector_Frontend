import React, { useState } from 'react';
import { Mail, Shield, AlertTriangle, Clock, Settings, RefreshCw, Save, X, CheckCircle2, Zap } from 'lucide-react';
import { apiClient as api } from '../../../api/http';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '../../layout/PageTransition';

export default function SendingInboxesTab({ campaign }) {
    const [inboxes, setInboxes] = useState(campaign?.sending_inboxes || []);
    const [editingInbox, setEditingInbox] = useState(null);
    const [syncing, setSyncing] = useState(null);
    const [formData, setFormData] = useState({
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        smtp_use_ssl: false,
        imap_host: '',
        imap_username: '',
        imap_password: '',
        imap_port: 993
    });

    const handleEdit = (inbox) => {
        setEditingInbox(inbox.inbox_id);
        setFormData({
            smtp_host: inbox.smtp_host || '',
            smtp_port: inbox.smtp_port || 587,
            smtp_username: inbox.smtp_username || '',
            smtp_password: '',
            smtp_use_ssl: inbox.smtp_use_ssl || false,
            imap_host: inbox.imap_host || '',
            imap_username: inbox.imap_username || '',
            imap_password: '',
            imap_port: inbox.imap_port || 993
        });
    };

    const handleSave = async (inboxId) => {
        try {
            const res = await api.put(`/inboxes/${inboxId}`, formData);
            setInboxes(inboxes.map(i => i.inbox_id === inboxId ? res.data : i));
            setEditingInbox(null);
        } catch (error) {
            console.error('Failed to update inbox', error);
            alert('Failed to save credentials');
        }
    };

    const handleSync = async (inboxId) => {
        setSyncing(inboxId);
        try {
            await api.post(`/inboxes/${inboxId}/sync`, { days: 30 });
            const res = await api.get(`/inboxes/${inboxId}`);
            setInboxes(inboxes.map(i => i.inbox_id === inboxId ? res.data : i));
        } catch (error) {
            console.error('Sync failed', error);
            alert('Sync failed - check your IMAP credentials');
        } finally {
            setSyncing(null);
        }
    };

    return (
        <motion.div variants={containerVariants} initial="initial" animate="animate" className="space-y-4">

            {/* Section Header */}
            <div
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}
                        >
                            <Mail className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Sending Inboxes</p>
                            <p className="text-xs text-gray-400">
                                {inboxes.length > 0
                                    ? `${inboxes.length} inbox${inboxes.length !== 1 ? 'es' : ''} assigned`
                                    : 'No inboxes assigned'}
                            </p>
                        </div>
                    </div>
                </div>

                {inboxes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                            style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}
                        >
                            <Mail className="w-7 h-7" style={{ color: '#2d6bbf' }} />
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 mb-1">No Inboxes Assigned</h3>
                        <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
                            This campaign doesn't have any specific sending inboxes assigned yet.
                            It is currently using the default system sender.
                        </p>
                        <button
                            className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-medium text-sm"
                            style={{ background: '#4f46e5' }}
                        >
                            Assign Inboxes
                        </button>
                    </div>
                ) : (
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inboxes.map((inbox) => (
                            <motion.div
                                key={inbox.inbox_id}
                                variants={itemVariants}
                                className="relative bg-gray-50 border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-all overflow-hidden"
                            >
                                {/* Status stripe */}
                                <div
                                    className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
                                    style={{
                                        background: inbox.status === 'ACTIVE'
                                            ? 'linear-gradient(180deg, #10b981, #059669)'
                                            : '#cbd5e1'
                                    }}
                                />

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #2d6bbf18, #73C8D218)' }}
                                        >
                                            <Mail className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 text-sm">{inbox.email_address}</h4>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">{inbox.provider || 'SMTP Provider'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => editingInbox === inbox.inbox_id ? setEditingInbox(null) : handleEdit(inbox)}
                                        className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-blue-600 transition-colors border border-transparent hover:border-gray-200"
                                    >
                                        {editingInbox === inbox.inbox_id ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                    </button>
                                </div>

                                {editingInbox === inbox.inbox_id ? (
                                    <div className="space-y-3 py-2">
                                        {/* SMTP Section */}
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SMTP (Sending)</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                placeholder="SMTP Host"
                                                className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                                value={formData.smtp_host}
                                                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Port (587)"
                                                className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                                value={formData.smtp_port}
                                                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="SMTP Username (usually email)"
                                            className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                            value={formData.smtp_username}
                                            onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="SMTP Password / App Password"
                                            className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                            value={formData.smtp_password}
                                            onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                                        />
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.smtp_use_ssl}
                                                onChange={(e) => setFormData({ ...formData, smtp_use_ssl: e.target.checked })}
                                                className="rounded"
                                            />
                                            <span className="text-[11px] text-gray-500">Use SSL (port 465)</span>
                                        </label>

                                        {/* IMAP Section */}
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-1 border-t border-gray-100">IMAP (Receiving Replies)</p>
                                        <div className="rounded-xl p-2.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200">
                                            Zoho India: <strong>imappro.zoho.in</strong> · Zoho Global: <strong>imap.zoho.com</strong> · Port: 993 · Use an <strong>App Password</strong> (not your login password)
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                placeholder="IMAP Host (e.g. imappro.zoho.in)"
                                                className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                                value={formData.imap_host}
                                                onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Port (993)"
                                                className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                                value={formData.imap_port}
                                                onChange={(e) => setFormData({ ...formData, imap_port: e.target.value })}
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="IMAP Username (usually your email address)"
                                            className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                            value={formData.imap_username}
                                            onChange={(e) => setFormData({ ...formData, imap_username: e.target.value })}
                                        />
                                        <input
                                            type="password"
                                            placeholder="IMAP App Password"
                                            className="text-xs p-2.5 border border-gray-200 rounded-xl bg-white w-full focus:outline-none focus:border-blue-400"
                                            value={formData.imap_password}
                                            onChange={(e) => setFormData({ ...formData, imap_password: e.target.value })}
                                        />
                                        <button
                                            onClick={() => handleSave(inbox.inbox_id)}
                                            className="w-full text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-md"
                                            style={{ background: '#4f46e5' }}
                                        >
                                            <Save className="w-3.5 h-3.5" /> Save Credentials
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                                            <div>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Daily Limit</p>
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                                    <span>{inbox.daily_limit}</span>
                                                    <span className="text-xs font-normal text-gray-400">emails</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase mb-1">Last Sync</p>
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                                    <Clock className="w-3.5 h-3.5 text-gray-300" />
                                                    <span>{inbox.last_sync_at ? new Date(inbox.last_sync_at).toLocaleDateString() : 'Never'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs">
                                                <div className={`flex items-center gap-1 ${inbox.smtp_host ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                    <Shield className="w-3.5 h-3.5" />
                                                    <span className="font-medium">{inbox.smtp_host ? 'SMTP' : 'SES Relay'}</span>
                                                </div>
                                                {inbox.imap_host && (
                                                    <div className="flex items-center gap-1 text-emerald-600">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span className="font-medium">IMAP</span>
                                                    </div>
                                                )}
                                            </div>
                                            {inbox.imap_host && (
                                                <button
                                                    onClick={() => handleSync(inbox.inbox_id)}
                                                    disabled={!!syncing}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                                                    style={{ background: 'rgba(45,107,191,0.08)', color: '#2d6bbf' }}
                                                >
                                                    <RefreshCw className={`w-3 h-3 ${syncing === inbox.inbox_id ? 'animate-spin' : ''}`} />
                                                    {syncing === inbox.inbox_id ? 'Syncing...' : 'Sync History'}
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Banner */}
            <div
                className="rounded-2xl p-4 flex gap-3 border"
                style={{ background: 'rgba(45,107,191,0.05)', borderColor: 'rgba(45,107,191,0.15)' }}
            >
                <Zap className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#2d6bbf' }} />
                <div className="text-sm" style={{ color: '#1e3a7a' }}>
                    <p className="font-semibold mb-1">Historical Email Synchronization</p>
                    <p className="opacity-75">
                        To see old emails and maintain a complete thread history, click the gear icon to provide your mail provider's IMAP settings.
                        We recommend using an <strong>App Password</strong> for security.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
