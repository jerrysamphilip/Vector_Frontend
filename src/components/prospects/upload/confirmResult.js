// The answer of POST /uploads/{id}/confirmations (backend app/services/prospect_upload_service.py confirm_upload):
//   { list_id, inserted, new_prospects, updated, skipped_unsubscribed, rejected, failed,
//     not_added: [{ row, email, reason }], status: CONFIRMED | NO_RECORDS_ADDED | NO_ACCEPTED_RECORDS,
//     already_confirmed?: true }
// The API re-checks every accepted row: rows it refuses (rejected), the database refuses (failed) or that are
// globally unsubscribed are listed in not_added; the others are saved.

/**
 * What the page does with a confirm result.
 *   done: true  -> everything was saved (or the upload was already confirmed): go back to the prospects
 *   done: false -> stay and show the summary and the rows that were not added
 */
export function confirmOutcome(result) {
    const r = result || {};
    const notAdded = Array.isArray(r.not_added) ? r.not_added : [];
    const summary = {
        listId: r.list_id,
        inserted: Number(r.inserted) || 0,
        newProspects: Number(r.new_prospects) || 0,
        updated: Number(r.updated) || 0,
        rejected: Number(r.rejected) || 0,
        failed: Number(r.failed) || 0,
        unsubscribed: Number(r.skipped_unsubscribed) || 0,
        notAdded,
        status: r.status,
        alreadyConfirmed: Boolean(r.already_confirmed),
    };
    if (summary.alreadyConfirmed) return { done: true, summary };
    const clean = r.status === 'CONFIRMED' && notAdded.length === 0 && summary.rejected === 0 && summary.failed === 0;
    return { done: clean, summary };
}
