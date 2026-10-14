import { AlertCircle, MailOpen, MessageSquare, Send, UserX } from 'lucide-react';

// Dashboard: totals of sent, opens, replies, bounces and unsubscribes.
export default function StatTilesRow({ dashboard }) {
    const {
        totals
    } = dashboard;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
                { label: 'Total Sent',   value: totals.sent,         icon: Send,          iconBg: '#d6e0ff', iconColor: '#0046FF', textColor: '#0035cc' },
                { label: 'Opens',        value: totals.opened,       icon: MailOpen,      iconBg: '#d8f1f4', iconColor: '#73C8D2', textColor: '#4aabb5' },
                { label: 'Replies',      value: totals.replied,      icon: MessageSquare, iconBg: '#fff4dc', iconColor: '#e6a830', textColor: '#b07d10' },
                { label: 'Bounces',      value: totals.bounced,      icon: AlertCircle,   iconBg: '#fff0d9', iconColor: '#FF9013', textColor: '#cc6f00' },
                { label: 'Unsubscribes', value: totals.unsubscribed, icon: UserX,         iconBg: '#f4e1e6', iconColor: '#c2436b', textColor: '#a02f54' },
            ].map(({ label, value, icon: Icon, iconBg, iconColor, textColor }, i) => (
                <div
                    key={label}
                    className="card-anim bg-white/80 rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                    style={{ animationDelay: `${160 + i * 80}ms` }}
                >
                    <span className="w-11 h-11 flex items-center justify-center rounded-xl shrink-0" style={{ backgroundColor: iconBg }}>
                        <Icon size={20} style={{ color: iconColor }} />
                    </span>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">{label}</p>
                        <p className="text-xl font-bold mt-0.5" style={{ color: textColor }}>{value.toLocaleString()}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
