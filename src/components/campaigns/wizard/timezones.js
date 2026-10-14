// Campaign timezone options for the create-campaign wizard: every IANA zone (minus obscure sub-zones)
// with a GMT offset label, Outlook-style friendly names and search aliases.

// Country / abbreviation aliases so users can type "india", "uk", "est" etc.
const TZ_ALIASES = {
    'Asia/Kolkata':          ['india', 'ist', 'indian standard time', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'pune'],
    'Asia/Calcutta':         ['india', 'kolkata', 'ist'],
    'Europe/London':         ['uk', 'england', 'britain', 'gmt', 'bst', 'london'],
    'Europe/Dublin':         ['ireland', 'dublin'],
    'Asia/Dubai':            ['uae', 'emirates', 'gulf', 'gst'],
    'Asia/Riyadh':           ['saudi', 'ksa', 'riyadh'],
    'Asia/Singapore':        ['singapore', 'sgt'],
    'Asia/Tokyo':            ['japan', 'jst', 'tokyo'],
    'Asia/Shanghai':         ['china', 'cst', 'beijing', 'shanghai'],
    'Asia/Hong_Kong':        ['hong kong', 'hkt'],
    'Asia/Seoul':            ['korea', 'kst', 'seoul'],
    'Asia/Karachi':          ['pakistan', 'pst', 'karachi'],
    'Asia/Dhaka':            ['bangladesh', 'bst', 'dhaka'],
    'Asia/Colombo':          ['sri lanka', 'colombo'],
    'Asia/Kathmandu':        ['nepal', 'npt', 'kathmandu'],
    'Asia/Kabul':            ['afghanistan', 'aft', 'kabul'],
    'Asia/Tehran':           ['iran', 'irst', 'tehran'],
    'Asia/Bangkok':          ['thailand', 'ict', 'bangkok'],
    'Asia/Jakarta':          ['indonesia', 'wib', 'jakarta'],
    'Asia/Manila':           ['philippines', 'pht', 'manila'],
    'Asia/Kuala_Lumpur':     ['malaysia', 'myt', 'kuala lumpur'],
    'Asia/Taipei':           ['taiwan', 'cst', 'taipei'],
    'Asia/Yangon':           ['myanmar', 'mmt', 'yangon', 'rangoon'],
    'Asia/Ho_Chi_Minh':      ['vietnam', 'ict', 'ho chi minh', 'saigon'],
    'Asia/Almaty':           ['kazakhstan', 'almt', 'almaty'],
    'Asia/Tashkent':         ['uzbekistan', 'uzt', 'tashkent'],
    'Asia/Yerevan':          ['armenia', 'amt', 'yerevan'],
    'Asia/Tbilisi':          ['georgia', 'get', 'tbilisi'],
    'Asia/Baku':             ['azerbaijan', 'azt', 'baku'],
    'Europe/Paris':          ['france', 'cet', 'paris'],
    'Europe/Berlin':         ['germany', 'cet', 'berlin'],
    'Europe/Madrid':         ['spain', 'cet', 'madrid'],
    'Europe/Rome':           ['italy', 'cet', 'rome'],
    'Europe/Amsterdam':      ['netherlands', 'cet', 'amsterdam'],
    'Europe/Brussels':       ['belgium', 'cet', 'brussels'],
    'Europe/Vienna':         ['austria', 'cet', 'vienna'],
    'Europe/Zurich':         ['switzerland', 'cet', 'zurich'],
    'Europe/Stockholm':      ['sweden', 'cet', 'stockholm'],
    'Europe/Oslo':           ['norway', 'cet', 'oslo'],
    'Europe/Copenhagen':     ['denmark', 'cet', 'copenhagen'],
    'Europe/Helsinki':       ['finland', 'eet', 'helsinki'],
    'Europe/Warsaw':         ['poland', 'cet', 'warsaw'],
    'Europe/Prague':         ['czech', 'cet', 'prague'],
    'Europe/Budapest':       ['hungary', 'cet', 'budapest'],
    'Europe/Bucharest':      ['romania', 'eet', 'bucharest'],
    'Europe/Athens':         ['greece', 'eet', 'athens'],
    'Europe/Istanbul':       ['turkey', 'try', 'istanbul'],
    'Europe/Moscow':         ['russia', 'msk', 'moscow'],
    'Europe/Kiev':           ['ukraine', 'eet', 'kiev', 'kyiv'],
    'Africa/Cairo':          ['egypt', 'eet', 'cairo'],
    'Africa/Lagos':          ['nigeria', 'wat', 'lagos'],
    'Africa/Nairobi':        ['kenya', 'eat', 'nairobi'],
    'Africa/Johannesburg':   ['south africa', 'sast', 'johannesburg'],
    'Africa/Accra':          ['ghana', 'gmt', 'accra'],
    'America/New_York':      ['usa', 'us', 'eastern', 'est', 'edt', 'new york', 'et'],
    'America/Chicago':       ['usa', 'us', 'central', 'cst', 'cdt', 'chicago', 'ct'],
    'America/Denver':        ['usa', 'us', 'mountain', 'mst', 'mdt', 'denver', 'mt'],
    'America/Los_Angeles':   ['usa', 'us', 'pacific', 'pst', 'pdt', 'los angeles', 'pt', 'california'],
    'America/Anchorage':     ['alaska', 'akst', 'akdt', 'anchorage'],
    'Pacific/Honolulu':      ['hawaii', 'hst', 'honolulu'],
    'America/Toronto':       ['canada', 'toronto', 'est'],
    'America/Vancouver':     ['canada', 'vancouver', 'pst'],
    'America/Sao_Paulo':     ['brazil', 'brt', 'sao paulo'],
    'America/Mexico_City':   ['mexico', 'cst', 'mexico city'],
    'America/Buenos_Aires':  ['argentina', 'art', 'buenos aires'],
    'America/Bogota':        ['colombia', 'cot', 'bogota'],
    'America/Lima':          ['peru', 'pet', 'lima'],
    'America/Santiago':      ['chile', 'clt', 'santiago'],
    'Australia/Sydney':      ['australia', 'aedt', 'aest', 'sydney'],
    'Australia/Melbourne':   ['australia', 'aedt', 'aest', 'melbourne'],
    'Australia/Brisbane':    ['australia', 'aest', 'brisbane'],
    'Australia/Perth':       ['australia', 'awst', 'perth'],
    'Pacific/Auckland':      ['new zealand', 'nzst', 'nzdt', 'auckland'],
    'UTC':                   ['utc', 'universal', 'gmt', 'coordinated'],
};

// Friendly names matching Outlook/Windows timezone picker conventions,
// so US zones read as "Eastern Time (US & Canada)" instead of a bare IANA city.
const OUTLOOK_TZ_LABELS = {
    'Pacific/Honolulu':      'Hawaii',
    'America/Anchorage':     'Alaska',
    'America/Los_Angeles':   'Pacific Time (US & Canada)',
    'America/Phoenix':       'Arizona',
    'America/Denver':        'Mountain Time (US & Canada)',
    'America/Chicago':       'Central Time (US & Canada)',
    'America/Mexico_City':   'Mexico City',
    'America/New_York':      'Eastern Time (US & Canada)',
    'America/Indiana/Indianapolis': 'Indiana (East)',
    'America/Detroit':       'Eastern Time (US & Canada)',
    'America/Halifax':       'Atlantic Time (Canada)',
    'America/St_Johns':      'Newfoundland',
    'America/Toronto':       'Eastern Time (US & Canada)',
    'America/Vancouver':     'Pacific Time (US & Canada)',
    'America/Winnipeg':      'Central Time (US & Canada)',
    'America/Sao_Paulo':     'Brasilia',
    'America/Buenos_Aires':  'Buenos Aires',
    'America/Bogota':        'Bogota, Lima, Quito',
    'America/Lima':          'Bogota, Lima, Quito',
    'America/Santiago':      'Santiago',
    'UTC':                   'Coordinated Universal Time',
    'Europe/London':         'London',
    'Europe/Dublin':         'Dublin, Edinburgh, Lisbon',
    'Europe/Paris':          'Paris, Brussels, Copenhagen, Madrid',
    'Europe/Berlin':         'Amsterdam, Berlin, Rome, Vienna',
    'Europe/Athens':         'Athens, Bucharest',
    'Europe/Helsinki':       'Helsinki, Kyiv, Riga, Sofia',
    'Europe/Moscow':         'Moscow, St. Petersburg',
    'Europe/Istanbul':       'Istanbul',
    'Africa/Cairo':          'Cairo',
    'Africa/Johannesburg':   'Harare, Pretoria',
    'Africa/Lagos':          'West Central Africa',
    'Africa/Nairobi':        'Nairobi',
    'Asia/Dubai':            'Abu Dhabi, Muscat',
    'Asia/Riyadh':           'Kuwait, Riyadh',
    'Asia/Tehran':           'Tehran',
    'Asia/Kabul':            'Kabul',
    'Asia/Karachi':          'Islamabad, Karachi',
    'Asia/Kolkata':          'Chennai, Kolkata, Mumbai, New Delhi',
    'Asia/Kathmandu':        'Kathmandu',
    'Asia/Dhaka':            'Dhaka',
    'Asia/Yangon':           'Yangon (Rangoon)',
    'Asia/Bangkok':          'Bangkok, Hanoi, Jakarta',
    'Asia/Shanghai':         'Beijing, Chongqing, Hong Kong, Urumqi',
    'Asia/Singapore':        'Kuala Lumpur, Singapore',
    'Asia/Taipei':           'Taipei',
    'Asia/Tokyo':            'Osaka, Sapporo, Tokyo',
    'Asia/Seoul':            'Seoul',
    'Australia/Perth':       'Perth',
    'Australia/Brisbane':    'Brisbane',
    'Australia/Sydney':      'Canberra, Melbourne, Sydney',
    'Pacific/Auckland':      'Auckland, Wellington',
};

// Obscure IANA sub-zones (historical county/state-level DST quirks) that clutter the
// list without adding scheduling value — Windows/Outlook collapse these into their
// parent zone (e.g. Eastern/Central/Mountain Time) rather than listing them separately.
const EXCLUDED_TZS = new Set([
    'America/Indiana/Knox', 'America/Indiana/Marengo', 'America/Indiana/Petersburg',
    'America/Indiana/Tell_City', 'America/Indiana/Vevay', 'America/Indiana/Vincennes',
    'America/Indiana/Winamac',
    'America/Kentucky/Louisville', 'America/Kentucky/Monticello',
    'America/North_Dakota/Beulah', 'America/North_Dakota/Center', 'America/North_Dakota/New_Salem',
    'America/Menominee',
    'America/Juneau', 'America/Sitka', 'America/Metlakatla', 'America/Yakutat', 'America/Nome', 'America/Adak',
]);

// Build all IANA timezone options with reliable UTC offset labels
function buildTimezoneOptions() {
    const now = new Date();
    let zones;
    try {
        zones = Intl.supportedValuesOf('timeZone');
    } catch {
        zones = [
            'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
            'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
            'Europe/London', 'Europe/Berlin', 'Europe/Helsinki', 'Europe/Moscow',
            'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo',
            'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland',
        ];
    }

    return zones
        .filter((tz) => !EXCLUDED_TZS.has(tz))
        .map((tz) => {
            try {
                // Reliable cross-browser offset via locale string comparison
                const utcStr = now.toLocaleString('en-US', {
                    timeZone: 'UTC', hour12: false,
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                });
                const tzStr = now.toLocaleString('en-US', {
                    timeZone: tz, hour12: false,
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                });
                const offsetMinutes = Math.round(
                    (new Date(tzStr) - new Date(utcStr)) / 60000
                );
                const sign = offsetMinutes >= 0 ? '+' : '-';
                const abs = Math.abs(offsetMinutes);
                const hh = String(Math.floor(abs / 60)).padStart(2, '0');
                const mm = String(abs % 60).padStart(2, '0');
                const offsetStr = `GMT${sign}${hh}:${mm}`;
                const friendlyName = OUTLOOK_TZ_LABELS[tz];
                const city = friendlyName || tz.split('/').pop().replace(/_/g, ' ');
                const aliases = TZ_ALIASES[tz] || [];
                return {
                    value: tz,
                    label: friendlyName
                        ? `(${offsetStr}) ${friendlyName} — ${tz.replace(/_/g, ' ')}`
                        : `(${offsetStr}) ${tz.replace(/_/g, ' ')}`,
                    shortLabel: `(${offsetStr}) ${city}`,
                    city,
                    aliases,
                    offset: offsetMinutes,
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.offset - b.offset || a.value.localeCompare(b.value));
}

export const TIMEZONE_OPTIONS = buildTimezoneOptions();

/** True when timezone option `tz` matches the search text `q` (label, IANA id, city or alias). */
export function tzMatches(tz, q) {
    const lower = q.toLowerCase().trim();
    if (!lower) return true;
    return (
        tz.label.toLowerCase().includes(lower) ||
        tz.value.toLowerCase().replace(/_/g, ' ').includes(lower) ||
        tz.city.toLowerCase().includes(lower) ||
        tz.aliases.some(a => a.includes(lower))
    );
}

/** Short label for a timezone id (falls back to the id with underscores as spaces). */
export function timezoneShortLabel(value) {
    return TIMEZONE_OPTIONS.find(tz => tz.value === value)?.shortLabel || value.replace(/_/g, ' ');
}
