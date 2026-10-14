
// Dashboard: date-range parameters per tab and the chart series built from the analytics timeseries.

// ─── Tab configuration for date ranges ────────────────────────────────────────
export function getTabParams(tab) {
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    switch (tab) {
        case 'DAILY': {
            const start = new Date(today);
            start.setDate(today.getDate() - 6); // last 7 days including today
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'daily' };
        }
        case 'WEEKLY': {
            const start = new Date(today);
            start.setDate(today.getDate() - 27); // last 4 weeks
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'weekly' };
        }
        case 'MONTHLY': {
            const start = new Date(today);
            start.setMonth(today.getMonth() - 5); // last 6 months
            start.setDate(1);
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'daily' };
        }
        case 'YEARLY': {
            const start = new Date(today);
            start.setFullYear(today.getFullYear() - 3);
            start.setMonth(0, 1);
            return { start_date: fmt(start), end_date: fmt(today), granularity: 'daily' };
        }
        default:
            return { start_date: fmt(new Date(today.setDate(today.getDate() - 29))), end_date: fmt(new Date()), granularity: 'daily' };
    }
}

export function getTabSubtitle(tab) {
    switch (tab) {
        case 'DAILY':   return 'Last 7 days';
        case 'WEEKLY':  return 'Last 4 weeks';
        case 'MONTHLY': return 'Last 6 months';
        case 'YEARLY':  return 'Last 4 years';
        default:        return '';
    }
}

export function formatTimeseries(timeseries, tab) {
    if (!timeseries || timeseries.length === 0) return [];

    if (tab === 'DAILY') {
        // Show actual dates like "Mar 20", "Mar 21", etc.
        return timeseries.map(p => ({
            label: new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Sent: p.sent,
            Opened: p.opened,
        }));
    }

    if (tab === 'WEEKLY') {
        // Already aggregated weekly by backend — show date range like "Feb 27 – Mar 5"
        return timeseries.map((p) => {
            const start = new Date(p.date + 'T00:00:00');
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const fmtShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return {
                label: `${fmtShort(start)} – ${fmtShort(end)}`,
                Sent: p.sent,
                Opened: p.opened,
            };
        });
    }

    if (tab === 'MONTHLY') {
        // Aggregate daily points into months
        const monthMap = {};
        timeseries.forEach(p => {
            const d = new Date(p.date + 'T00:00:00');
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) monthMap[key] = { sent: 0, opened: 0, date: d };
            monthMap[key].sent += p.sent;
            monthMap[key].opened += p.opened;
        });
        return Object.entries(monthMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, v]) => ({
                label: v.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                Sent: v.sent,
                Opened: v.opened,
            }));
    }

    if (tab === 'YEARLY') {
        // Aggregate daily points into years
        const yearMap = {};
        timeseries.forEach(p => {
            const y = p.date.slice(0, 4);
            if (!yearMap[y]) yearMap[y] = { sent: 0, opened: 0 };
            yearMap[y].sent += p.sent;
            yearMap[y].opened += p.opened;
        });
        return Object.entries(yearMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([year, v]) => ({
                label: year,
                Sent: v.sent,
                Opened: v.opened,
            }));
    }

    return [];
}
