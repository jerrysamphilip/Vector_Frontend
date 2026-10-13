import { GRADE_TONES } from '../../api/contactScoring';

/** Grade chip with the 0-100 score (BR-CM-43). Shows a dash until the contact is scored. */
export default function ScoreBadge({ score, grade, fit, engagement, size = 'sm' }) {
    if (score === null || score === undefined) {
        return <span className="text-sm text-slate-400" data-testid="score-badge" data-grade="">—</span>;
    }
    const title = fit !== undefined && fit !== null ? `Score ${score} · Fit ${fit} · Engagement ${engagement ?? 0}` : `Score ${score}`;
    const big = size === 'lg';
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={title} data-testid="score-badge" data-grade={grade || ''}>
            <span className={`inline-flex items-center justify-center rounded-md border font-bold ${GRADE_TONES[grade] || GRADE_TONES.D} ${big ? 'w-8 h-8 text-base' : 'w-5 h-5 text-[11px]'}`}>
                {grade || '–'}
            </span>
            <span className={`font-semibold text-slate-700 tabular-nums ${big ? 'text-2xl' : 'text-sm'}`}>{score}</span>
        </span>
    );
}
