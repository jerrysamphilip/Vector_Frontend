import { AnimatePresence, motion } from 'framer-motion';
import { formatAlertTime, getAlertVisual } from './dashboardAlerts';
import { BellRing } from 'lucide-react';

// Dashboard header bell: unread count and the Alert Center popup (mark read, open the related page).
export default function AlertCenter({ dashboard }) {
    const {
        alertPopupRef, bellShouldRing, dashboardAlerts, isAlertOpen, markAlertsAsRead, markAllAsRead, navigate,
        setIsAlertOpen, toggleAlertPanel, unreadAlertSet, unseenAlertIds
    } = dashboard;
    return (
        <div className="relative" ref={alertPopupRef}>
            <button
                type="button"
                onClick={toggleAlertPanel}
                className={`relative inline-flex items-center justify-center rounded-2xl border w-10 h-10 text-sm font-semibold transition-all ${
                    dashboardAlerts.length > 0
                        ? 'border-amber-200 bg-white text-slate-700 hover:border-amber-300 hover:shadow-sm'
                        : 'border-slate-200 bg-white/75 text-slate-400'
                } ${bellShouldRing ? 'dashboard-bell-ring' : ''}`}
                aria-label="Open alerts"
            >
                <BellRing className={`h-4 w-4 ${dashboardAlerts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                {dashboardAlerts.length > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {unseenAlertIds.length}
                    </span>
                )}
            </button>

            {/* Alert Center Popup */}
            <AnimatePresence>
                {isAlertOpen && dashboardAlerts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute right-0 top-12 z-50 w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Alert Center</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {unseenAlertIds.length} unread · {dashboardAlerts.length} active alert{dashboardAlerts.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={markAllAsRead}
                                    disabled={unseenAlertIds.length === 0}
                                    className={`text-[10px] font-semibold ${
                                        unseenAlertIds.length === 0
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-[#0046FF] hover:underline'
                                    }`}
                                >
                                    Mark all read
                                </button>
                                <button
                                    onClick={() => setIsAlertOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                                    aria-label="Close alerts"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Alert list */}
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                            {dashboardAlerts.map((alert) => {
                                const { Icon, badge, border, iconBg, iconColor, badgeClass } = getAlertVisual(alert);
                                return (
                                    <div
                                        key={alert.id}
                                        className={`flex items-start gap-3 px-5 py-4 border-l-2 ${border} hover:bg-gray-50/60 transition-colors`}
                                    >
                                        <span className={`w-8 h-8 flex items-center justify-center rounded-xl shrink-0 mt-0.5 ${iconBg}`}>
                                            <Icon size={15} className={iconColor} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                <p className="text-xs font-semibold text-gray-800 truncate">{alert.title}</p>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>{badge}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{alert.message}</p>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[10px] text-gray-400">{formatAlertTime(alert.createdAt)}</span>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => markAlertsAsRead([alert.id])}
                                                        disabled={!unreadAlertSet.has(alert.id)}
                                                        className={`text-[10px] font-semibold ${
                                                            unreadAlertSet.has(alert.id)
                                                                ? 'text-gray-500 hover:underline'
                                                                : 'text-gray-300 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        {unreadAlertSet.has(alert.id) ? 'Mark read' : 'Read'}
                                                    </button>
                                                    {alert.route && (
                                                        <button
                                                            onClick={() => {
                                                                markAlertsAsRead([alert.id]);
                                                                navigate(alert.route);
                                                                setIsAlertOpen(false);
                                                            }}
                                                            className="text-[10px] font-semibold text-[#0046FF] hover:underline"
                                                        >
                                                            {alert.actionLabel || 'View'} →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
