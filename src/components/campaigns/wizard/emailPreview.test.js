import { describe, expect, it } from 'vitest';
import {
    buildSignatureBlockPreview, escapeHtml, formatEmailBodyForPreview, hasSingleBraceTags, normalizeUnsubscribePreview,
    plainTextToHtml, substituteProspectData,
} from './emailPreview';
import { TIMEZONE_OPTIONS, timezoneShortLabel, tzMatches } from './timezones';

const prospect = { first_name: 'Ana', last_name: 'Lopez', company_name: 'Acme', poc_city: 'Austin', poc_state: 'TX', designation: null };
const sender = { sender_name: 'Sam', sender_title: ' VP Sales ', cta_link: 'https://cal.example/sam' };

describe('email preview helpers', () => {
    it('fills prospect, composite and sender tokens (case-insensitive) with fallbacks', () => {
        const text = 'Hi {{First_Name}} ({{full_name}}) at {{company}} in {{location}}, {{role}}. {{your_name}} {{cta_link}} {{unknown}}';
        expect(substituteProspectData(text, prospect, sender))
            .toBe('Hi Ana (Ana Lopez) at Acme in Austin, TX, Professional. Sam https://cal.example/sam {{unknown}}');
    });

    it('leaves the text unchanged without a prospect', () => {
        expect(substituteProspectData('Hi {{first_name}}', null, sender)).toBe('Hi {{first_name}}');
    });

    it('builds the signature like the backend', () => {
        expect(buildSignatureBlockPreview(sender)).toBe('Sam\nVP Sales\nNeutrino Tech Systems');
        expect(buildSignatureBlockPreview({})).toBe('[Your Name]\nNeutrino Tech Systems');
    });

    it('wraps plain text as paragraphs and bullet lines as a list', () => {
        expect(plainTextToHtml('Hello\n\n- one\n* two\nBye')).toBe('<p>Hello</p><ul><li>one</li><li>two</li></ul><p>Bye</p>');
        expect(plainTextToHtml('')).toBe('');
    });

    it('drops unsubscribe footers from the preview', () => {
        expect(normalizeUnsubscribePreview('Thanks\n\nTo unsubscribe click here\nReply "unsubscribe" to stop')).toBe('Thanks');
    });

    it('escapes plain-text bodies and keeps HTML bodies', () => {
        expect(escapeHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
        expect(formatEmailBodyForPreview('a < b\nc', null, sender)).toBe('a &lt; b<br />c');
        expect(formatEmailBodyForPreview('<p>Hi {{first_name}}</p>', prospect, sender)).toBe('<p>Hi Ana</p>');
    });

    it('flags single-brace personalization tags only', () => {
        expect(hasSingleBraceTags('Hi {first_name}')).toBe(true);
        expect(hasSingleBraceTags('Hi {{first_name}}')).toBe(false);
        expect(hasSingleBraceTags('')).toBe(false);
    });
});

describe('timezone options', () => {
    it('are sorted by UTC offset and labelled with it', () => {
        const offsets = TIMEZONE_OPTIONS.map(tz => tz.offset);
        expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
        expect(TIMEZONE_OPTIONS.find(tz => tz.value === 'Europe/London').shortLabel).toMatch(/^\(GMT[+-]\d\d:\d\d\) London$/);
    });

    it('match by country / abbreviation aliases and city', () => {
        // the runtime lists India as Asia/Kolkata or (older ICU) Asia/Calcutta; both carry the aliases
        const india = TIMEZONE_OPTIONS.find(tz => tz.value === 'Asia/Kolkata' || tz.value === 'Asia/Calcutta');
        expect(tzMatches(india, 'india')).toBe(true);
        expect(tzMatches(india, 'IST')).toBe(true);
        expect(tzMatches(india, 'london')).toBe(false);
        expect(tzMatches(india, '  ')).toBe(true);
        const london = TIMEZONE_OPTIONS.find(tz => tz.value === 'Europe/London');
        expect(tzMatches(london, 'england')).toBe(true);
        expect(tzMatches(london, 'Europe/Lon')).toBe(true);
    });

    it('hide obscure sub-zones and fall back to the id for unknown labels', () => {
        expect(TIMEZONE_OPTIONS.some(tz => tz.value === 'America/Indiana/Knox')).toBe(false);
        expect(timezoneShortLabel('Mars/Olympus_Mons')).toBe('Mars/Olympus Mons');
    });
});
