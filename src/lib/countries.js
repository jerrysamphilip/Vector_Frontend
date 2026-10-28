// ISO 3166-1 countries (alpha-2 codes; English names from Intl.DisplayNames, so no long name table ships here),
// plus the states / provinces of the countries whose forms validate them (US, CA, AU).

const CODES = (
    'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ '
    + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO '
    + 'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE '
    + 'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO '
    + 'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW '
    + 'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM '
    + 'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'
).split(' ');

let displayNames = null;
try {
    displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
} catch {
    displayNames = null;
}

/** [{ code: 'US', name: 'United States' }, ...] sorted by name. */
export const COUNTRIES = CODES
    .map(code => ({ code, name: (displayNames && displayNames.of(code)) || code }))
    .sort((a, b) => a.name.localeCompare(b.name));

const fold = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').replace(/[’']/g, "'")
    .replace(/[.]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

// Common spellings that are not the ISO short name
const ALIASES = {
    usa: 'US', 'united states of america': 'US', america: 'US', uk: 'GB', 'great britain': 'GB', britain: 'GB',
    england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB', uae: 'AE', holland: 'NL',
    'the netherlands': 'NL', 'south korea': 'KR', 'republic of korea': 'KR', korea: 'KR', 'north korea': 'KP',
    russia: 'RU', 'russian federation': 'RU', turkey: 'TR', 'czech republic': 'CZ', 'ivory coast': 'CI',
    "cote d'ivoire": 'CI', vietnam: 'VN', 'viet nam': 'VN', 'hong kong sar': 'HK', macau: 'MO', burma: 'MM',
    'east timor': 'TL', swaziland: 'SZ', 'cape verde': 'CV', 'vatican city': 'VA', 'dr congo': 'CD',
    'democratic republic of the congo': 'CD', 'republic of the congo': 'CG', 'north macedonia': 'MK', macedonia: 'MK',
    'south africa': 'ZA', 'new zealand': 'NZ', 'saudi arabia': 'SA',
};

const BY_KEY = new Map();
for (const c of COUNTRIES) {
    BY_KEY.set(fold(c.code), c.code);
    BY_KEY.set(fold(c.name), c.code);
}
for (const [alias, code] of Object.entries(ALIASES)) BY_KEY.set(fold(alias), code);

/** The ISO alpha-2 code for a country name, code or common alias ('usa' -> 'US'); null when unknown. */
export function countryCode(value) {
    const key = fold(value);
    if (!key) return null;
    return BY_KEY.get(key) || null;
}

/** The English name for an ISO alpha-2 code ('DE' -> 'Germany'). */
export function countryName(code) {
    const found = COUNTRIES.find(c => c.code === String(code || '').toUpperCase());
    return found ? found.name : null;
}

export const US_STATES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
    DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
    IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
    MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
    NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
    PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
    UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands', PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
    AA: 'Armed Forces Americas', AE: 'Armed Forces Europe', AP: 'Armed Forces Pacific',
};

export const CA_PROVINCES = {
    AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador',
    NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island',
    QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
};

export const AU_STATES = {
    ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory', QLD: 'Queensland',
    SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia',
};

/** The subdivisions a form checks the state against, by country code. */
export const SUBDIVISIONS = { US: US_STATES, CA: CA_PROVINCES, AU: AU_STATES };

/** The subdivision code for a name or code in that country ('california' -> 'CA'); null when unknown. */
export function subdivisionCode(countryIso, value) {
    const table = SUBDIVISIONS[countryIso];
    const key = fold(value);
    if (!table || !key) return null;
    for (const [code, name] of Object.entries(table)) {
        if (fold(code) === key || fold(name) === key) return code;
    }
    return null;
}
