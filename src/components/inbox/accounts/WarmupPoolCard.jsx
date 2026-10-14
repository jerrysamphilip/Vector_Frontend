import { Sparkles, Zap } from 'lucide-react';
import { ReputationRing } from './shared';

// Current warm-up pool (with growth score) and the average reputation ring.
export default function WarmupPoolCard({ accounts }) {
    const {
        overview, poolStyle, repColor
    } = accounts;
    return (
        <div className="card-anim bg-white/80 rounded-2xl shadow-sm p-6" style={{ animationDelay: '100ms' }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Warmup Pool</p>
                        <div className="flex items-center gap-3">
                            <Sparkles size={16} style={{ color: poolStyle.color }}/>
                            <span className="text-xl font-bold text-gray-900">{poolStyle.label}</span>
                            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
                                  style={{ backgroundColor: poolStyle.bg, borderColor: poolStyle.border, color: poolStyle.color }}>
                                <Zap size={11}/> Score {overview.pool_growth_score}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReputationRing value={overview.average_reputation} size={56}/>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Avg Reputation</p>
                        <p className="text-2xl font-bold" style={{ color: repColor }}>{overview.average_reputation}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
