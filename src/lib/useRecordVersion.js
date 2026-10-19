import { useEffect, useRef } from 'react';
import { versionOf, withVersion } from './staleVersion';

/**
 * The latest row_version known for a record shown on screen (T-3, lib/staleVersion.js), for screens that
 * save one field at a time (blur-save, quick selects). It follows the loaded record and the responses of
 * this screen's own saves, so two quick saves in a row do not trip over each other; pair it with a
 * useMutation `scope` so they run one after the other.
 */
export function useRecordVersion(record) {
    const ref = useRef(null);
    const loaded = versionOf(record);
    useEffect(() => {
        if (loaded !== null && (ref.current === null || loaded > ref.current)) ref.current = loaded;
    }, [loaded]);
    return ref;
}

/** mutationFn that sends the tracked version as expected_version and keeps the one the API returns. */
export function versionedSave(versionRef, save) {
    return async (payload) => {
        const data = await save(withVersion(payload, versionRef.current));
        const next = versionOf(data);
        if (next !== null) versionRef.current = next;
        return data;
    };
}
