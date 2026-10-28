// Field validation and normalisation for the CRM forms (F-07 / F-08): contacts (create form and the record page
// edit), companies, and the campaign sender details. Pure functions, no React; the server stays the authority
// (its 422 field errors are mapped back onto the fields by serverFieldErrors).
//
// A form is described by a spec table { field: { kind, label, max, required, ... } }:
//   validateField(spec, value, form)  -> '' or the message to show next to the field
//   normalizeField(spec, value, form) -> the value to send (trimmed, E.164 phone, https:// added, ISO country ...)
//   validateForm(specs, form)         -> { field: message } for the invalid fields only
//   normalizeForm(specs, form)        -> a copy of form with every spec'd field normalised
//   inputFilter(spec)                 -> keystroke / paste filter for onChange (null when the kind has none)
// Maximum lengths follow the backend columns (app/models/prospect.py, account.py, campaign.py).
//
// Kinds: name, personName (sender name), email, phone, linkedin, url (http/https, https:// added when missing),
// httpsUrl (a full https:// link), domain, country, state, postal, number, text, multiline.

import { countryCode, countryName, SUBDIVISIONS, subdivisionCode } from './countries';

// Control characters (C0 + DEL), by char code so the source holds no control-character regex
const isControl = code => code < 0x20 || code === 0x7F;
const LINE_CHARS = new Set([0x09, 0x0A, 0x0D]);                 // tab and line breaks, allowed in multi-line text
function hasControl(value, multiline) {
    for (let i = 0; i < value.length; i += 1) {
        const code = value.charCodeAt(i);
        if (isControl(code) && !(multiline && LINE_CHARS.has(code))) return true;
    }
    return false;
}
/** Each run of control characters (a pasted line break ...) -> one space, or '' with drop. */
function replaceControls(value, drop = false) {
    let out = '';
    let inRun = false;
    for (const ch of value) {
        if (isControl(ch.charCodeAt(0))) {
            if (!inRun && !drop) out += ' ';
            inRun = true;
        } else {
            out += ch;
            inRun = false;
        }
    }
    return out;
}
const HTML_TAG = /<[a-zA-Z!/?]/;
const DANGEROUS_SCHEME = /^\s*(javascript|data|vbscript|file|blob)\s*:/i;

const collapse = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const isBlank = v => v == null || (typeof v === 'string' && !v.trim());

// ── Field specs (max lengths = backend column sizes) ───────────────
export const CONTACT_FIELDS = {
    first_name: { kind: 'name', label: 'First name', max: 100 },
    last_name: { kind: 'name', label: 'Last name', max: 100 },
    email: { kind: 'email', label: 'Email', max: 254, required: true },
    phone: { kind: 'phone', label: 'Phone', max: 50 },
    mobile_phone: { kind: 'phone', label: 'Mobile', max: 50 },
    designation: { kind: 'text', label: 'Job title', max: 150 },
    company_name: { kind: 'text', label: 'Company', max: 255 },
    industry: { kind: 'text', label: 'Industry', max: 100 },
    lead_source: { kind: 'text', label: 'Lead source', max: 100 },
    linkedin_url: { kind: 'linkedin', label: 'LinkedIn', max: 500 },
    poc_city: { kind: 'text', label: 'City', max: 100 },
    poc_state: { kind: 'state', label: 'State', max: 100, countryField: 'poc_country' },
    poc_country: { kind: 'country', label: 'Country', max: 100 },
};

export const COMPANY_FIELDS = {
    name: { kind: 'text', label: 'Name', max: 255, required: true },
    domain: { kind: 'domain', label: 'Domain', max: 255 },
    website: { kind: 'url', label: 'Website', max: 500 },
    phone: { kind: 'phone', label: 'Phone', max: 50 },
    industry: { kind: 'text', label: 'Industry', max: 100 },
    emp_band: { kind: 'text', label: 'Employees', max: 50 },
    annual_revenue: { kind: 'number', label: 'Annual revenue', min: 0, integerDigits: 16, decimals: 2 },   // DECIMAL(18,2)
    street: { kind: 'text', label: 'Street', max: 255 },
    city: { kind: 'text', label: 'City', max: 100 },
    state: { kind: 'state', label: 'State', max: 100, countryField: 'country' },
    postal_code: { kind: 'postal', label: 'Postal code', max: 20, countryField: 'country' },
    country: { kind: 'country', label: 'Country', max: 100 },
    description: { kind: 'multiline', label: 'About', max: 10000 },
};

export const SENDER_FIELDS = {
    sender_name: { kind: 'personName', label: 'Sender name', max: 100 },
    sender_title: { kind: 'text', label: 'Sender title', max: 150 },
    cta_link: { kind: 'httpsUrl', label: 'CTA / booking link', max: 500 },
};

// ── Shared text rules ──────────────────────────────────────────────
function textProblem(spec, value, { multiline = false } = {}) {
    if (hasControl(value, multiline)) return `${spec.label} contains characters that are not allowed.`;
    if (HTML_TAG.test(value)) return `${spec.label} cannot contain HTML.`;
    if (spec.max && value.length > spec.max) return `${spec.label} must be ${spec.max} characters or fewer (now ${value.length}).`;
    return '';
}

// ── Names ──────────────────────────────────────────────────────────
const NAME_CHARS = /^[\p{L}\p{M} .'’-]+$/u;
const HAS_LETTER = /\p{L}/u;

function nameProblem(spec, value) {
    if (!NAME_CHARS.test(value)) return `${spec.label} can use letters, spaces, hyphens, apostrophes and periods only.`;
    if (!HAS_LETTER.test(value)) return `${spec.label} must contain a letter.`;
    return '';
}

// A display name used in e-mail sign-offs: any text with a letter, but no template braces or tags
function personNameProblem(spec, value) {
    if (/[{}<>@]/.test(value)) return `${spec.label} cannot contain { } < > or @.`;
    if (!HAS_LETTER.test(value)) return `${spec.label} must contain a letter.`;
    return '';
}

// ── E-mail ─────────────────────────────────────────────────────────
const EMAIL_LOCAL = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+(\.[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+)*$/u;
const DOMAIN_LABEL = /^(?!-)[\p{L}\p{N}-]{1,63}(?<!-)$/u;
const TLD = /^(\p{L}{2,63}|xn--[a-z0-9-]{2,59})$/iu;

function validHostname(host) {
    if (!host || host.length > 253) return false;
    const labels = host.split('.');
    if (labels.length < 2) return false;
    return labels.every(l => DOMAIN_LABEL.test(l)) && TLD.test(labels[labels.length - 1]);
}

export function normalizeEmail(raw) {
    const value = String(raw ?? '').trim();
    const at = value.lastIndexOf('@');
    if (at < 0) return value;
    return `${value.slice(0, at)}@${value.slice(at + 1).toLowerCase()}`;
}

function emailProblem(spec, value) {
    if (/\s/.test(value)) return `${spec.label} cannot contain spaces.`;
    const parts = value.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return 'Enter an e-mail address like name@company.com.';
    if (parts[0].length > 64 || !EMAIL_LOCAL.test(parts[0])) return 'The part before @ is not valid.';
    if (!validHostname(parts[1].replace(/\.$/, ''))) return 'The part after @ must be a domain like company.com.';
    return '';
}

// ── Phone (international, E.164-ish; no country is assumed) ─────────
const PHONE_CHARS = /^[\d\s+().\-/]+$/;
const EXTENSION = /\s*(?:ext\.?|x|#)\s*(\d{1,6})$/i;

function splitPhone(value) {
    const m = value.match(EXTENSION);
    return m ? { main: value.slice(0, m.index).trim(), ext: m[1] } : { main: value.trim(), ext: '' };
}

function phoneProblem(spec, value) {
    const { main } = splitPhone(value);
    if (!PHONE_CHARS.test(main)) return `${spec.label} can use digits, spaces, + ( ) - . and an extension (ext 123) only.`;
    if (main.indexOf('+') > 0 || (main.match(/\+/g) || []).length > 1) return `${spec.label}: put + only at the start, before the country code.`;
    const digits = main.replace(/\D/g, '');
    const international = main.startsWith('+') || digits.startsWith('00');
    const significant = international && digits.startsWith('00') && !main.startsWith('+') ? digits.slice(2) : digits;
    if (international && significant.startsWith('0')) return `${spec.label}: the country code after + cannot start with 0.`;
    if (significant.length < 7) return `${spec.label} is too short. Include the area code, e.g. +44 20 7946 0958.`;
    if (significant.length > 15) return `${spec.label} has too many digits (15 at most, without the extension).`;
    return '';
}

/** '+1 (415) 555-0101 x12' -> '+14155550101 ext 12'; national numbers (no + / 00) keep their format. */
export function normalizePhone(raw) {
    const value = collapse(raw);
    if (!value) return '';
    const { main, ext } = splitPhone(value);
    const digits = main.replace(/\D/g, '');
    let out = main;
    if (main.startsWith('+')) out = `+${digits}`;
    else if (digits.startsWith('00') && /^\s*00/.test(main)) out = `+${digits.slice(2)}`;
    return ext ? `${out} ext ${ext}` : out;
}

// ── URLs ───────────────────────────────────────────────────────────
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

function parseUrl(value) {
    try { return new URL(value); } catch { return null; }
}

function urlProblem(spec, value, { httpsOnly, addScheme, hostCheck } = {}) {
    if (DANGEROUS_SCHEME.test(value)) return `${spec.label} must be a web link (https://…).`;
    if (/\s/.test(value)) return `${spec.label} cannot contain spaces.`;
    const candidate = HAS_SCHEME.test(value) || !addScheme ? value : `https://${value}`;
    if (!HAS_SCHEME.test(candidate)) return `${spec.label}: enter the full link, starting with https://`;
    const url = parseUrl(candidate);
    if (!url) return `${spec.label} is not a valid link.`;
    if (httpsOnly && url.protocol !== 'https:') return `${spec.label} must start with https://`;
    if (!httpsOnly && url.protocol !== 'https:' && url.protocol !== 'http:') return `${spec.label} must start with https:// or http://`;
    if (url.username || url.password) return `${spec.label} cannot contain a user name or password.`;
    if (!validHostname(url.hostname.replace(/\.$/, '')) && url.hostname !== 'localhost') return `${spec.label} needs a domain like example.com.`;
    if (hostCheck) return hostCheck(url);
    return '';
}

function normalizeUrl(value, addScheme) {
    const v = String(value ?? '').trim();
    if (!v) return '';
    return addScheme && !HAS_SCHEME.test(v) ? `https://${v}` : v;
}

const linkedinHost = (url) => {
    const host = url.hostname.toLowerCase();
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return 'Enter a linkedin.com link, e.g. https://www.linkedin.com/in/jane-smith';
    if (url.pathname.replace(/\/+$/, '') === '') return 'Enter the link to the profile or company page, not linkedin.com itself.';
    return '';
};

// ── Domain ─────────────────────────────────────────────────────────
/** 'https://www.Acme.com/about' -> 'acme.com' */
export function normalizeDomain(raw) {
    let v = String(raw ?? '').trim().toLowerCase();
    if (!v) return '';
    v = v.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
    return v.replace(/^www\./, '');
}

function domainProblem(spec, value) {
    if (DANGEROUS_SCHEME.test(value)) return `${spec.label} must be a domain like acme.com.`;
    return validHostname(normalizeDomain(value)) ? '' : `${spec.label} must be a domain like acme.com.`;
}

// ── Country / state / postal code ──────────────────────────────────
function countryOf(spec, form) {
    return spec.countryField ? countryCode(form?.[spec.countryField]) : null;
}

const POSTAL = {
    US: [/^\d{5}(-\d{4})?$/, '12345 or 12345-6789'],
    CA: [/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/, 'A1A 1A1'],
    GB: [/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/, 'SW1A 1AA'],
    IE: [/^[A-Z]\d[\dW] ?[A-Z\d]{4}$/, 'D02 X285'],
    NL: [/^\d{4} ?[A-Z]{2}$/, '1234 AB'],
    JP: [/^\d{3}-?\d{4}$/, '123-4567'],
    BR: [/^\d{5}-?\d{3}$/, '12345-678'],
    PL: [/^\d{2}-?\d{3}$/, '12-345'],
    SE: [/^\d{3} ?\d{2}$/, '123 45'],
    IN: [/^\d{3} ?\d{3}$/, '110001'],
    SG: [/^\d{6}$/, '123456'],
    ...Object.fromEntries(['DE', 'FR', 'ES', 'IT', 'MX', 'FI', 'MY', 'TR', 'UA'].map(c => [c, [/^\d{5}$/, '12345']])),
    ...Object.fromEntries(['AU', 'AT', 'BE', 'CH', 'DK', 'NO', 'NZ', 'ZA', 'PH', 'HU'].map(c => [c, [/^\d{4}$/, '1234']])),
};
const POSTAL_GENERIC = /^[A-Z0-9][A-Z0-9 -]{1,10}[A-Z0-9]$/;

function postalProblem(spec, value, form) {
    const upper = collapse(value).toUpperCase();
    const rule = POSTAL[countryOf(spec, form)];
    if (rule) return rule[0].test(upper) ? '' : `${spec.label} must look like ${rule[1]} for ${countryName(countryOf(spec, form))}.`;
    return POSTAL_GENERIC.test(upper) ? '' : `${spec.label} can use 3-12 letters, digits, spaces and hyphens.`;
}

export function normalizePostal(raw, iso) {
    let v = collapse(raw).toUpperCase();
    if (!v) return '';
    if (iso === 'CA' || iso === 'GB') v = v.replace(/\s/g, '').replace(/^(.+)(.{3})$/, '$1 $2');      // inward code last
    if (iso === 'IE') v = v.replace(/\s/g, '').replace(/^(.{3})(.{4})$/, '$1 $2');
    if (iso === 'NL') v = v.replace(/^(\d{4}) ?([A-Z]{2})$/, '$1 $2');
    if (iso === 'JP') v = v.replace(/^(\d{3})-?(\d{4})$/, '$1-$2');
    if (iso === 'BR') v = v.replace(/^(\d{5})-?(\d{3})$/, '$1-$2');
    if (iso === 'PL') v = v.replace(/^(\d{2})-?(\d{3})$/, '$1-$2');
    if (iso === 'IN') v = v.replace(/\s/g, '');
    return v;
}

function stateProblem(spec, value, form) {
    const iso = countryOf(spec, form);
    if (!SUBDIVISIONS[iso]) return '';
    return subdivisionCode(iso, value) ? '' : `${spec.label} is not a ${iso === 'CA' ? 'province' : 'state'} of ${countryName(iso)}.`;
}

// ── Numbers ────────────────────────────────────────────────────────
const cleanNumber = v => String(v ?? '').trim().replace(/[\s,_]/g, '').replace(/^\$/, '');

function numberProblem(spec, value) {
    const v = cleanNumber(value);
    if (!/^-?\d+(\.\d+)?$/.test(v)) return `${spec.label} must be a number, e.g. 2500000.`;
    const n = Number(v);
    if (!Number.isFinite(n)) return `${spec.label} must be a number.`;
    if (spec.integer && !Number.isInteger(n)) return `${spec.label} must be a whole number.`;
    const decimals = (v.split('.')[1] || '').length;
    if (spec.decimals != null && decimals > spec.decimals) return `${spec.label} can have at most ${spec.decimals} decimals.`;
    if (spec.min != null && n < spec.min) return `${spec.label} must be ${spec.min} or more.`;
    if (spec.max != null && n > spec.max) return `${spec.label} is too large.`;
    if (spec.integerDigits != null && v.replace(/^-/, '').split('.')[0].replace(/^0+(?=\d)/, '').length > spec.integerDigits) return `${spec.label} is too large.`;
    return '';
}

// ── Public API ─────────────────────────────────────────────────────
const KIND_RULES = {
    name: nameProblem,
    personName: personNameProblem,
    email: emailProblem,
    phone: phoneProblem,
    linkedin: (spec, v) => urlProblem(spec, v, { httpsOnly: true, addScheme: true, hostCheck: linkedinHost }),
    url: (spec, v) => urlProblem(spec, v, { addScheme: true }),
    httpsUrl: (spec, v) => urlProblem(spec, v, { httpsOnly: true }),
    domain: domainProblem,
    country: (spec, v) => (countryCode(v) ? '' : `${spec.label}: choose a country from the list (e.g. Germany or DE).`),
    state: stateProblem,
    postal: postalProblem,
    number: numberProblem,
    text: () => '',
    multiline: () => '',
};

/** '' when value is fine for spec, else the message to show next to the field. */
export function validateField(spec, value, form = {}) {
    if (!spec) return '';
    if (isBlank(value)) return spec.required ? `${spec.label} is required.` : '';
    if (spec.kind === 'number') return numberProblem(spec, value);
    const raw = String(value);
    const text = spec.kind === 'multiline' ? raw.trim() : collapse(raw);
    return textProblem(spec, text, { multiline: spec.kind === 'multiline' })
        || (KIND_RULES[spec.kind] || KIND_RULES.text)(spec, text, form);
}

/** The value to send for a valid field (blank strings stay '' so the caller decides whether to send them). */
export function normalizeField(spec, value, form = {}) {
    if (!spec || value == null) return value;
    if (spec.kind === 'number') return isBlank(value) ? '' : cleanNumber(value);
    if (typeof value !== 'string') return value;
    if (spec.kind === 'multiline') return value.trim();
    const v = collapse(value);
    if (!v) return '';
    switch (spec.kind) {
        case 'email': return normalizeEmail(v);
        case 'phone': return normalizePhone(v);
        case 'linkedin': case 'url': return normalizeUrl(v, true);
        case 'domain': return normalizeDomain(v);
        case 'country': { const iso = countryCode(v); return iso ? countryName(iso) : v; }
        case 'state': { const iso = countryOf(spec, form); return (SUBDIVISIONS[iso] && subdivisionCode(iso, v)) || v; }
        case 'postal': return normalizePostal(v, countryOf(spec, form));
        default: return v;
    }
}

export function validateForm(specs, form) {
    const errors = {};
    for (const [key, spec] of Object.entries(specs)) {
        if (!(key in form) && !spec.required) continue;
        const message = validateField(spec, form[key], form);
        if (message) errors[key] = message;
    }
    return errors;
}

export function normalizeForm(specs, form) {
    const out = { ...form };
    for (const [key, spec] of Object.entries(specs)) {
        if (key in out) out[key] = normalizeField(spec, out[key], form);
    }
    return out;
}

// ── Keystroke / paste filters ──────────────────────────────────────
const stripControls = v => replaceControls(v);

/** A function (raw input value) -> filtered value for onChange, by kind; pasted line breaks become spaces. */
export function inputFilter(spec) {
    if (!spec || spec.kind === 'multiline' || spec.kind === 'number') {
        return spec?.kind === 'number' ? v => v.replace(/[^\d.,\s$-]/g, '') : null;
    }
    if (spec.kind === 'phone') return v => stripControls(v).replace(/[^\d\s+().\-/#extEXT]/g, '');
    if (spec.kind === 'email' || spec.kind === 'linkedin' || spec.kind === 'url' || spec.kind === 'httpsUrl' || spec.kind === 'domain') {
        return v => replaceControls(v, true).replace(/\s+/g, '');
    }
    return stripControls;
}

// ── Server errors ──────────────────────────────────────────────────
/**
 * The field errors of a failed request -> { email: 'value is not a valid email address' }, {} when there are none.
 * Reads FastAPI's 422 list ({ detail: [{ loc: ['body', 'email'], msg }] }), the same list as api/http.js
 * normalizeError flattens it ('email: msg; phone: msg' on a 422), and { detail: { field, message } } (kept by
 * normalizeError as detail_data).
 */
export function serverFieldErrors(error) {
    const response = error?.response;
    const data = response?.data;
    const detail = Array.isArray(data?.detail_list) ? data.detail_list : data?.detail;
    const out = {};
    const clean = msg => String(msg || '').replace(/^Value error,\s*/i, '').trim();
    const add = (path, msg) => {
        const field = String(path).split('.').filter(p => p && p !== 'body' && p !== 'query' && !/^\d+$/.test(p)).pop();
        if (field && !out[field] && msg) out[field] = clean(msg);
    };
    if (Array.isArray(detail)) {
        for (const item of detail) {
            if (Array.isArray(item?.loc)) add(item.loc.filter(p => typeof p === 'string').join('.'), item.msg);
        }
    } else if (typeof detail === 'string' && response?.status === 422) {
        const parts = detail.split('; ').map(part => /^([A-Za-z_][\w.]*): (.+)$/s.exec(part));
        if (parts.every(Boolean)) parts.forEach(m => add(m[1], m[2]));
    }
    const structured = detail && typeof detail === 'object' && !Array.isArray(detail) ? detail : data?.detail_data;
    if (structured && typeof structured.field === 'string') add(structured.field, structured.message || structured.msg || 'This value is not valid.');
    return out;
}
