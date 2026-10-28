// F-07 / F-08 field rules, table-driven: [kind or field, value, expected error ('' = valid, or a regex), normalised]
import { describe, expect, it } from 'vitest';
import {
    COMPANY_FIELDS, CONTACT_FIELDS, SENDER_FIELDS, inputFilter, normalizeField, normalizeForm, serverFieldErrors,
    validateField, validateForm,
} from './fieldValidation';
import { countryCode, countryName, subdivisionCode } from './countries';

const ALL = { ...COMPANY_FIELDS, ...SENDER_FIELDS, ...CONTACT_FIELDS };

// [field, value, error ('' | regex), normalised (undefined = not checked), form context]
const CASES = [
    // names
    ['first_name', 'Ada', '', 'Ada'],
    ['first_name', '  José  María ', '', 'José María'],
    ['last_name', "O'Brien-Smith", ''],
    ['last_name', 'Nguyễn', ''],
    ['first_name', '李', ''],
    ['first_name', 'Ada1', /letters, spaces/],
    ['first_name', 'R2-D2', /letters, spaces/],
    ['first_name', "'.-", /must contain a letter/],
    ['first_name', '<b>Ada</b>', /HTML/],
    ['first_name', 'A'.repeat(101), /100 characters or fewer/],
    ['first_name', '', ''],
    // e-mail
    ['email', 'ada@Example.COM', '', 'ada@example.com'],
    ['email', '  first.last+tag@sub.example.co.uk ', '', 'first.last+tag@sub.example.co.uk'],
    ['email', 'jörg@exämple.de', ''],
    ['email', '', /required/],
    ['email', 'ada@', /name@company.com/],
    ['email', 'ada@@example.com', /name@company.com/],
    ['email', 'ada example@x.com', /spaces/],
    ['email', 'ada..b@example.com', /before @/],
    ['email', 'ada@localhost', /domain/],
    ['email', 'ada@-bad.com', /domain/],
    ['email', 'ada@example.c', /domain/],
    // phone (international; no country assumed)
    ['phone', '+1 (415) 555-0101', '', '+14155550101'],
    ['phone', '+44 20 7946 0958', '', '+442079460958'],
    ['phone', '0044 20 7946 0958', '', '+442079460958'],
    ['phone', '+91 98765 43210 ext 12', '', '+919876543210 ext 12'],
    ['phone', '(415) 555-0101 x7', '', '(415) 555-0101 ext 7'],
    ['phone', '030 1234567', '', '030 1234567'],
    ['phone', '+0 123 4567', /cannot start with 0/],
    ['phone', '12345', /too short/],
    ['phone', '+1234567890123456', /too many digits/],
    ['phone', '415-555-CALL', /digits, spaces/],
    ['phone', '415+5550101', /only at the start/],
    // LinkedIn: https only
    ['linkedin_url', 'https://www.linkedin.com/in/jane-smith', '', 'https://www.linkedin.com/in/jane-smith'],
    ['linkedin_url', 'linkedin.com/in/jane', '', 'https://linkedin.com/in/jane'],
    ['linkedin_url', 'https://uk.linkedin.com/company/acme', ''],
    ['linkedin_url', 'http://linkedin.com/in/jane', /https:\/\//],
    ['linkedin_url', 'javascript:alert(1)', /web link/],
    ['linkedin_url', 'https://evil.com/linkedin.com/in/x', /linkedin.com link/],
    ['linkedin_url', 'https://linkedin.com.evil.com/in/x', /linkedin.com link/],
    ['linkedin_url', 'https://www.linkedin.com/', /profile or company page/],
    ['linkedin_url', 'https://user:pw@linkedin.com/in/x', /user name or password/],
    // website: http(s), https:// added
    ['website', 'acme.com', '', 'https://acme.com'],
    ['website', 'http://acme.com/about', '', 'http://acme.com/about'],
    ['website', 'JavaScript:alert(1)', /web link/],
    ['website', 'data:text/html,<b>x', /web link|HTML/],
    ['website', 'ftp://acme.com', /https:\/\/ or http:\/\//],
    ['website', 'https://acme', /domain like/],
    ['website', 'https://acme .com', /spaces/],
    // CTA: a full https URL
    ['cta_link', 'https://calendly.com/ada/30min', ''],
    ['cta_link', 'calendly.com/ada', /starting with https:\/\//],
    ['cta_link', 'http://calendly.com/ada', /must start with https:\/\//],
    ['cta_link', 'javascript:void(0)', /web link/],
    ['cta_link', `https://x.com/${'a'.repeat(500)}`, /500 characters or fewer/],
    // sender name / title
    ['sender_name', 'Ada at Acme 360', '', 'Ada at Acme 360'],
    ['sender_name', '{{first_name}}', /\{ \}/],
    ['sender_name', '1234', /must contain a letter/],
    ['sender_title', 'VP <script>', /HTML/],
    ['sender_title', 'Head of Sales', ''],
    // domain
    ['domain', 'https://www.Acme.com/about?x=1', '', 'acme.com'],
    ['domain', 'sub.acme.co.uk', '', 'sub.acme.co.uk'],
    ['domain', 'acme', /domain like acme.com/],
    ['domain', 'javascript:alert(1)', /domain like/],
    // country (ISO, by name, code or alias) -> the ISO short name
    ['poc_country', 'de', '', 'Germany'],
    ['poc_country', 'USA', '', 'United States'],
    ['poc_country', 'united kingdom', '', 'United Kingdom'],
    ['poc_country', 'Cote d’Ivoire', '', 'Côte d’Ivoire'],
    ['poc_country', 'Atlantis', /choose a country/],
    // state by country (US / CA / AU checked, -> code); other countries free text
    ['poc_state', 'california', '', 'CA', { poc_country: 'United States' }],
    ['poc_state', 'NY', '', 'NY', { poc_country: 'US' }],
    ['poc_state', 'Narnia', /not a state of United States/, undefined, { poc_country: 'US' }],
    ['poc_state', 'Ontario', '', 'ON', { poc_country: 'Canada' }],
    ['poc_state', 'Texas', /not a province of Canada/, undefined, { poc_country: 'CA' }],
    ['poc_state', 'Bavaria', '', 'Bavaria', { poc_country: 'Germany' }],
    ['poc_state', 'Anything', '', 'Anything', {}],
    // postal code by country
    ['postal_code', '94105', '', '94105', { country: 'US' }],
    ['postal_code', '94105-1234', '', undefined, { country: 'US' }],
    ['postal_code', '9410', /12345 or 12345-6789/, undefined, { country: 'US' }],
    ['postal_code', 'k1a0b1', '', 'K1A 0B1', { country: 'Canada' }],
    ['postal_code', 'sw1a1aa', '', 'SW1A 1AA', { country: 'GB' }],
    ['postal_code', '1234ab', '', '1234 AB', { country: 'NL' }],
    ['postal_code', '1000001', '', '100-0001', { country: 'Japan' }],
    ['postal_code', '10115', '', '10115', { country: 'Germany' }],
    ['postal_code', '1011', /12345/, undefined, { country: 'Germany' }],
    ['postal_code', 'AB-123', '', 'AB-123', { country: 'Chile' }],
    ['postal_code', '!!', /letters, digits/, undefined, {}],
    // numbers
    ['annual_revenue', '2,500,000', '', '2500000'],
    ['annual_revenue', '$1200.50', '', '1200.50'],
    ['annual_revenue', '12.345', /2 decimals/],
    ['annual_revenue', '-5', /0 or more/],
    ['annual_revenue', 'lots', /must be a number/],
    ['annual_revenue', '1e9', /must be a number/],
    ['annual_revenue', '99999999999999999', /too large/],
    // plain text: no control characters / HTML, max length
    ['company_name', 'Acme <i>Corp</i>', /HTML/],
    ['company_name', 'A < B Ltd', ''],
    ['designation', 'x'.repeat(151), /150 characters or fewer/],
    ['description', 'Line one\nLine two', ''],
    ['description', 'Bad \u0007 bell', /not allowed/],
    ['name', '', /required/],
];

describe('validateField / normalizeField', () => {
    it.each(CASES)('%s %j', (field, value, expected, normalised, form = {}) => {
        const spec = ALL[field];
        const message = validateField(spec, value, form);
        if (expected === '') expect(message).toBe('');
        else expect(message).toMatch(expected);
        if (normalised !== undefined) expect(normalizeField(spec, value, form)).toBe(normalised);
    });
});

describe('max lengths follow the backend columns', () => {
    it.each([
        [CONTACT_FIELDS, { first_name: 100, last_name: 100, phone: 50, mobile_phone: 50, designation: 150, company_name: 255, linkedin_url: 500, poc_city: 100, poc_state: 100, poc_country: 100, lead_source: 100, industry: 100 }],
        [COMPANY_FIELDS, { name: 255, domain: 255, website: 500, phone: 50, industry: 100, emp_band: 50, street: 255, city: 100, state: 100, postal_code: 20, country: 100 }],
        [SENDER_FIELDS, { sender_name: 100, sender_title: 150, cta_link: 500 }],
    ])('%#', (specs, sizes) => {
        for (const [key, max] of Object.entries(sizes)) expect(specs[key].max, key).toBe(max);
    });
});

describe('validateForm / normalizeForm', () => {
    it('returns only the invalid fields and normalises the rest', () => {
        const form = { first_name: ' Ada ', email: 'ADA@ACME.COM', phone: '+1 415 555 0101', poc_country: 'us', poc_state: 'ca', linkedin_url: 'http://linkedin.com/in/ada', owner_id: 'u-1' };
        expect(validateForm(CONTACT_FIELDS, form)).toEqual({ linkedin_url: expect.stringMatching(/https/) });
        expect(normalizeForm(CONTACT_FIELDS, form)).toMatchObject({
            first_name: 'Ada', email: 'ADA@acme.com', phone: '+14155550101', poc_country: 'United States', poc_state: 'CA', owner_id: 'u-1',
        });
    });

    it('checks a required field even when the form leaves it out', () => {
        expect(validateForm(CONTACT_FIELDS, {})).toEqual({ email: 'Email is required.' });
    });
});

describe('inputFilter (keystrokes / paste)', () => {
    it.each([
        ['phone', '+1 (415) 555-0101 ext 9\n', '+1 (415) 555-0101 ext 9 '],
        ['phone', '415<script>', '415t'],
        ['email', ' ada@\nacme.com ', 'ada@acme.com'],
        ['cta_link', 'https://cal.com/a b', 'https://cal.com/ab'],
        ['first_name', 'Ada\r\nLovelace', 'Ada Lovelace'],
        ['annual_revenue', '$2,500abc', '$2,500'],
    ])('%s %j', (field, raw, out) => {
        expect(inputFilter(ALL[field])(raw)).toBe(out);
    });

    it('leaves multi-line text alone', () => {
        expect(inputFilter(COMPANY_FIELDS.description)).toBeNull();
    });
});

describe('serverFieldErrors', () => {
    it.each([
        [{ detail: [{ loc: ['body', 'email'], msg: 'value is not a valid email address' }] }, { email: 'value is not a valid email address' }],
        [{ detail: [{ loc: ['body', 'linkedin_url'], msg: 'Value error, LinkedIn must start with https://' }, { loc: ['body', 'phone'], msg: 'too long' }] },
            { linkedin_url: 'LinkedIn must start with https://', phone: 'too long' }],
        [{ detail: { field: 'cta_link', message: 'Use https' } }, { cta_link: 'Use https' }],
        [{ detail: 'A contact with this email already exists' }, {}],
        // as api/http.js normalizeError flattens the list
        [{ detail: 'email: value is not a valid email address; custom_fields.tier: Value error, pick one' }, { email: 'value is not a valid email address', tier: 'pick one' }],
        [{ detail: 'Not valid: try again; or not' }, {}],
        [{ detail: 'Use https', detail_data: { field: 'cta_link', message: 'Use https' } }, { cta_link: 'Use https' }],
        [undefined, {}],
    ])('%#', (data, expected) => {
        expect(serverFieldErrors(data ? { response: { status: 422, data } } : new Error('x'))).toEqual(expected);
    });
});

describe('countries', () => {
    it.each([['DE', 'DE'], ['germany', 'DE'], ['U.S.A.', 'US'], ['UK', 'GB'], ['Holland', 'NL'], ['nowhere', null], ['', null]])(
        'countryCode(%j)', (value, code) => expect(countryCode(value)).toBe(code));

    it('names codes and finds subdivisions', () => {
        expect(countryName('fr')).toBe('France');
        expect(subdivisionCode('US', 'New York')).toBe('NY');
        expect(subdivisionCode('AU', 'nsw')).toBe('NSW');
        expect(subdivisionCode('DE', 'Bavaria')).toBeNull();
    });
});
