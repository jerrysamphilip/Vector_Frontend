// Merge the enrolment dry runs of several lists (POST /campaigns/{id}/enrollments/checks, wizard path)
// the way the real launch merges the enrolments: a contact on several lists counts once, and a
// contact that some list would enrol is not reported as skipped by another.

export function mergeEnrollmentChecks(results) {
    const enrol = new Map();
    const skipped = new Map();
    for (const result of results) {
        for (const p of result?.would_enroll || []) enrol.set(p.prospect_id, p);
    }
    for (const result of results) {
        for (const r of result?.rejected || []) {
            if (enrol.has(r.prospect_id) || skipped.has(r.prospect_id)) continue;
            skipped.set(r.prospect_id, r);
        }
    }
    const rejected = [...skipped.values()];
    const byReason = {};
    rejected.forEach(r => { byReason[r.reason] = (byReason[r.reason] || 0) + 1; });
    // Lists truncated by the API (more than returned) still count in the totals
    const truncated = results.some(r => (r?.rejected_count || 0) > (r?.rejected || []).length
        || (r?.would_enroll_count || 0) > (r?.would_enroll || []).length);
    return {
        wouldEnroll: enrol.size,
        rejected,
        byReason: Object.entries(byReason).sort((a, b) => b[1] - a[1]),
        truncated,
    };
}

export function skippedCsvRows(rejected) {
    return [['Name', 'Email', 'Reason'], ...rejected.map(r => [r.name, r.email, r.reason])];
}
