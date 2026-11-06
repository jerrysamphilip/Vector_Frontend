import { describe, expect, it } from 'vitest';
import { CAMPAIGN_MERGE_FIELDS, unknownMergeFields } from './mergeFields';

describe('unknownMergeFields', () => {
    it('knows every template-library field (Sales → Templates)', () => {
        for (const name of ['first_name', 'last_name', 'full_name', 'company_name', 'designation', 'email', 'industry', 'your_name', 'calendar_link']) {
            expect(CAMPAIGN_MERGE_FIELDS.has(name)).toBe(true);
        }
    });

    it('lists unknown tokens once, lower case, ignoring case and spaces of known ones', () => {
        expect(unknownMergeFields('Hi {{ First_Name }}, {{Nickname}}', '<p>{{phone}} {{nickname}} {{unsubscribe_link}}</p>'))
            .toEqual(['nickname', 'phone']);
        expect(unknownMergeFields('Hi {{first_name}}', null, undefined)).toEqual([]);
    });
});
