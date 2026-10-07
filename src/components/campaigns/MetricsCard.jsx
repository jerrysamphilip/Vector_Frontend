import React from 'react';

export default function MetricsCard({ title, value, icon: Icon, type, subtext }) {
    // Color Mapping based on strict requirements
    const typeConfig = {
        sent: {
            valueColor: 'text-slate-800',
            iconColor: 'text-slate-400'
        },
        opened: {
            valueColor: 'text-[#86A8E7]', // accent-blue
            iconColor: 'text-[#86A8E7]'
        },
        replied: {
            // User requested explicit #5FFBF1 for replied status
            valueColor: 'text-[#5FFBF1]',
            iconColor: 'text-[#5FFBF1]'
        },
        bounced: {
            valueColor: 'text-slate-500',
            iconColor: 'text-slate-400'
        },
    };

    // Override Replied to be readable if #5FFBF1 is invisible. 
    // #5FFBF1 is Electric Blue. On White it's okay but check contrast.
    // I will use it.

    const config = typeConfig[type] || typeConfig.sent;

    return (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 flex flex-col justify-between h-full hover:border-blue-400 transition-all duration-200">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                </div>
                <span className={`text-2xl font-bold ${config.valueColor} tracking-tight`}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </span>
            </div>

            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                {subtext && (
                    <p className="text-xs text-slate-400 mt-1">
                        {subtext}
                    </p>
                )}
            </div>
        </div>
    );
}
