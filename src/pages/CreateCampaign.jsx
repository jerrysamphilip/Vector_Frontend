import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    Globe,
    Mail,
    Users,
    CheckCircle,
    Rocket,
    Plus,
    Trash2,
    Eye,
    Sparkles,
    User,
    Database,
    RefreshCw,
    Edit2,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    Loader2,
    Search,
    ChevronDown,
    Save,
    Check,
    X as XIcon,
    AlertTriangle,
    ShieldCheck,
    Building2,
    MapPin,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from 'lucide-react';
import { campaignApi, sequenceApi } from '../api/campaigns';
import RichTextEditor from '../components/common/RichTextEditor';
import AttachmentManager from '../components/common/AttachmentManager';
import { campaignWizardApi } from '../api/campaignWizard';
import { prospectsApi } from '../api/prospects';
import { campaignDraftsApi } from '../api/campaignDrafts';
import { apiClient as api } from '../api/http';
import { getCompanyProfiles } from '../api/companyProfiles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, FormGroup, Label } from '../components/ui/Input';
import PageTransition from '../components/layout/PageTransition';
import ProspectTable from '../components/prospects/ProspectTable';
import Loading from '../components/common/Loading';
import ErrorBoundary from '../components/common/ErrorBoundary';
import EnrollmentResultModal from '../components/campaigns/EnrollmentResultModal';

const INITIAL_FORM_DATA = {
    campaign_name: '',
    campaign_description: '',
    inbox_ids: [],
    sender_name: '',
    sender_title: '',
    cta_link: '',
    send_window_start: '09:00',
    send_window_end: '17:00',
    respect_timezone: true,
    campaign_timezone: 'Asia/Kolkata',
    include_first_name_in_subject: false,
    unsubscribe_mode: 'plain',
    sending_mode: 'spread',
    min_gap_minutes: 2,
    batch_size: 10,
    batch_gap_minutes: 30,
    daily_batch_size: null,
};

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

const TIMEZONE_OPTIONS = buildTimezoneOptions();

function tzMatches(tz, q) {
    const lower = q.toLowerCase().trim();
    if (!lower) return true;
    return (
        tz.label.toLowerCase().includes(lower) ||
        tz.value.toLowerCase().replace(/_/g, ' ').includes(lower) ||
        tz.city.toLowerCase().includes(lower) ||
        tz.aliases.some(a => a.includes(lower))
    );
}

// Searchable timezone picker component
function TimezonePicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const searchRef = useRef(null);

    const filtered = query.trim()
        ? TIMEZONE_OPTIONS.filter(tz => tzMatches(tz, query))
        : TIMEZONE_OPTIONS;

    const selected = TIMEZONE_OPTIONS.find(tz => tz.value === value);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Focus search on open
    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 50);
    }, [open]);

    const handleSelect = (tz) => {
        onChange(tz.value);
        setOpen(false);
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full h-10 px-3 flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 focus:outline-none focus:border-blue-400 transition-all"
            >
                <span className="truncate text-left">{selected?.shortLabel || selected?.label || value}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    style={{ maxHeight: '280px' }}>
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50/80">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder='Search by city, country or offset (e.g. "India", "EST", "+05:30")'
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-700"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')}>
                                <XIcon className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                            </button>
                        )}
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                        {filtered.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-400 italic">No timezones match "{query}"</p>
                        ) : (
                            filtered.map(tz => (
                                <button
                                    key={tz.value}
                                    type="button"
                                    onClick={() => handleSelect(tz)}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2
                                        ${tz.value === value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate font-medium">{tz.city}</span>
                                        <span className="text-[11px] text-gray-400 truncate">{tz.label}</span>
                                    </div>
                                    {tz.value === value && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>

                    {/* Result count hint */}
                    {query.trim() && filtered.length > 0 && (
                        <div className="px-4 py-1.5 border-t border-gray-100 bg-gray-50/60">
                            <span className="text-[10px] text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CreateCampaign() {
    return (
        <ErrorBoundary>
            <CreateCampaignContent />
        </ErrorBoundary>
    );
}

function CreateCampaignContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isFreshStart = searchParams.get('fresh') === 'true';
    const editCampaignId = searchParams.get('edit');
    const queryClient = useQueryClient();

    const [currentStep, setCurrentStep] = useState(1);
    const [campaignId, setCampaignId] = useState(null);
    const [selectedLists, setSelectedLists] = useState([]);
    const [enrollReport, setEnrollReport] = useState(null); // {enrolled, rejected, launched}
    // Contacts deselected from the currently-selected existing list (exclusion set —
    // empty means "use the whole list", matching prior behavior).
    const [excludedProspectIds, setExcludedProspectIds] = useState([]);
    // Inline editing state for upload table (matching ProspectValidate style)
    const [uploadEditingIndex, setUploadEditingIndex] = useState(null);
    const [uploadEditValues, setUploadEditValues] = useState({});

    // Searchable List Selector State
    const [listSearchQuery, setListSearchQuery] = useState('');
    const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);

    // Template/Processing State
    const [processingResult, setProcessingResult] = useState(null);
    const [selectedPersona, setSelectedPersona] = useState(null);
    const [previewProspect, setPreviewProspect] = useState(null);
    const [customInstruction, setCustomInstruction] = useState(''); // User prompt feedback
    const [creativeEmail, setCreativeEmail] = useState(false); // Optional creative mode toggle
    const [showPreview, setShowPreview] = useState(false);
    const [selectedEmailStep, setSelectedEmailStep] = useState(1); // 1, 2, 3, or 4

    // Simple loading state for AI generation
    const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false);
    const [generationStatus, setGenerationStatus] = useState('');
    const [regenerating, setRegenerating] = useState(null); // 'subject' or 'body' or null
    const [editing, setEditing] = useState(null); // 'subject' or 'body' or null
    const [editValue, setEditValue] = useState('');

    // Sequence State
    const [sequenceSteps, setSequenceSteps] = useState([
        { step_number: 1, wait_days: 0, type: 'Initial Email' }
    ]);

    // Schedule Preview from Backend (timezone-aware)
    const [schedulePreview, setSchedulePreview] = useState([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // Fetch schedule preview from backend when sequence steps change
    useEffect(() => {
        const fetchSchedulePreview = async () => {
            if (sequenceSteps.length === 0) return;

            setScheduleLoading(true);
            try {
                const result = await campaignWizardApi.schedulePreview(sequenceSteps);
                setSchedulePreview(result.schedule || []);
            } catch (error) {
                console.error('Failed to fetch schedule preview:', error);
                // Fallback: keep existing preview or set empty
            } finally {
                setScheduleLoading(false);
            }
        };

        fetchSchedulePreview();
    }, [sequenceSteps]);


    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    const dateInputRef = useRef(null);
    const today = new Date().toISOString().split("T")[0];

    const isInvalidDate =
        formData.start_date && formData.start_date < today;

    const [errors, setErrors] = useState({});
    const [selectedProfileId, setSelectedProfileId] = useState('');

    // Upload State (Step 3 - inline upload)
    const [uploadMode, setUploadMode] = useState('select'); // 'select' or 'upload'
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadResult, setUploadResult] = useState(null);
    const [editableUploadRecords, setEditableUploadRecords] = useState([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadConfirmed, setUploadConfirmed] = useState(false);

    // Embedded Prospect Management State (for Step 3 - Select Existing List)
    const [prospectPage, setProspectPage] = useState(1);
    const [prospectSearch, setProspectSearch] = useState('');
    const [editingProspectId, setEditingProspectId] = useState(null);
    const [editProspectValues, setEditProspectValues] = useState({});
    const [deleteConfirmProspectId, setDeleteConfirmProspectId] = useState(null);
    const [validationMap, setValidationMap] = useState({});
    const [revalidationResult, setRevalidationResult] = useState(null);

    // ============================================================
    // DRAFT AUTO-SAVE + PER-CAMPAIGN LOCAL CACHE
    // ============================================================
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const initialLoadRef = useRef(true);

    // --- Per-campaign localStorage cache (instant, per-campaign) ---
    const DRAFT_CACHE_KEY = 'campaign_draft_cache';

    const getCachedDraft = (cId) => {
        try {
            const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}');
            return cache[cId] || null;
        } catch { return null; }
    };

    const setCachedDraft = (cId, step, state) => {
        try {
            const cache = JSON.parse(localStorage.getItem(DRAFT_CACHE_KEY) || '{}');
            cache[cId] = {
                step,
                selectedLists: state?.selectedLists,
                sequenceSteps: state?.sequenceSteps,
                selectedProfileId: state?.selectedProfileId,
                uploadMode: state?.uploadMode,
                selectedPersona: state?.selectedPersona,
                customInstruction: state?.customInstruction,
                creativeEmail: state?.creativeEmail,
                processingResult: state?.processingResult || null,
                ts: Date.now()
            };
            localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.warn('[DRAFT] localStorage cache write failed:', e);
        }
    };

    // Collect all wizard state into a single object for saving
    const getDraftState = () => ({
        campaignId,
        formData,
        selectedLists,
        sequenceSteps,
        selectedProfileId,
        uploadMode,
        processingResult,
        selectedPersona,
        customInstruction,
        creativeEmail,
    });

    const [isContextOpen, setIsContextOpen] = useState(false);
    const [tempContext, setTempContext] = useState("");
    const contextRef = useRef(null);
    useEffect(() => {
        if (isContextOpen) {
            setTimeout(() => {
                contextRef.current?.focus();
            }, 50);
        }
    }, [isContextOpen]);

    // Load existing draft on mount (skip if fresh start)
    useEffect(() => {
        const loadDraft = async () => {
            try {
                // ── EDIT MODE: Load existing campaign by ID ──
                if (editCampaignId) {
                    console.log('[DRAFT] Edit mode — loading campaign', editCampaignId);

                    // 1. Instantly check localStorage for cached step (no network wait)
                    const cached = getCachedDraft(editCampaignId);
                    let detectedStep = cached?.step || 1;

                    // Validate cached processingResult before using it
                    const hasValidTemplates = cached?.processingResult?.templates_generated?.length > 0;

                    // If step >= 4 but no valid processingResult, fall back to step 3
                    if (detectedStep >= 4 && !hasValidTemplates) {
                        detectedStep = 3;
                    }

                    // Restore cached state immediately (makes UI feel instant)
                    if (cached) {
                        if (cached.selectedLists) setSelectedLists(cached.selectedLists);
                        if (cached.selectedProfileId) setSelectedProfileId(cached.selectedProfileId);
                        if (cached.uploadMode) setUploadMode(cached.uploadMode);
                        if (cached.selectedPersona) setSelectedPersona(cached.selectedPersona);
                        if (cached.customInstruction) setCustomInstruction(cached.customInstruction);
                        if (typeof cached.creativeEmail === 'boolean') setCreativeEmail(cached.creativeEmail);
                        if (hasValidTemplates) setProcessingResult(cached.processingResult);
                        // Set step immediately so user doesn't see step 1 flash
                        setCurrentStep(detectedStep);
                        console.log('[DRAFT] Restored cached step', detectedStep, 'from localStorage');
                    }

                    try {
                        // 2. Fetch campaign data from API (for form fields)
                        const campaign = await campaignApi.get(editCampaignId);
                        setCampaignId(editCampaignId);
                        setFormData(prev => ({
                            ...prev,
                            campaign_name: campaign.campaign_name || '',
                            campaign_description: campaign.campaign_description || '',
                            sender_name: campaign.sender_name || '',
                            sender_title: campaign.sender_title || '',
                            cta_link: campaign.cta_link || '',
                            inbox_ids: campaign.inbox_ids || prev.inbox_ids,
                            send_window_start: campaign.send_window_start || prev.send_window_start,
                            send_window_end: campaign.send_window_end || prev.send_window_end,
                            campaign_timezone: campaign.campaign_timezone || prev.campaign_timezone,
                            sending_mode: campaign.sending_mode || prev.sending_mode,
                            min_gap_minutes: campaign.min_gap_minutes ?? prev.min_gap_minutes,
                            batch_size: campaign.batch_size ?? prev.batch_size,
                            batch_gap_minutes: campaign.batch_gap_minutes ?? prev.batch_gap_minutes,
                            unsubscribe_mode: campaign.unsubscribe_mode || prev.unsubscribe_mode,
                        }));

                        // 3. If campaign has sequences, fetch them (user was past step 2)
                        if (campaign.sequence_count > 0) {
                            try {
                                const sequences = await sequenceApi.list(editCampaignId);
                                if (sequences?.length > 0) {
                                    setSequenceSteps(sequences.map(s => ({
                                        step_number: s.step_number,
                                        wait_days: s.wait_days,
                                        type: s.step_number === 1 ? 'Initial Email' : `Follow-up ${s.step_number - 1}`
                                    })));
                                    detectedStep = Math.max(detectedStep, 2);
                                }
                            } catch (e) {
                                console.warn('[DRAFT] Could not fetch sequences:', e);
                            }
                        }

                        // Also restore cached sequenceSteps if no sequences from API
                        if (cached?.sequenceSteps && !(campaign.sequence_count > 0)) {
                            setSequenceSteps(cached.sequenceSteps);
                        }

                        setCurrentStep(detectedStep);
                        console.log('[DRAFT] Campaign loaded:', campaign.campaign_name, '→ step', detectedStep);
                    } catch (err) {
                        console.error('[DRAFT] Failed to load campaign for editing:', err);
                        // Still use cached step if API failed
                        setCurrentStep(detectedStep);
                    }
                    return;
                }

                // If fresh start, clear any existing drafts and start clean
                if (isFreshStart) {
                    console.log('[DRAFT] Fresh start requested — clearing old drafts');
                    try {
                        await campaignDraftsApi.clearAllDrafts();
                    } catch (e) {
                        console.warn('[DRAFT] Failed to clear old drafts:', e);
                    }
                    return; // Skip loading — use initial state
                }

                const draft = await campaignDraftsApi.getCurrentDraft();
                if (draft && draft.draft_data) {
                    const data = draft.draft_data;

                    // If the draft references a campaignId, verify the campaign still exists
                    if (data.campaignId) {
                        try {
                            await api.get(`/campaigns/${data.campaignId}`);
                            setCampaignId(data.campaignId);
                        } catch {
                            // Campaign was deleted — discard stale draft and start fresh
                            console.warn('[DRAFT] Campaign', data.campaignId, 'no longer exists — starting fresh');
                            try { await campaignDraftsApi.clearAllDrafts(); } catch (e) { /* ignore */ }
                            return;
                        }
                    }

                    // Restore wizard state
                    if (data.formData) setFormData({ ...INITIAL_FORM_DATA, ...data.formData });
                    if (data.selectedLists) setSelectedLists(data.selectedLists);
                    if (data.sequenceSteps) setSequenceSteps(data.sequenceSteps);
                    if (data.selectedProfileId) setSelectedProfileId(data.selectedProfileId);
                    if (data.uploadMode) setUploadMode(data.uploadMode);
                    if (data.processingResult) setProcessingResult(data.processingResult);
                    if (data.selectedPersona) setSelectedPersona(data.selectedPersona);
                    if (data.customInstruction) setCustomInstruction(data.customInstruction);
                    if (typeof data.creativeEmail === 'boolean') setCreativeEmail(data.creativeEmail);
                    setCurrentStep(draft.current_step);
                    console.log('[DRAFT] Restored draft from', draft.updated_at);
                }
            } catch (error) {
                console.error('[DRAFT] Failed to load draft:', error);
            } finally {
                setDraftLoaded(true);
                setTimeout(() => { initialLoadRef.current = false; }, 1500);
            }
        };
        loadDraft();
    }, []);

    // Debounced auto-save effect (2 seconds after last change)
    useEffect(() => {
        if (!draftLoaded) return;
        if (initialLoadRef.current) return;

        const timeoutId = setTimeout(async () => {
            try {
                setIsSavingDraft(true);
                const draftName = formData.campaign_name || 'Untitled Campaign';
                const state = getDraftState();

                // Save to localStorage per-campaign (instant, per-campaign)
                if (campaignId) {
                    setCachedDraft(campaignId, currentStep, state);
                }

                // Also save to backend (single-draft, for new campaign recovery)
                await campaignDraftsApi.saveDraft(draftName, currentStep, state);
                setLastSaved(new Date());
                console.log('[DRAFT] Auto-saved at', new Date().toLocaleTimeString());
            } catch (error) {
                console.error('[DRAFT] Auto-save failed:', error);
            } finally {
                setIsSavingDraft(false);
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [formData, selectedLists, sequenceSteps, currentStep, selectedProfileId, uploadMode, processingResult, selectedPersona, customInstruction, creativeEmail, draftLoaded]);

    // Fetch company profiles

    const { data: companyProfiles } = useQuery({
        queryKey: ['company-profiles'],
        queryFn: () => getCompanyProfiles(),
    });

    // All canonical personas (not just ones detected in the uploaded list) —
    // lets the wizard always show every persona as choosable.
    const { data: allPersonas } = useQuery({
        queryKey: ['personas'],
        queryFn: () => campaignWizardApi.getPersonas(),
        staleTime: Infinity,
    });

    // Fetch prospect lists
    const { data: prospectLists, isLoading: listsLoading } = useQuery({
        queryKey: ['prospect-lists'],
        queryFn: () => campaignApi.getProspectLists(),
    });

    // Fetch inboxes
    const { data: inboxes, isLoading: inboxesLoading } = useQuery({
        queryKey: ['inboxes'],
        queryFn: () => campaignApi.getInboxes(),
    });

    // Fetch prospects for selected list (Step 3 - Select Existing List)
    const selectedListId = selectedLists[0];
    const { data: listProspectsData, isLoading: prospectsLoading, refetch: refetchProspects } = useQuery({
        queryKey: ['list-prospects', selectedListId, prospectPage, prospectSearch],
        queryFn: () => prospectsApi.getListProspects(selectedListId, {
            page: prospectPage,
            pageSize: 10,
            search: prospectSearch
        }),
        enabled: !!selectedListId && uploadMode === 'select' && currentStep === 3,
    });

    // Mutations for prospect management
    const updateProspectMutation = useMutation({
        mutationFn: ({ prospectId, updates }) => prospectsApi.updateProspect(prospectId, updates),
        onSuccess: () => {
            refetchProspects();
            setEditingProspectId(null);
            setEditProspectValues({});
        },
    });

    const deleteProspectMutation = useMutation({
        mutationFn: (prospectId) => prospectsApi.deleteProspect(prospectId),
        onSuccess: () => {
            refetchProspects();
            queryClient.invalidateQueries(['prospect-lists']);
            setDeleteConfirmProspectId(null);
        },
    });

    const revalidateMutation = useMutation({
        mutationFn: (listId) => prospectsApi.revalidateList(listId),
        onSuccess: (result) => {
            setRevalidationResult(result);
            // Build validation map for quick lookup
            const map = {};
            result.results?.forEach(r => {
                map[r.prospect_id] = { status: r.status, issues: r.issues };
            });
            setValidationMap(map);
            refetchProspects();
        },
    });


    // Auto-select default profile
    useEffect(() => {
        if (companyProfiles?.length > 0 && !selectedProfileId) {
            const defaultProfile = companyProfiles.find(p => p.is_default) || companyProfiles[0];
            if (defaultProfile) {
                handleProfileSelect(defaultProfile.profile_id);
            }
        }
    }, [companyProfiles]);

    // Handle company profile selection - auto-fill fields
    const handleProfileSelect = (profileId) => {
        setSelectedProfileId(profileId);
        const profile = companyProfiles?.find(p => p.profile_id === profileId);
        if (profile) {
            setFormData(prev => ({
                ...prev,
                sender_name: profile.default_sender_name || prev.sender_name,
                cta_link: profile.default_cta_link || prev.cta_link,
            }));
        }
    };

    // Inline editing handlers (matching ProspectValidate style)
    const startUploadEdit = (index) => {
        setUploadEditingIndex(index);
        const record = editableUploadRecords[index];
        setUploadEditValues({ ...record });
    };

    const saveUploadEdit = () => {
        setEditableUploadRecords(prev => {
            const updated = [...prev];
            updated[uploadEditingIndex] = { ...uploadEditValues };
            return updated;
        });
        setUploadEditingIndex(null);
        setUploadEditValues({});
    };

    const cancelUploadEdit = () => {
        setUploadEditingIndex(null);
        setUploadEditValues({});
    };

    // Re-validate edited records
    const handleUploadRevalidate = async () => {
        if (editableUploadRecords.length === 0) return;

        setUploadLoading(true);
        try {
            const response = await api.post(`/uploads/${uploadResult?.upload_id || 'current'}/revalidations`, {
                records: editableUploadRecords
            });
            const result = response.data;
            setEditableUploadRecords(result.records || []);
        } catch (error) {
            console.error('Re-validation error:', error);
            setErrors({ upload: error.response?.data?.detail || error.message });
        } finally {
            setUploadLoading(false);
        }
    };

    // Auto-select first list
    useEffect(() => {
        if (prospectLists?.length > 0 && selectedLists.length === 0) {
            setSelectedLists([prospectLists[0].list_id]);
        }
    }, [prospectLists]);

    // Mirrors backend build_signature_block() (app/utils/email_utils.py) for live preview.
    const buildSignatureBlockPreview = () => {
        const lines = [formData.sender_name || '[Your Name]'];
        if (formData.sender_title && formData.sender_title.trim()) {
            lines.push(formData.sender_title.trim());
        }
        lines.push('Neutrino Tech Systems');
        return lines.join('\n');
    };

    // --- Dynamic Data Substitution for Template Preview ---
    const substituteProspectData = (text, prospect) => {
        if (!text || !prospect) return text;

        let result = text;

        // 1. Dynamic replacement for all direct keys
        Object.entries(prospect).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                result = result.replace(regex, String(value));
            }
        });

        // 2. Composite fields
        const fullName = [prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || 'there';
        const location = [prospect.poc_city, prospect.poc_state].filter(Boolean).join(', ') || '';

        result = result
            .replace(/\{\{first_name\}\}/gi, prospect.first_name || 'there')
            .replace(/\{\{firstName\}\}/gi, prospect.first_name || 'there')
            .replace(/\{\{last_name\}\}/gi, prospect.last_name || '')
            .replace(/\{\{lastName\}\}/gi, prospect.last_name || '')
            .replace(/\{\{full_name\}\}/gi, fullName)
            .replace(/\{\{name\}\}/gi, prospect.first_name || 'there')
            .replace(/\{\{email\}\}/gi, prospect.email || '')
            .replace(/\{\{email_type\}\}/gi, prospect.email_type || '')
            .replace(/\{\{company_name\}\}/gi, prospect.company_name || 'your company')
            .replace(/\{\{companyName\}\}/gi, prospect.company_name || 'your company')
            .replace(/\{\{company\}\}/gi, prospect.company_name || 'your company')
            .replace(/\{\{designation\}\}/gi, prospect.designation || 'Professional')
            .replace(/\{\{title\}\}/gi, prospect.designation || 'Professional')
            .replace(/\{\{role\}\}/gi, prospect.designation || 'Professional')
            .replace(/\{\{industry\}\}/gi, prospect.industry || 'technology')
            .replace(/\{\{linkedin_url\}\}/gi, prospect.linkedin_url || '')
            .replace(/\{\{linkedin\}\}/gi, prospect.linkedin_url || '')
            .replace(/\{\{poc_city\}\}/gi, prospect.poc_city || '')
            .replace(/\{\{city\}\}/gi, prospect.poc_city || '')
            .replace(/\{\{poc_state\}\}/gi, prospect.poc_state || '')
            .replace(/\{\{state\}\}/gi, prospect.poc_state || '')
            .replace(/\{\{location\}\}/gi, location)
            .replace(/\{\{timezone\}\}/gi, prospect.timezone || '')
            // Sender tokens
            .replace(/\{\{our_company\}\}/gi, 'Neutrino Tech Systems')
            .replace(/\{\{your_name\}\}/gi, formData.sender_name || '[Your Name]')
            .replace(/\{\{signature_block\}\}/gi, buildSignatureBlockPreview())
            .replace(/\{\{calendar_link\}\}/gi, formData.cta_link || '')
            .replace(/\{\{cta_link\}\}/gi, formData.cta_link || '');

        return result;
    };

    const getSelectedTemplate = () =>
        processingResult?.templates_generated?.find(t => t.persona_type === selectedPersona);

    // Get specific email from sequence (1, 2, 3, or 4)
    const getSelectedEmailFromSequence = () => {
        const template = getSelectedTemplate();
        if (!template) return null;

        // Use all_emails if available (new format), otherwise fall back to template (old format)
        if (template.all_emails?.length > 0) {
            return template.all_emails.find(e => e.step_number === selectedEmailStep) || template.all_emails[0];
        }
        return template.template; // Backwards compatibility
    };

    const getSampleProspects = () =>
        processingResult?.sample_prospects?.[selectedPersona] || [];

    // --- Upload Handlers ---

    // Dry-run validation of uploaded file
    const handleUploadDryRun = async () => {
        if (!uploadFile) return;

        setUploadLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadFile);

            const response = await api.post('/uploads/validations', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const result = response.data;
            setUploadResult(result);
            setEditableUploadRecords(result.records || []);
        } catch (error) {
            console.error('Upload validation error:', error);
            setErrors({ upload: error.response?.data?.detail || error.message });
        } finally {
            setUploadLoading(false);
        }
    };

    // Handle record edit in prospect table
    const handleUploadRecordChange = (index, updatedRecord) => {
        setEditableUploadRecords(prev => {
            const newRecords = [...prev];
            newRecords[index] = updatedRecord;
            return newRecords;
        });
    };

    // Handle row deletion
    const handleUploadRowDelete = (index) => {
        setEditableUploadRecords(prev => prev.filter((_, i) => i !== index));
    };

    // Confirm upload and save to database
    const handleConfirmUpload = async () => {
        if (!uploadResult?.upload_id) return;

        // Use filename as title if not specified
        const title = uploadTitle.trim() || uploadFile?.name?.replace(/\.[^.]+$/, '') || 'Uploaded List';

        setUploadLoading(true);
        try {
            const response = await api.post(`/uploads/${uploadResult.upload_id}/confirmations`, {
                upload_id: uploadResult.upload_id,
                title: title,
                records: editableUploadRecords.filter(r => r.status === 'ACCEPTED') || [],
            });
            const result = response.data;

            // Set the list as selected for the campaign
            setSelectedLists([result.list_id]);
            setUploadConfirmed(true);

            // Refresh prospect lists
            queryClient.invalidateQueries(['prospect-lists']);
        } catch (error) {
            console.error('Upload confirm error:', error);
            setErrors({ upload: error.response?.data?.detail || error.message });
        } finally {
            setUploadLoading(false);
        }
    };

    // --- Mutations ---

    // Step 1: Create Campaign
    const createMutation = useMutation({
        mutationFn: (data) => campaignApi.create(data),
        onSuccess: (result) => {
            setCampaignId(result.campaign_id);
            setCurrentStep(2);
            // queryClient.invalidateQueries(['campaigns']);
            queryClient.invalidateQueries({ queryKey: ['campaigns'], });
        },
        onError: (error) => setErrors({ submit: error.response?.data?.detail || 'Failed to create campaign' })
    });

    // Step 2: Sequence
    const sequenceMutation = useMutation({
        mutationFn: async (id) => {
            // Delete any existing sequences first (editing a draft that already has them)
            try {
                const existing = await sequenceApi.list(id);
                if (existing?.steps?.length > 0) {
                    for (const s of existing.steps) {
                        await sequenceApi.delete(s.sequence_id);
                    }
                }
            } catch (e) {
                console.warn('[Sequence] Could not fetch/delete existing sequences:', e);
            }
            // Add the new sequence steps
            for (const step of sequenceSteps) {
                await sequenceApi.add(id, { step_number: step.step_number, wait_days: step.wait_days });
            }
            return true;
        },
        onSuccess: () => setCurrentStep(3),
        onError: () => setErrors({ sequence: 'Failed to save sequence' })
    });

    // Step 3: Process Prospects & Generate Templates
    const processMutation = useMutation({
        mutationFn: async () => {
            setIsGeneratingTemplates(true);
            setGenerationStatus('Analyzing prospects and generating templates...');
            const listId = selectedLists[0];
            return await campaignWizardApi.processList(
                campaignId,
                listId,
                formData.campaign_name,
                'Neutrino Tech Systems',
                formData.campaign_description,
                sequenceSteps, // Pass user-configured sequence timing
                formData.include_first_name_in_subject, // Pass first name in subject preference
                creativeEmail, // Optional creative writing mode
                excludedProspectIds.length > 0 ? excludedProspectIds : null,
            );
        },
        onSuccess: (result) => {
            setIsGeneratingTemplates(false);
            setGenerationStatus('');
            setProcessingResult(result);
            // Auto-select first persona
            if (result.templates_generated?.[0]) {
                const first = result.templates_generated[0];
                setSelectedPersona(first.persona_type);
                setPreviewProspect(result.sample_prospects?.[first.persona_type]?.[0] || null);
            }
            setCurrentStep(4);
        },
        onError: (err) => {
            setIsGeneratingTemplates(false);
            setGenerationStatus('');
            setErrors({ process: err.response?.data?.detail || 'AI processing failed' });
        }
    });

    // On-demand: generate a template for a persona with no prospects detected yet
    // (selected from the "always show all personas" picker).
    const generatePersonaMutation = useMutation({
        mutationFn: async (personaType) => {
            const listId = selectedLists[0];
            return await campaignWizardApi.generatePersonaTemplate(
                campaignId,
                personaType,
                listId,
                formData.campaign_name,
                'Neutrino Tech Systems',
                formData.campaign_description,
                sequenceSteps,
                formData.include_first_name_in_subject,
                creativeEmail,
                excludedProspectIds.length > 0 ? excludedProspectIds : null,
            );
        },
        onSuccess: (result) => {
            setProcessingResult(prev => {
                const updated = { ...prev };
                const existingIdx = updated.templates_generated?.findIndex(
                    t => t.persona_type === result.persona_type
                );
                const templates = updated.templates_generated ? [...updated.templates_generated] : [];
                if (existingIdx >= 0) {
                    templates[existingIdx] = result;
                } else {
                    templates.push(result);
                }
                updated.templates_generated = templates;
                return updated;
            });
            setSelectedPersona(result.persona_type);
        },
        onError: (err) => {
            setErrors({ process: err.response?.data?.detail || 'Failed to generate template for this persona' });
        }
    });

    // Step 5: Launch — enroll every selected list, then launch only if anyone was enrolled
    const launchMutation = useMutation({
        mutationFn: async () => {
            if (!selectedLists.length) {
                throw new Error('No prospect list selected. Please go back to Step 3 and select a list.');
            }
            let enrolled = 0;
            const rejected = [];
            const seen = new Set();
            for (const [index, listId] of selectedLists.entries()) {
                const result = await campaignWizardApi.enrollProspects(
                    campaignId,
                    listId,
                    null, // Enroll all personas detected
                    true, // Exclude personal emails default
                    0,    // No cool-off filter — user explicitly chose to enroll
                    formData.daily_batch_size || null,
                    excludedProspectIds.length > 0 ? excludedProspectIds : null,
                );
                enrolled += result.enrolled_count || 0;
                for (const r of result.rejected || []) {
                    // A contact on several selected lists is enrolled once; don't report the repeats
                    if (index > 0 && r.reason_code === 'already_enrolled') continue;
                    if (seen.has(r.prospect_id)) continue;
                    seen.add(r.prospect_id);
                    rejected.push(r);
                }
            }
            if (enrolled === 0) {
                const error = new Error('No contacts could be enrolled, so the campaign was not launched.');
                error.report = { enrolled, rejected, launched: false };
                throw error;
            }
            await campaignApi.launch(campaignId);
            return { enrolled, rejected, launched: true };
        },
        onSuccess: async (report) => {
            // Clear draft after successful launch
            try {
                await campaignDraftsApi.clearAllDrafts();
            } catch (err) {
                console.error('[DRAFT] Failed to clear after launch:', err);
            }
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            if (report.rejected.length) {
                setEnrollReport(report); // navigate when the user closes it
            } else {
                navigate('/app/campaigns');
            }
        },
        onError: (err) => {
            if (err.report) setEnrollReport(err.report);
            setErrors({ launch: err.report ? err.message : 'Failed to launch campaign: ' + (err.response?.data?.detail || err.message) });
        }
    });

    // --- Handlers ---

    const handleStep1Submit = (e) => {
        e.preventDefault();
        if (!formData.campaign_name.trim()) {
            setErrors({ campaign_name: 'Campaign name is required' });
            return;
        }
        if (formData.inbox_ids.length === 0) {
            setErrors({ inboxes: 'Select at least one inbox for rotation' });
            return;
        }

        // If editing an existing campaign, update it and go to step 2
        if (campaignId) {
            campaignApi.update(campaignId, { ...formData, send_window_end: formData.send_window_end || null })
                .then(() => {
                    setCurrentStep(2);
                    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
                })
                .catch((err) => {
                    setErrors({ submit: err.response?.data?.detail || 'Failed to update campaign' });
                });
            return;
        }

        createMutation.mutate({
            ...formData,
            send_window_end: formData.send_window_end || null,
        });
    };

    const addSequenceStep = () => {
        if (sequenceSteps.length >= 7) return;
        setSequenceSteps(prev => [
            ...prev,
            { step_number: prev.length + 1, wait_days: 2, type: `Follow-up ${prev.length}` }
        ]);
    };

    const removeSequenceStep = (index) => {
        if (index === 0) return;
        setSequenceSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({
            ...s,
            step_number: i + 1,
            type: i === 0 ? 'Initial Email' : `Follow-up ${i}`
        })));
    };

    // Handle regenerating individual email subject or body
    const handleRegenerate = async (field) => {
        const email = getSelectedEmailFromSequence();
        if (!email?.template_id) {
            console.error('No template ID found');
            return;
        }

        setRegenerating(field);
        try {
            const result = await campaignWizardApi.regenerate(email.template_id, field, {
                campaign_description: formData.campaign_description,
                persona_type: selectedPersona,
                product_name: formData.campaign_name,
                cta_link: formData.cta_link,
                custom_instruction: customInstruction,
                creative_email: creativeEmail,
                step_number: selectedEmailStep,
            });

            // Update the local state with new content
            setProcessingResult(prev => {
                const updated = { ...prev };
                const templateIdx = updated.templates_generated?.findIndex(t => t.persona_type === selectedPersona);
                if (templateIdx >= 0 && updated.templates_generated[templateIdx].all_emails) {
                    const emailIdx = updated.templates_generated[templateIdx].all_emails.findIndex(
                        e => e.step_number === selectedEmailStep
                    );
                    if (emailIdx >= 0) {
                        updated.templates_generated[templateIdx].all_emails[emailIdx][field] = result.new_content;
                    }
                }
                return updated;
            });
        } catch (err) {
            console.error('Regenerate failed:', err);
            setErrors({ regenerate: err.response?.data?.detail || 'Failed to regenerate' });
        } finally {
            setRegenerating(null);
        }
    };

    const toggleList = (listId) => {
        setSelectedLists(prev => prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId]);
    };

    // Start editing a field
    const handleEdit = (field) => {
        const email = getSelectedEmailFromSequence();
        if (email) {
            setEditing(field);

            if (field === 'body') {
                const bodyText = email.body || '';
                // The rich text editor works in HTML; wrap legacy plain-text bodies once.
                setEditValue(hasHtmlTags(bodyText) ? bodyText : plainTextToHtml(bodyText));
            } else {
                setEditValue(email[field] || '');
            }
        }
    };

    const plainTextToHtml = (text) => {
        if (!text) return '';

        const lines = text.split("\n");
        const blocks = [];
        let bulletBuffer = [];

        const flushBullets = () => {
            if (bulletBuffer.length) {
                blocks.push(`<ul>${bulletBuffer.map(item => `<li>${item}</li>`).join('')}</ul>`);
                bulletBuffer = [];
            }
        };

        lines.forEach(line => {
            const trimmed = line.trim();
            if (/^[•\-*]\s+/.test(trimmed)) {
                bulletBuffer.push(trimmed.replace(/^[•\-*]\s+/, '').trim());
                return;
            }
            flushBullets();
            if (trimmed !== '') {
                blocks.push(`<p>${line}</p>`);
            }
        });
        flushBullets();

        return blocks.join("");
    };

    const hasHtmlTags = (value) => /<[^>]+>/.test(value || '');

    const escapeHtml = (value) =>
        (value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    const normalizeUnsubscribePreview = (value) => {
        if (!value) return '';
        let text = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        text = text.replace(/^\s*(please\s+)?unsubscribe.*$/gim, '');
        text = text.replace(/^\s*to\s+unsubscribe.*$/gim, '');
        text = text.replace(/^.*if you do not wish to receive such business communication emails.*$/gim, '');
        text = text.replace(/^.*reply\s+["']?\s*unsubscribe\s*["']?.*$/gim, '');
        text = text.replace(/^.*\/api\/tracking\/unsubscribe\/.*$/gim, '');
        // Unsubscribe link is appended at send time with a per-message tracking URL.
        // Do not add any text-based footer in the preview.
        return text.replace(/\n{3,}/g, '\n\n').trim();
    };

    const formatEmailBodyForPreview = (body, prospect = null) => {
        if (!body) return '';
        const hydrated = prospect ? substituteProspectData(body, prospect) : body;
        const normalized = normalizeUnsubscribePreview(hydrated);
        // Backward compatibility: keep legacy HTML templates as-is.
        if (hasHtmlTags(normalized)) return normalized;
        // Plain-text templates: preserve line breaks in preview.
        return escapeHtml(normalized).replace(/\n/g, '<br />');
    };

    // Save edited field to local state and push to backend
    const handleSaveEdit = async (field) => {
        const email = getSelectedEmailFromSequence();
        if (!email?.template_id) {
            console.error('No template ID found');
            return;
        }

        const newContent = editValue;

        // Single Bracket Validation for Deliverability
        // Matches {tag} but not {{tag}}
        const singleBracketPattern = /(?<!{){[^{}]+}(?!})/g;
        if (singleBracketPattern.test(newContent)) {
            window.alert("⚠️ Invalid Custom Variable Format\n\nPlease use double braces like {{first_name}} instead of {first_name} for personalization tags. Using single braces is frequently flagged by strict spam filters (like Proofpoint).");
            return;
        }

        try {
            // Push to backend
            await campaignWizardApi.updateTemplate(email.template_id, field, newContent);

            // Update local state
            setProcessingResult(prev => {
                const updated = { ...prev };
                const templateIdx = updated.templates_generated?.findIndex(
                    t => t.persona_type === selectedPersona
                );

                if (templateIdx >= 0 && updated.templates_generated[templateIdx].all_emails) {
                    const emailIdx = updated.templates_generated[templateIdx].all_emails.findIndex(
                        e => e.step_number === selectedEmailStep
                    );

                    if (emailIdx >= 0) {
                        updated.templates_generated[templateIdx].all_emails[emailIdx][field] = newContent;
                    }
                }

                return updated;
            });

            setEditing(null);
            setEditValue('');
        } catch (error) {
            console.error('Failed to save template edits:', error);
            setErrors({ editTemplate: error.response?.data?.detail || 'Failed to save edits' });
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditing(null);
        setEditValue('');
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <PageTransition>
            {enrollReport && (
                <EnrollmentResultModal
                    title={enrollReport.launched ? 'Campaign launched' : 'Campaign not launched'}
                    enrolled={enrollReport.enrolled}
                    rejected={enrollReport.rejected}
                    note={enrollReport.launched
                        ? 'These contacts were not added to the campaign:'
                        : 'None of the selected contacts could be enrolled. Fix or remove them, then launch again.'}
                    closeLabel={enrollReport.launched ? 'Go to campaigns' : 'Close'}
                    onClose={() => {
                        const launched = enrollReport.launched;
                        setEnrollReport(null);
                        if (launched) navigate('/app/campaigns');
                    }}
                />
            )}
            <div className="min-h-screen pb-12" style={{ background: 'var(--canvas-bg, #F6F4EE)' }}>
                {/* Header */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white border-b border-gray-100 sticky top-0 z-20 overflow-hidden"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                    {/* Gradient top strip */}
                    <div className="h-0.5 w-full" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }} />

                    <div className="max-w-7xl mx-auto px-8 h-14 flex justify-between items-center">
                        {/* Left: back + title */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/app/campaigns')}
                                className="p-1.5 -ml-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="h-4 w-px bg-gray-200" />
                            <h1 className="text-sm font-bold text-gray-900">
                                {editCampaignId ? 'Edit Campaign' : 'Create Campaign'}
                            </h1>
                        </div>

                        {/* Center: step pills */}
                        <div className="hidden sm:flex items-center gap-1">
                            {[
                                { n: 1, label: 'Details' },
                                { n: 2, label: 'Sequence' },
                                { n: 3, label: 'Prospects' },
                                { n: 4, label: 'Templates' },
                                { n: 5, label: 'Launch' },
                            ].map(({ n, label }, i, arr) => {
                                const done    = currentStep > n;
                                const active  = currentStep === n;
                                return (
                                    <React.Fragment key={n}>
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                                                style={active
                                                    ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                                    : done
                                                    ? { background: '#10b981', color: '#fff' }
                                                    : { background: '#e5e7eb', color: '#9ca3af' }
                                                }
                                            >
                                                {done ? '✓' : n}
                                            </div>
                                            <span className={`text-[11px] font-semibold ${active ? 'text-gray-900' : done ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {label}
                                            </span>
                                        </div>
                                        {i < arr.length - 1 && (
                                            <div className="w-6 h-px mx-0.5" style={{ background: currentStep > n ? '#10b981' : '#e5e7eb' }} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Right: save status */}
                        <div className="flex items-center gap-3">
                            {isSavingDraft && (
                                <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                                </span>
                            )}
                            {!isSavingDraft && lastSaved && (
                                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Saved
                                </span>
                            )}
                        </div>
                    </div>
                </motion.header>

                <main className="max-w-7xl mx-auto px-8 pt-6 pb-12 font-inter">
                    <AnimatePresence mode="wait">

                        {/* STEP 1: Details */}
                        {currentStep === 1 && (
                            <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit"
                                className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                                <form onSubmit={handleStep1Submit}>

                                    {/* ── Card gradient header ── */}
                                    <div className="px-8 py-6 border-b border-gray-100"
                                        style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.05), rgba(115,200,210,0.05))' }}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                <Rocket className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900">Campaign Setup</h2>
                                                <p className="text-xs text-gray-400 mt-0.5">Define identity, sender pool, and delivery settings.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 space-y-8">

                                        {/* ── SECTION 1: Identity ── */}
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'linear-gradient(135deg, #2d6bbf22, #73C8D222)' }}>
                                                    <User className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign Identity</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                {/* Campaign Name */}
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign Name <span className="text-red-400">*</span></label>
                                                    <input
                                                        name="campaign_name"
                                                        value={formData.campaign_name}
                                                        onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                                                        placeholder="e.g. Q4 Enterprise Outreach"
                                                        autoFocus
                                                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                                                        style={{ focusBorderColor: '#2d6bbf' }}
                                                    />
                                                    {errors.campaign_name && (
                                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" />{errors.campaign_name}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Company Profile */}
                                                {companyProfiles?.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Profile</label>
                                                        <select
                                                            value={selectedProfileId}
                                                            onChange={(e) => handleProfileSelect(e.target.value)}
                                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-400 focus:bg-white transition-all appearance-none"
                                                        >
                                                            <option value="">— Select Identity —</option>
                                                            {companyProfiles?.map(profile => (
                                                                <option key={profile.profile_id} value={profile.profile_id}>
                                                                    {profile.profile_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Context */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Context</label>
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                        style={{ background: 'rgba(45,107,191,0.08)', color: '#2d6bbf' }}>
                                                        Powers email generation
                                                    </span>
                                                </div>
                                                <div
                                                    onClick={() => { setTempContext(formData.campaign_description); setIsContextOpen(true); }}
                                                    className="w-full min-h-[80px] px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer text-sm text-gray-700 leading-relaxed hover:border-blue-300 hover:bg-white transition-all group relative"
                                                >
                                                    {formData.campaign_description
                                                        ? <span className="text-gray-700">{formData.campaign_description}</span>
                                                        : <span className="text-gray-400 italic">Describe your campaign — include campaign type, target audience, and products to highlight…</span>
                                                    }
                                                    <span className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                                                    </span>
                                                </div>

                                                {/* Context modal */}
                                                {isContextOpen && (
                                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                                                        onClick={() => setIsContextOpen(false)}>
                                                        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
                                                            onClick={e => e.stopPropagation()}>
                                                            <div className="h-1 w-full" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }} />
                                                            <div className="p-6">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <Sparkles className="w-4 h-4" style={{ color: '#2d6bbf' }} />
                                                                        <h3 className="text-base font-bold text-gray-900">Campaign Context for AI</h3>
                                                                    </div>
                                                                    <button onClick={() => setIsContextOpen(false)}
                                                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                                                        <XIcon className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    ref={contextRef}
                                                                    value={tempContext}
                                                                    onChange={(e) => setTempContext(e.target.value)}
                                                                    placeholder="Example: Conference campaign for Asembia AXS26 (Apr 27-28, Las Vegas). Focus on AccessHub and Prior Auth automation for specialty pharmacy hub managers. Abhi (Head HealthTech Solutions) will attend in person."
                                                                    rows={7}
                                                                    className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white resize-none text-sm text-gray-700 leading-relaxed transition-all"
                                                                />
                                                                <p className="text-xs text-gray-400 mt-2">
                                                                    <span className="font-semibold text-gray-500">How it works:</span> AI auto-detects your campaign type from this description. For conference/in-person emails, include event name, dates, location, and visiting rep name &amp; title. For cold outreach, describe the target audience and pain points to focus on. Leave blank to let AI pick from all Neutrino services automatically.
                                                                </p>
                                                                <div className="flex justify-end gap-2.5 mt-4">
                                                                    <button onClick={() => setIsContextOpen(false)}
                                                                        className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors">
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setFormData({ ...formData, campaign_description: tempContext }); setIsContextOpen(false); }}
                                                                        className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                                                                        style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                                                        Save Context
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Personalization toggle */}
                                                <label className="flex items-center gap-3 cursor-pointer select-none mt-2 group">
                                                    <div
                                                        onClick={() => setFormData({ ...formData, include_first_name_in_subject: !formData.include_first_name_in_subject })}
                                                        className="relative w-9 h-5 rounded-full transition-all shrink-0"
                                                        style={{ background: formData.include_first_name_in_subject ? 'linear-gradient(135deg, #2d6bbf, #73C8D2)' : '#d1d5db' }}>
                                                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                                            style={{ transform: formData.include_first_name_in_subject ? 'translateX(16px)' : 'translateX(0)' }} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-700">Personalize subject with first name</span>
                                                        <span className="text-xs text-gray-400 ml-2">AI adds {`{{ first_name }}`} to subjects</span>
                                                    </div>
                                                </label>

                                                {/* Unsubscribe mode toggle */}
                                                <label className="flex items-center gap-3 cursor-pointer select-none mt-2 group">
                                                    <div
                                                        onClick={() => setFormData({ ...formData, unsubscribe_mode: formData.unsubscribe_mode === 'html' ? 'plain' : 'html' })}
                                                        className="relative w-9 h-5 rounded-full transition-all shrink-0"
                                                        style={{ background: formData.unsubscribe_mode === 'html' ? 'linear-gradient(135deg, #2d6bbf, #73C8D2)' : '#d1d5db' }}>
                                                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                                                            style={{ transform: formData.unsubscribe_mode === 'html' ? 'translateX(16px)' : 'translateX(0)' }} />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-medium text-gray-700">Clickable unsubscribe link</span>
                                                        <span className="text-xs text-gray-400 ml-2">{formData.unsubscribe_mode === 'html' ? 'HTML hyperlink (may affect deliverability)' : 'Plain text reply-based'}</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* ── Divider ── */}
                                        <div className="h-px bg-gray-100" />

                                        {/* ── SECTION 2: Sender Pool ── */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                        style={{ background: 'linear-gradient(135deg, #FF901322, #cc6f0022)' }}>
                                                        <Mail className="w-3.5 h-3.5" style={{ color: '#FF9013' }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Rotation Pool</span>
                                                </div>
                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                                                    style={{ background: formData.inbox_ids.length > 0 ? 'rgba(45,107,191,0.08)' : 'rgba(239,68,68,0.08)', color: formData.inbox_ids.length > 0 ? '#2d6bbf' : '#ef4444' }}>
                                                    {formData.inbox_ids.length} selected
                                                </span>
                                            </div>

                                            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white"
                                                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <div className="max-h-[240px] overflow-y-auto divide-y divide-gray-50">
                                                    {inboxesLoading && (
                                                        <div className="px-4 py-5 flex items-center gap-2 text-sm text-gray-500">
                                                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                                            Loading sender inboxes...
                                                        </div>
                                                    )}
                                                    {!inboxesLoading && (!inboxes || inboxes.length === 0) && (
                                                        <div className="px-4 py-5 text-sm text-gray-500">
                                                            No sender inboxes found. Add inboxes from Email Accounts first.
                                                        </div>
                                                    )}
                                                    {!inboxesLoading && inboxes?.map(inbox => {
                                                        const isSelected = formData.inbox_ids.includes(inbox.inbox_id);
                                                        return (
                                                            <div
                                                                key={inbox.inbox_id}
                                                                onClick={() => {
                                                                    const ids = [...formData.inbox_ids];
                                                                    setFormData({ ...formData, inbox_ids: isSelected ? ids.filter(id => id !== inbox.inbox_id) : [...ids, inbox.inbox_id] });
                                                                }}
                                                                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all"
                                                                style={{ background: isSelected ? 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.04))' : 'transparent' }}
                                                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafaf9'; }}
                                                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                                            >
                                                                {/* Custom checkbox */}
                                                                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all border"
                                                                    style={isSelected
                                                                        ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', borderColor: 'transparent' }
                                                                        : { background: '#fff', borderColor: '#d1d5db' }}>
                                                                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                                </div>

                                                                {/* Email + status */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                                                            {inbox.email_address}
                                                                        </p>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${inbox.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                            {inbox.status}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Provider pill */}
                                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                                                    style={{ background: 'rgba(0,0,0,0.04)', color: '#6b7280' }}>
                                                                    {inbox.provider || 'SMTP'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {errors.inboxes && (
                                                <p className="text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />{errors.inboxes}
                                                </p>
                                            )}
                                        </div>

                                        {/* ── Divider ── */}
                                        <div className="h-px bg-gray-100" />

                                        {/* ── SECTION 3: Sender Details ── */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'linear-gradient(135deg, #73C8D222, #4db0bb22)' }}>
                                                    <User className="w-3.5 h-3.5" style={{ color: '#73C8D2' }} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sender Details</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender Name</label>
                                                    <input
                                                        name="sender_name"
                                                        value={formData.sender_name}
                                                        onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                                                        placeholder="e.g. John Smith"
                                                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Sender Title</label>
                                                    <input
                                                        name="sender_title"
                                                        value={formData.sender_title}
                                                        onChange={(e) => setFormData({ ...formData, sender_title: e.target.value })}
                                                        placeholder="e.g. Account Executive"
                                                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">CTA / Booking Link</label>
                                                    <input
                                                        name="cta_link"
                                                        value={formData.cta_link}
                                                        onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                                                        placeholder="https://calendly.com/..."
                                                        className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Divider ── */}
                                        <div className="h-px bg-gray-100" />

                                        {/* ── SECTION 4: Delivery Settings ── */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                                                    style={{ background: 'linear-gradient(135deg, #F5F1DC, #e8e3c0)' }}>
                                                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Delivery Settings</span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Timezone card */}
                                                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs font-semibold text-gray-600">Campaign Timezone <span className="text-red-400">*</span></span>
                                                    </div>
                                                    <TimezonePicker
                                                        value={formData.campaign_timezone}
                                                        onChange={(val) => setFormData({ ...formData, campaign_timezone: val })}
                                                    />
                                                    <p className="text-[11px] text-gray-400 leading-snug">
                                                        All send times are interpreted in this timezone.
                                                    </p>
                                                </div>

                                                {/* Sending Window */}
                                                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs font-semibold text-gray-600">Send Window <span className="text-red-400">*</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={formData.send_window_start}
                                                            onChange={(e) => setFormData({ ...formData, send_window_start: e.target.value })}
                                                            required
                                                            className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-all"
                                                        />
                                                        <span className="text-xs text-gray-400 font-medium">to</span>
                                                        <input
                                                            type="time"
                                                            value={formData.send_window_end}
                                                            onChange={(e) => setFormData({ ...formData, send_window_end: e.target.value })}
                                                            className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-all"
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 leading-snug">
                                                        All emails will be sent within this daily window.
                                                    </p>
                                                </div>

                                                {/* Sending Mode */}
                                                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs font-semibold text-gray-600">Distribution Mode</span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { value: 'spread', label: 'Spread Evenly', desc: 'Distribute uniformly across window' },
                                                            { value: 'random', label: 'Random', desc: 'Random time per email in window' },
                                                            { value: 'batch', label: 'Batches', desc: 'Send in groups with gap between' },
                                                        ].map(mode => (
                                                            <button
                                                                key={mode.value}
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, sending_mode: mode.value })}
                                                                className={`p-2.5 rounded-lg border text-left transition-all ${formData.sending_mode === mode.value
                                                                    ? 'border-blue-400 bg-blue-50'
                                                                    : 'border-gray-200 bg-white hover:border-blue-200'}`}
                                                            >
                                                                <p className={`text-[11px] font-bold ${formData.sending_mode === mode.value ? 'text-blue-700' : 'text-gray-700'}`}>{mode.label}</p>
                                                                <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{mode.desc}</p>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Random mode options */}
                                                    {formData.sending_mode === 'random' && (
                                                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                                                            <span className="text-[11px] text-gray-500 whitespace-nowrap">Min gap between emails</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="60"
                                                                value={formData.min_gap_minutes}
                                                                onChange={(e) => setFormData({ ...formData, min_gap_minutes: parseInt(e.target.value) || 0 })}
                                                                className="w-16 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                                            />
                                                            <span className="text-[11px] text-gray-400">minutes</span>
                                                        </div>
                                                    )}

                                                    {/* Spread mode options */}
                                                    {formData.sending_mode === 'spread' && (
                                                        <div className="pt-2 border-t border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[11px] text-gray-500 whitespace-nowrap">Max gap between emails</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="60"
                                                                    value={formData.min_gap_minutes}
                                                                    onChange={(e) => setFormData({ ...formData, min_gap_minutes: parseInt(e.target.value) || 0 })}
                                                                    className="w-16 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                                                />
                                                                <span className="text-[11px] text-gray-400">minutes</span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 leading-snug mt-1.5">
                                                                By default, Spread stretches evenly across the whole window above —
                                                                a short list in a long window sends slower than it needs to. This
                                                                caps the gap so sending finishes sooner. 0 = no cap (send as fast as
                                                                the window allows).
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Batch mode options */}
                                                    {formData.sending_mode === 'batch' && (
                                                        <div className="space-y-2 pt-2 border-t border-gray-100">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[11px] text-gray-500 whitespace-nowrap w-28">Emails per batch</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={formData.batch_size || ''}
                                                                    onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || null })}
                                                                    placeholder="e.g. 10"
                                                                    className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[11px] text-gray-500 whitespace-nowrap w-28">Gap between batches</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={formData.batch_gap_minutes}
                                                                    onChange={(e) => setFormData({ ...formData, batch_gap_minutes: parseInt(e.target.value) || 30 })}
                                                                    className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                                                />
                                                                <span className="text-[11px] text-gray-400">minutes</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Daily Batch Limit */}
                                                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            <span className="text-xs font-semibold text-gray-600">Daily Batch Limit</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({
                                                                ...formData,
                                                                daily_batch_size: formData.daily_batch_size ? null : 100,
                                                            })}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.daily_batch_size ? 'bg-blue-500' : 'bg-gray-200'}`}
                                                        >
                                                            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${formData.daily_batch_size ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                        </button>
                                                    </div>
                                                    {formData.daily_batch_size ? (
                                                        <div className="space-y-2 pt-1 border-t border-gray-100">
                                                            <p className="text-[11px] text-gray-500">
                                                                Contacts are emailed in groups across consecutive business days.
                                                                Day 1 → contacts 1–{formData.daily_batch_size}, Day 2 → {formData.daily_batch_size + 1}–{formData.daily_batch_size * 2}, etc.
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[11px] text-gray-500 whitespace-nowrap">Contacts per day</span>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={formData.daily_batch_size}
                                                                    onChange={(e) => setFormData({ ...formData, daily_batch_size: parseInt(e.target.value) || 100 })}
                                                                    className="w-20 h-8 px-2 border border-gray-200 rounded-lg text-sm text-center bg-white focus:outline-none focus:border-blue-400"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-gray-400">
                                                            Off — all contacts are scheduled from Day 1. Enable to throttle to N contacts per day.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Start Date card */}
                                                <label
                                                    onClick={() => { if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker(); else dateInputRef.current?.focus(); }}
                                                    className="block p-4 border border-gray-100 rounded-xl bg-gray-50/60 space-y-3 cursor-pointer hover:border-blue-300 hover:bg-white transition-all"
                                                >
                                                    <div className="flex items-center gap-2 pointer-events-none">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span className="text-xs font-semibold text-gray-600">Campaign Start Date</span>
                                                    </div>
                                                    <input
                                                        ref={dateInputRef}
                                                        type="date"
                                                        value={formData.start_date || ''}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                                                        className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 transition-all"
                                                    />
                                                    {formData.start_date ? (
                                                        <p className="text-[11px] font-medium pointer-events-none"
                                                            style={{ color: '#2d6bbf' }}>
                                                            Begins {new Date(formData.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] text-gray-400 pointer-events-none">Starts immediately on launch day.</p>
                                                    )}
                                                </label>

                                            </div>
                                        </div>

                                    </div>

                                    {/* ── Footer ── */}
                                    <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
                                        <p className="text-xs text-gray-400">
                                            {errors.submit && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.submit}</span>}
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={createMutation.isPending}
                                            className="flex items-center gap-2 text-white font-semibold h-11 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                        >
                                            {createMutation.isPending
                                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                                                : <><span>Save & Continue</span><ArrowRight className="w-4 h-4" /></>
                                            }
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* STEP 2: Sequence */}
                        {currentStep === 2 && (
                            <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                {/* — Gradient card header — */}
                                <div className="px-8 py-5 flex items-center gap-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                        <Clock className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold !text-gray-900">Sequence Engine</h2>
                                        <p className="text-gray-400 text-sm">Design the automated follow-up cadence. Max 7 steps.</p>
                                    </div>
                                </div>
                                <div className="p-8">

                                    {/* TIMELINE CONTAINER */}
                                    <div className="relative pl-8 space-y-8">
                                        {/* The Continuous Vertical Line */}
                                        <div className="absolute left-[31px] top-4 bottom-12 w-0.5 bg-slate-200" />

                                        {sequenceSteps?.map((step, index) => (
                                            <div key={index} className="relative">

                                                {/* WAIT BLOCK (If not first step) */}
                                                {index > 0 && (
                                                    <div className="flex items-center gap-4 mb-8 relative">
                                                        {/* Dot on line */}
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 absolute -left-[23px]" />

                                                        <div className="flex items-center gap-3 bg-slate-50 border border-dashed border-slate-300 px-4 py-1.5 rounded-full z-10">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Wait</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="30"
                                                                value={step.wait_days}
                                                                onChange={(e) => {
                                                                    const newSteps = [...sequenceSteps];
                                                                    newSteps[index].wait_days = parseInt(e.target.value) || 0;
                                                                    setSequenceSteps(newSteps);
                                                                }}
                                                                className="w-12 h-5 text-xs text-center font-bold text-slate-700 bg-white border border-slate-200 rounded focus:ring-blue-500 hover:border-blue-400 transition-colors"
                                                            />
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Days</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* EMAIL STEP CARD */}
                                                <div className="relative group">
                                                    {/* Step Number Circle */}
                                                    <div
                                                        className="absolute -left-[44px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 border-2 transition-all"
                                                        style={index === 0
                                                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', borderColor: 'transparent', color: '#fff' }
                                                            : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                                                        }
                                                    >
                                                        {step.step_number}
                                                    </div>

                                                    <div className="p-5 border-2 border-slate-200 rounded-xl bg-white hover:border-blue-400 transition-all group flex justify-between items-center shadow-none">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-bold text-slate-900">{step.type}</h3>
                                                                {index === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">INITIAL</span>}
                                                            </div>
                                                            <p className="text-xs text-slate-500">
                                                                {index === 0 ? 'Starts immediately on campaign launch' : 'Follow-up email sent automatically if no reply'}
                                                            </p>
                                                        </div>

                                                        {index > 0 && (
                                                            <button
                                                                onClick={() => removeSequenceStep(index)}
                                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Remove Step"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {/* ADD STEP BUTTON */}
                                        {sequenceSteps.length < 7 && (
                                            <div className="relative pt-4">
                                                {/* Connector to button */}
                                                <div className="absolute left-[31px] -top-4 h-8 w-0.5 bg-slate-200" />

                                                <button
                                                    onClick={addSequenceStep}
                                                    className="w-full h-14 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50/40 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                                                    style={{ '--hover-border': '#2d6bbf' }}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#2d6bbf'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                    Add Follow-up Step
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex justify-between items-center">
                                    <Button variant="ghost" onClick={() => setCurrentStep(1)} className="text-slate-500 hover:text-slate-900 px-0">
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => sequenceMutation.mutate(campaignId)}
                                        isLoading={sequenceMutation.isPending}
                                        className="text-white font-bold h-11 px-10 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                    >
                                        Save Sequence
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 3: Prospects */}
                        {/* STEP 3: Prospects */}
                        {currentStep === 3 && (
                            <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                {/* — Gradient card header — */}
                                <div className="px-8 py-5 flex items-center gap-4 border-b border-gray-100 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                        <Users className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold !text-gray-900">Select Prospects</h2>
                                        <p className="text-gray-400 text-sm">Choose an existing list or upload a new one.</p>
                                    </div>
                                </div>
                                <div className="p-8">
                                    {/* Tab Switcher */}
                                    <div className="flex gap-2 mb-6">
                                        <button
                                            onClick={() => setUploadMode('select')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                            style={uploadMode === 'select'
                                                ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                                : { background: '#f1f5f9', color: '#475569' }}
                                        >
                                            <Users className="w-4 h-4" />
                                            Select Existing List
                                        </button>
                                        <button
                                            onClick={() => setUploadMode('upload')}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                            style={uploadMode === 'upload'
                                                ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                                : { background: '#f1f5f9', color: '#475569' }}
                                        >
                                            <Upload className="w-4 h-4" />
                                            Upload New List
                                        </button>
                                    </div>

                                    {/* SELECT MODE */}
                                    {uploadMode === 'select' && (
                                        <>
                                            {listsLoading ? (
                                                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
                                            ) : (
                                                <div className="relative">
                                                    {/* Click outside to close - rendered BEFORE dropdown so it's behind */}
                                                    {isListDropdownOpen && (
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setIsListDropdownOpen(false)}
                                                        />
                                                    )}

                                                    {/* Search Input / Selected Display */}
                                                    <div
                                                        onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                                                        className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-all relative z-20"
                                                    >
                                                        <Search className="w-4 h-4 text-slate-400" />
                                                        <span className={`flex-1 text-sm ${selectedLists.length > 0 ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
                                                            {selectedLists.length > 0
                                                                ? prospectLists?.find(l => l.list_id === selectedLists[0])?.list_name || 'Selected list'
                                                                : 'Search and select a list...'}
                                                        </span>
                                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isListDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {/* Dropdown Panel */}
                                                    <AnimatePresence>
                                                        {isListDropdownOpen && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -8 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                                                            >
                                                                {/* Search Input in Dropdown */}
                                                                <div className="p-3 border-b border-slate-100">
                                                                    <div className="relative">
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Search lists..."
                                                                            value={listSearchQuery}
                                                                            onChange={(e) => setListSearchQuery(e.target.value)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* List Items */}
                                                                <div className="max-h-64 overflow-y-auto">
                                                                    {prospectLists
                                                                        ?.filter(list => list.list_name.toLowerCase().includes(listSearchQuery.toLowerCase()))
                                                                        ?.map(list => (
                                                                            <div
                                                                                key={list.list_id}
                                                                                onClick={() => {
                                                                                    setSelectedLists([list.list_id]);
                                                                                    setExcludedProspectIds([]);
                                                                                    setProspectPage(1);
                                                                                    setIsListDropdownOpen(false);
                                                                                    setListSearchQuery('');
                                                                                }}
                                                                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${selectedLists.includes(list.list_id)
                                                                                    ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                                                                    : 'hover:bg-slate-50'
                                                                                    }`}
                                                                            >
                                                                                {/* Radio indicator */}
                                                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedLists.includes(list.list_id)
                                                                                    ? 'border-blue-500 bg-blue-500'
                                                                                    : 'border-slate-300'
                                                                                    }`}>
                                                                                    {selectedLists.includes(list.list_id) && (
                                                                                        <CheckCircle className="w-4 h-4 text-white" />
                                                                                    )}
                                                                                </div>

                                                                                {/* List info */}
                                                                                <div className="flex-1">
                                                                                    <p className="text-sm font-medium text-slate-900">{list.list_name}</p>
                                                                                    <p className="text-xs text-slate-500">
                                                                                        {list.prospect_count?.toLocaleString() || 0} prospects
                                                                                        {list.uploaded_at && ` · ${new Date(list.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ))}

                                                                    {prospectLists?.filter(list => list.list_name.toLowerCase().includes(listSearchQuery.toLowerCase())).length === 0 && (
                                                                        <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                                                            No lists match your search
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}

                                            {/* Embedded Prospect Table (when list selected) */}
                                            {selectedLists.length > 0 && !isListDropdownOpen && (
                                                <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
                                                    {/* Header with Revalidate Button */}
                                                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <Users className="w-4 h-4 text-slate-500" />
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {listProspectsData?.list_name || 'Prospects'}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                ({listProspectsData?.total || 0} total)
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {revalidationResult && (
                                                                <div className="flex items-center gap-1.5 text-xs">
                                                                    <span className="text-emerald-600 font-medium">{revalidationResult.valid_count} valid</span>
                                                                    {revalidationResult.warning_count > 0 && (
                                                                        <span className="text-amber-600 font-medium">{revalidationResult.warning_count} warnings</span>
                                                                    )}
                                                                    {revalidationResult.invalid_count > 0 && (
                                                                        <span className="text-red-600 font-medium">{revalidationResult.invalid_count} invalid</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => revalidateMutation.mutate(selectedLists[0])}
                                                                disabled={revalidateMutation.isPending}
                                                                className="h-8 text-xs"
                                                            >
                                                                {revalidateMutation.isPending ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                ) : (
                                                                    <RefreshCw className="w-3 h-3 mr-1" />
                                                                )}
                                                                Revalidate
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Search + Selection Summary */}
                                                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
                                                        <div className="relative w-full max-w-xs">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search contacts..."
                                                                value={prospectSearch}
                                                                onChange={(e) => { setProspectSearch(e.target.value); setProspectPage(1); }}
                                                                className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-all placeholder:text-slate-400"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                                                            <span>
                                                                {(listProspectsData?.total || 0) - excludedProspectIds.length} of {listProspectsData?.total || 0} contacts selected
                                                            </span>
                                                            {excludedProspectIds.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExcludedProspectIds([])}
                                                                    className="font-semibold text-blue-600 hover:text-blue-700"
                                                                >
                                                                    Reset
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Prospect Table */}
                                                    {prospectsLoading ? (
                                                        <div className="py-12 flex justify-center">
                                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                                        <tr>
                                                                            <th className="px-4 py-2 w-9">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={(listProspectsData?.prospects?.length || 0) > 0 && listProspectsData.prospects.every(p => !excludedProspectIds.includes(p.prospect_id))}
                                                                                    onChange={() => {
                                                                                        const pageIds = (listProspectsData?.prospects || []).map(p => p.prospect_id);
                                                                                        const pageAllSelected = pageIds.every(id => !excludedProspectIds.includes(id));
                                                                                        setExcludedProspectIds(prev => pageAllSelected
                                                                                            ? [...new Set([...prev, ...pageIds])]
                                                                                            : prev.filter(id => !pageIds.includes(id))
                                                                                        );
                                                                                    }}
                                                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                                                />
                                                                            </th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">First Name</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Name</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Designation</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">State</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Country</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                                            <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {listProspectsData?.prospects?.map((prospect) => {
                                                                            const isEditing = editingProspectId === prospect.prospect_id;
                                                                            const validation = validationMap[prospect.prospect_id];

                                                                            return (
                                                                                <tr key={prospect.prospect_id} className="hover:bg-slate-50">
                                                                                    {/* Selection checkbox */}
                                                                                    <td className="px-4 py-3">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={!excludedProspectIds.includes(prospect.prospect_id)}
                                                                                            onChange={() => {
                                                                                                setExcludedProspectIds(prev => prev.includes(prospect.prospect_id)
                                                                                                    ? prev.filter(id => id !== prospect.prospect_id)
                                                                                                    : [...prev, prospect.prospect_id]
                                                                                                );
                                                                                            }}
                                                                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                                                                        />
                                                                                    </td>
                                                                                    {/* First Name */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.first_name || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, first_name: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                                placeholder="First"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="font-medium text-slate-900">
                                                                                                {prospect.first_name || '-'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Last Name */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.last_name || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, last_name: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                                placeholder="Last"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="font-medium text-slate-900">
                                                                                                {prospect.last_name || '-'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Designation */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.designation || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, designation: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="text-slate-600">{prospect.designation || '-'}</span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Company */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.company_name || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, company_name: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="text-slate-600">{prospect.company_name || '-'}</span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Email */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="email"
                                                                                                value={editProspectValues.email || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, email: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="text-slate-600">{prospect.email}</span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* City */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.poc_city || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, poc_city: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                                placeholder="City"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="text-slate-600">{prospect.poc_city || '-'}</span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* State */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.poc_state || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, poc_state: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                                placeholder="State"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="text-slate-600">{prospect.poc_state || '-'}</span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Country */}
                                                                                    <td className="px-4 py-3">
                                                                                        {isEditing ? (
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editProspectValues.poc_country || ''}
                                                                                                onChange={(e) => setEditProspectValues({ ...editProspectValues, poc_country: e.target.value })}
                                                                                                className="w-full px-2 py-1 text-xs border rounded"
                                                                                                placeholder="Country"
                                                                                            />
                                                                                        ) : (
                                                                                            <span className="text-slate-600">{prospect.poc_country || '-'}</span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Status */}
                                                                                    <td className="px-4 py-3">
                                                                                        {validation ? (
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                {validation.status === 'valid' && (
                                                                                                    <span className="flex items-center gap-1 text-emerald-600 text-xs">
                                                                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                                                                        Valid
                                                                                                    </span>
                                                                                                )}
                                                                                                {validation.status === 'warning' && (
                                                                                                    <span className="flex items-center gap-1 text-amber-600 text-xs" title={validation.issues?.join(', ')}>
                                                                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                                                                        Warning
                                                                                                    </span>
                                                                                                )}
                                                                                                {validation.status === 'invalid' && (
                                                                                                    <span className="flex items-center gap-1 text-red-600 text-xs" title={validation.issues?.join(', ')}>
                                                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                                                        Invalid
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${prospect.consent_status === 'SUBSCRIBED'
                                                                                                ? 'bg-emerald-50 text-emerald-700'
                                                                                                : prospect.consent_status === 'UNSUBSCRIBED'
                                                                                                    ? 'bg-red-50 text-red-700'
                                                                                                    : 'bg-slate-100 text-slate-600'
                                                                                                }`}>
                                                                                                {prospect.consent_status || 'Unknown'}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    {/* Actions */}
                                                                                    <td className="px-4 py-3 text-right">
                                                                                        {isEditing ? (
                                                                                            <div className="flex items-center justify-end gap-1">
                                                                                                <button
                                                                                                    onClick={() => updateProspectMutation.mutate({
                                                                                                        prospectId: prospect.prospect_id,
                                                                                                        updates: editProspectValues
                                                                                                    })}
                                                                                                    disabled={updateProspectMutation.isPending}
                                                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                                                                                >
                                                                                                    {updateProspectMutation.isPending ? (
                                                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                                                    ) : (
                                                                                                        <Check className="w-4 h-4" />
                                                                                                    )}
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setEditingProspectId(null);
                                                                                                        setEditProspectValues({});
                                                                                                    }}
                                                                                                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                                                                                                >
                                                                                                    <XIcon className="w-4 h-4" />
                                                                                                </button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex items-center justify-end gap-1">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setEditingProspectId(prospect.prospect_id);
                                                                                                        setEditProspectValues({
                                                                                                            first_name: prospect.first_name,
                                                                                                            last_name: prospect.last_name,
                                                                                                            email: prospect.email,
                                                                                                            company_name: prospect.company_name,
                                                                                                            designation: prospect.designation,
                                                                                                            poc_city: prospect.poc_city,
                                                                                                            poc_state: prospect.poc_state,
                                                                                                        });
                                                                                                    }}
                                                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                                                    title="Edit"
                                                                                                >
                                                                                                    <Edit2 className="w-4 h-4" />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setDeleteConfirmProspectId(prospect.prospect_id)}
                                                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                                    title="Delete"
                                                                                                >
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                            {/* Pagination */}
                                                            {listProspectsData?.total > 10 && (
                                                                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                                                                    <span className="text-xs text-slate-500">
                                                                        Page {prospectPage} of {Math.ceil((listProspectsData?.total || 0) / 10)}
                                                                    </span>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => setProspectPage(p => Math.max(1, p - 1))}
                                                                            disabled={prospectPage === 1}
                                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded disabled:opacity-30"
                                                                        >
                                                                            <ChevronLeft className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setProspectPage(p => p + 1)}
                                                                            disabled={prospectPage >= Math.ceil((listProspectsData?.total || 0) / 10)}
                                                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded disabled:opacity-30"
                                                                        >
                                                                            <ChevronRight className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Delete Confirmation Modal */}
                                                    <AnimatePresence>
                                                        {deleteConfirmProspectId && (
                                                            <motion.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                                                                onClick={() => setDeleteConfirmProspectId(null)}
                                                            >
                                                                <motion.div
                                                                    initial={{ scale: 0.95 }}
                                                                    animate={{ scale: 1 }}
                                                                    exit={{ scale: 0.95 }}
                                                                    className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="flex items-center gap-3 mb-4">
                                                                        <div className="p-2 bg-red-100 rounded-lg">
                                                                            <Trash2 className="w-5 h-5 text-red-600" />
                                                                        </div>
                                                                        <h3 className="text-lg font-bold text-slate-900">Delete Prospect?</h3>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 mb-6">
                                                                        This will permanently remove this prospect from all lists and campaigns. This action cannot be undone.
                                                                    </p>
                                                                    <div className="flex gap-3">
                                                                        <Button
                                                                            variant="outline"
                                                                            onClick={() => setDeleteConfirmProspectId(null)}
                                                                            className="flex-1"
                                                                        >
                                                                            Cancel
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            onClick={() => deleteProspectMutation.mutate(deleteConfirmProspectId)}
                                                                            disabled={deleteProspectMutation.isPending}
                                                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                                                        >
                                                                            {deleteProspectMutation.isPending ? (
                                                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                                            ) : null}
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                </motion.div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* UPLOAD MODE */}
                                    {uploadMode === 'upload' && (
                                        <div className="space-y-3">
                                            {/* Compact Row: List Name + File Upload */}
                                            <div className="flex gap-3">
                                                {/* List Name */}
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">List Name</label>
                                                    <input
                                                        type="text"
                                                        value={uploadTitle}
                                                        onChange={(e) => setUploadTitle(e.target.value)}
                                                        placeholder="e.g. January 2026 Leads"
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    />
                                                </div>

                                                {/* File Upload */}
                                                <div className="flex-1">
                                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Upload File</label>
                                                    <label className="cursor-pointer block">
                                                        <input
                                                            type="file"
                                                            accept=".xlsx,.xls,.csv"
                                                            onChange={(e) => {
                                                                setUploadFile(e.target.files[0]);
                                                                setUploadResult(null);
                                                                setUploadConfirmed(false);
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <div className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-lg transition text-sm ${uploadFile
                                                            ? 'border-blue-400 bg-blue-50 text-blue-700'
                                                            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-600'
                                                            }`}>
                                                            <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                                                            <span className="truncate">
                                                                {uploadFile ? uploadFile.name : 'Excel File'}
                                                            </span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Validate Button - Compact */}
                                            {uploadFile && !uploadResult && (
                                                <Button
                                                    onClick={handleUploadDryRun}
                                                    disabled={uploadLoading || !uploadTitle.trim()}
                                                    className="w-full h-9 text-sm"
                                                >
                                                    {uploadLoading ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                            Validating...
                                                        </>
                                                    ) : (
                                                        <>Validate & Preview</>
                                                    )}
                                                </Button>
                                            )}

                                            {/* Validation Results - Compact */}
                                            {uploadResult && (
                                                <div className="space-y-3">
                                                    {/* Inline Stats Bar */}
                                                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-sm">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-slate-600">
                                                                <strong className="text-slate-900">{uploadResult.total_rows}</strong> total
                                                            </span>
                                                            <span className="text-emerald-600">
                                                                <strong>{uploadResult.accepted}</strong> accepted
                                                            </span>
                                                            {uploadResult.rejected > 0 && (
                                                                <span className="text-red-500">
                                                                    <strong>{uploadResult.rejected}</strong> rejected
                                                                </span>
                                                            )}
                                                        </div>
                                                        {uploadResult.rejected > 0 && (
                                                            <span className="text-xs text-amber-600 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Invalid emails filtered
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Compact Inline Table (matching ProspectValidate style) */}
                                                    {editableUploadRecords.length > 0 && (
                                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                            <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                                                                <table className="w-full text-left min-w-[700px]">
                                                                    <thead className="sticky top-0 z-10">
                                                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide text-center w-12">Status</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Reason</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">First Name</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Last Name</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Designation</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Company</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Email</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">City</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">State</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide">Country</th>
                                                                            <th className="py-2 px-2 text-[10px] font-semibold text-blue-700 uppercase tracking-wide text-center w-16">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {editableUploadRecords.map((record, index) => (
                                                                            <tr
                                                                                key={index}
                                                                                className={`transition-colors ${uploadEditingIndex === index
                                                                                    ? 'bg-blue-50/50'
                                                                                    : record.status === 'REJECTED'
                                                                                        ? 'bg-slate-50/50 hover:bg-slate-100/50'
                                                                                        : 'hover:bg-blue-50/30'
                                                                                    }`}
                                                                            >
                                                                                <td className="py-1.5 px-2 text-center">
                                                                                    {record.status === 'ACCEPTED' ? (
                                                                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full">
                                                                                            <Check className="w-3 h-3" />
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 text-slate-500 rounded-full">
                                                                                            <XIcon className="w-3 h-3" />
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    <span className="text-[10px] font-bold text-red-500">{record.reason || '-'}</span>
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.first_name || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, first_name: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                            placeholder="First"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] font-medium text-slate-800">{record.first_name || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.last_name || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, last_name: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                            placeholder="Last"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] font-medium text-slate-800">{record.last_name || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.designation || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, designation: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-600">{record.designation || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.company_name || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, company_name: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-600">{record.company_name || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.email || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, email: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-600">{record.email}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.poc_city || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, poc_city: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                            placeholder="City"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-600">{record.poc_city || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.poc_state || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, poc_state: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                            placeholder="State"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-600">{record.poc_state || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <input
                                                                                            value={uploadEditValues.poc_country || ''}
                                                                                            onChange={(e) => setUploadEditValues(v => ({ ...v, poc_country: e.target.value }))}
                                                                                            className="w-full px-1 py-0.5 border border-blue-300 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                                                                            placeholder="Country"
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[11px] text-slate-600">{record.poc_country || '-'}</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-1.5 px-2 text-center">
                                                                                    {uploadEditingIndex === index ? (
                                                                                        <div className="flex gap-1 justify-center">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={saveUploadEdit}
                                                                                                className="p-0.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                                                                                title="Save"
                                                                                            >
                                                                                                <Save className="w-3 h-3" />
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={cancelUploadEdit}
                                                                                                className="p-0.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
                                                                                                title="Cancel"
                                                                                            >
                                                                                                <XIcon className="w-3 h-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex gap-1 justify-center">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => startUploadEdit(index)}
                                                                                                className="p-0.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                                                title="Edit"
                                                                                            >
                                                                                                <Edit2 className="w-3 h-3" />
                                                                                            </button>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleUploadRowDelete(index)}
                                                                                                className="p-0.5 text-rose-500 hover:bg-rose-100 rounded transition-colors"
                                                                                                title="Delete"
                                                                                            >
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {!uploadConfirmed ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={handleUploadRevalidate}
                                                                disabled={uploadLoading || editableUploadRecords.length === 0}
                                                                variant="outline"
                                                                className="flex-1"
                                                            >
                                                                {uploadLoading ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                                        Validating...
                                                                    </>
                                                                ) : (
                                                                    <>Re-validate Records</>
                                                                )}
                                                            </Button>

                                                            <button
                                                                onClick={handleConfirmUpload}
                                                                disabled={uploadLoading || editableUploadRecords.filter(r => r.status === 'ACCEPTED').length === 0 || !uploadTitle.trim()}
                                                                className="flex-1 flex items-center justify-center gap-2 text-white font-semibold h-10 px-4 rounded-lg transition-all hover:scale-[1.02] disabled:opacity-60"
                                                                style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                                            >
                                                                {uploadLoading ? (
                                                                    <><Loader2 className="w-4 h-4 animate-spin" />Creating List...</>
                                                                ) : (
                                                                    <><CheckCircle className="w-4 h-4" />Confirm & Create List ({editableUploadRecords.filter(r => r.status === 'ACCEPTED').length} prospects)</>
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                                                            <p className="text-sm text-emerald-800 font-medium">
                                                                List "{uploadTitle}" created with {uploadResult.accepted} prospects!
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {errors.process && <p className="text-red-500 text-center mt-4">{errors.process}</p>}
                                    {errors.upload && <p className="text-red-500 text-center mt-4">{errors.upload}</p>}

                                    {/* Simple Loading Indicator */}
                                    {isGeneratingTemplates && (
                                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                                <div>
                                                    <p className="font-medium text-blue-900">AI is generating templates...</p>
                                                    <p className="text-sm text-blue-600">{generationStatus || 'This may take 10-20 seconds'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={creativeEmail}
                                            onChange={(e) => setCreativeEmail(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 font-medium">Creative Email</span>
                                        <span className="text-xs text-gray-400 font-medium">(adds creative prompt style)</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <Button variant="ghost" onClick={() => setCurrentStep(2)} className="text-gray-500 hover:text-gray-900 px-0">
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Back
                                        </Button>
                                        <button
                                            onClick={() => processMutation.mutate()}
                                            disabled={processMutation.isPending || selectedLists.length === 0 || (uploadMode === 'upload' && !uploadConfirmed)}
                                            className="flex items-center gap-2 text-white font-semibold h-11 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                        >
                                            {processMutation.isPending
                                                ? <><Loader2 className="w-4 h-4 animate-spin" />Processing AI…</>
                                                : <><Sparkles className="w-4 h-4" />Process &amp; Generate Templates</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* STEP 4: Templates (AI-Generated per Persona) */}
                        {currentStep === 4 && (
                            <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                {!processingResult ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                                        <p className="text-slate-600 font-bold">Synchronizing AI Blueprints...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* — Gradient card header — */}
                                        <div className="px-8 py-5 flex items-center gap-4 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                                <Sparkles className="w-5 h-5" style={{ color: '#2d6bbf' }} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold !text-gray-900">Persona Blueprints</h2>
                                                <p className="text-gray-400 text-sm">AI classified {processingResult.total_prospects || 0} prospects into {processingResult.personas_detected?.length || 0} personas.</p>
                                            </div>
                                        </div>
                                        <div className="p-8">

                                            <div className="space-y-8">
                                                {/* Persona Buttons */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {(() => {
                                                        const detected = processingResult?.templates_generated || [];
                                                        // Always show all 5 canonical personas, plus OTHER if it was actually detected
                                                        // (OTHER is a classification fallback, not a deliberate target).
                                                        const otherDetected = detected.find(t => t.persona_type === 'OTHER');
                                                        const pickerList = [
                                                            ...(allPersonas || []),
                                                            ...(otherDetected ? [{ persona_type: 'OTHER', persona_label: otherDetected.persona_label || 'Other' }] : []),
                                                        ];
                                                        return pickerList.map((p) => {
                                                            const item = detected.find(t => t.persona_type === p.persona_type);
                                                            const isGenerating = generatePersonaMutation.isPending
                                                                && generatePersonaMutation.variables === p.persona_type;
                                                            return (
                                                                <button
                                                                    key={p.persona_type}
                                                                    onClick={() => {
                                                                        if (item) {
                                                                            setSelectedPersona(item.persona_type);
                                                                            const samples = processingResult.sample_prospects?.[item.persona_type] || [];
                                                                            setPreviewProspect(samples[0] || null);
                                                                        } else {
                                                                            generatePersonaMutation.mutate(p.persona_type);
                                                                        }
                                                                    }}
                                                                    disabled={!item && generatePersonaMutation.isPending}
                                                                    className="p-4 rounded-xl border-2 transition-all text-left disabled:opacity-60"
                                                                    style={selectedPersona === p.persona_type
                                                                        ? { borderColor: '#2d6bbf', background: 'rgba(45,107,191,0.04)' }
                                                                        : { borderColor: '#e5e7eb', background: '#fff' }}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={selectedPersona === p.persona_type
                                                                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                                                            : { background: '#f1f5f9', color: '#6b7280' }}>
                                                                            <User className="w-4 h-4" />
                                                                        </div>
                                                                        {item ? (
                                                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-green-100 text-green-700 rounded uppercase">AI Mode</span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase">Not Detected</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="font-bold text-gray-900 truncate">{p.persona_label}</p>
                                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mt-1">
                                                                        {isGenerating ? 'Generating…' : item ? `${item.prospect_count} Leads` : '0 Leads · Click to generate'}
                                                                    </p>
                                                                </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>

                                                {/* Template Preview */}
                                                {selectedPersona && getSelectedTemplate() && (
                                                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.05), rgba(115,200,210,0.05))' }}>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-base">{getSelectedTemplate()?.persona_label || selectedPersona} Sequence</p>
                                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{getSelectedTemplate()?.sequence_count || 1} Emails</p>
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setShowPreview(!showPreview)}
                                                                className="gap-2 font-bold border-2"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                {showPreview ? 'Static Code' : 'Live Preview'}
                                                            </Button>
                                                        </div>

                                                        {/* Email Step Tabs */}
                                                        <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto custom-scrollbar">
                                                            {(getSelectedTemplate()?.all_emails || [getSelectedTemplate()?.template]).map((email, idx) => {
                                                                const stepNum = email?.step_number || idx + 1;
                                                                const schedule = email?.schedule || `Day ${idx + 1}`;
                                                                return (
                                                                    <button
                                                                        key={stepNum}
                                                                        onClick={() => setSelectedEmailStep(stepNum)}
                                                                        className="px-4 py-1.5 text-xs font-black rounded-full transition-all whitespace-nowrap uppercase tracking-tighter"
                                                                        style={selectedEmailStep === stepNum
                                                                            ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', color: '#fff' }
                                                                            : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                                                                    >
                                                                        {schedule}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="p-6 space-y-6">
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Line</p>
                                                                    <div className="flex items-center gap-3">
                                                                        <button onClick={() => handleEdit('subject')} className="text-[10px] font-bold text-slate-500 hover:text-blue-600 uppercase">Edit</button>
                                                                        <button
                                                                            onClick={() => handleRegenerate('subject')}
                                                                            disabled={regenerating === 'subject'}
                                                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1 disabled:opacity-50"
                                                                        >
                                                                            {regenerating === 'subject' ? (
                                                                                <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                                                            ) : 'Regenerate'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {editing === 'subject' ? (
                                                                    // <div className="flex gap-2">
                                                                    //     <textarea
                                                                    //         value={editValue}
                                                                    //         onChange={(e) => setEditValue(e.target.value)}
                                                                    //         className="flex-1 w-full h-14 p-4 text-sm border-2 border-slate-100 rounded-xl focus:border-blue-500 focus:ring-0 overflow-auto"
                                                                    //         autoFocus
                                                                    //     />
                                                                    //     <Button size="sm" onClick={() => handleSaveEdit('subject')} className="bg-blue-600 text-white">Save</Button>
                                                                    //     <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                                                    // </div>
                                                                    <div className="space-y-2">
                                                                        <textarea
                                                                            value={editValue}
                                                                            onChange={(e) => setEditValue(e.target.value)}
                                                                            className="flex-1 w-full h-14 p-4 text-sm border-2 border-blue-600 rounded-xl focus:border-blue-600 focus:ring-0 focus:outline-none outline-none"
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                                                            <Button size="sm" onClick={() => handleSaveEdit('subject')} className="bg-blue-600 text-white">Save</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm font-bold text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                                        {showPreview && previewProspect
                                                                            ? substituteProspectData(getSelectedEmailFromSequence()?.subject, previewProspect)
                                                                            : getSelectedEmailFromSequence()?.subject
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Blueprint</p>
                                                                    <div className="flex items-center gap-3">

                                                                        <button onClick={() => handleEdit('body')} className="text-[10px] font-bold text-slate-500 hover:text-blue-600 uppercase">Edit</button>
                                                                        <button
                                                                            onClick={() => handleRegenerate('body')}
                                                                            disabled={regenerating === 'body'}
                                                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase flex items-center gap-1 disabled:opacity-50"
                                                                        >
                                                                            {regenerating === 'body' ? (
                                                                                <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                                                                            ) : 'Regenerate'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {editing === 'body' ? (
                                                                    <div className="space-y-3">
                                                                        <RichTextEditor
                                                                            value={editValue}
                                                                            onChange={setEditValue}
                                                                            minHeightClass="min-h-[16rem]"
                                                                            className="border-blue-600"
                                                                        />
                                                                        <div className="flex justify-end gap-2">
                                                                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                                                                            <Button size="sm" onClick={() => handleSaveEdit('body')} className="bg-blue-600 text-white">Save</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        className="text-sm text-gray-700 bg-gray-50 p-6 rounded-xl border border-gray-100 prose prose-sm max-w-none text-left"
                                                                        dangerouslySetInnerHTML={{
                                                                            __html: showPreview && previewProspect
                                                                                ? formatEmailBodyForPreview(getSelectedEmailFromSequence()?.body, previewProspect)
                                                                                : formatEmailBodyForPreview(getSelectedEmailFromSequence()?.body)
                                                                        }}
                                                                    />
                                                                )}

                                                                {/* Attachments (Gmail-style) */}
                                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Attachments</p>
                                                                    <AttachmentManager templateId={getSelectedEmailFromSequence()?.template_id} />
                                                                </div>
                                                            </div>

                                                            {/* Prospect Picker */}
                                                            {showPreview && getSampleProspects().length > 0 && (
                                                                <div className="pt-4 border-t border-slate-100">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Active Preview Data:</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {getSampleProspects().map((p, i) => (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => setPreviewProspect(p)}
                                                                                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${previewProspect?.prospect_id === p.prospect_id
                                                                                    ? 'bg-blue-500 text-white shadow-none'
                                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                                    }`}
                                                                            >
                                                                                {p.first_name} {p.last_name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {!selectedPersona && (
                                                    <div className="text-center py-16 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.1), rgba(115,200,210,0.1))' }}>
                                                            <Mail className="w-6 h-6" style={{ color: '#2d6bbf' }} />
                                                        </div>
                                                        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Select a persona to unlock blueprints</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100 flex justify-between items-center">
                                            <Button variant="ghost" onClick={() => setCurrentStep(3)} className="text-slate-500 hover:text-slate-900 px-0">
                                                <ArrowLeft className="w-4 h-4 mr-2" />
                                                Back
                                            </Button>
                                            <Button
                                                onClick={() => setCurrentStep(5)}
                                                disabled={!processingResult}
                                                className="text-white font-bold h-11 px-10 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                            >
                                                Finalize & Launch
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {/* STEP 5: Launch */}
                        {currentStep === 5 && (
                            <motion.div key="step5" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                                <div className="p-8">
                                    <div className="text-center mb-10">
                                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                            style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}>
                                            <Rocket className="w-9 h-9 text-white" />
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-900">Mission Ready</h2>
                                        <p className="text-gray-400 mt-2 text-sm">Verify your configuration one last time before deployment.</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.06), rgba(115,200,210,0.06))' }}>
                                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                                        <Rocket className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                                                    </div>
                                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Deployment Specs</p>
                                                </div>
                                                <div className="p-5 space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-bold text-gray-500">Project</span>
                                                        <span className="font-bold text-gray-900">{formData.campaign_name}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-bold text-gray-500">Target Audience</span>
                                                        <span className="font-bold text-gray-900">{processingResult?.total_prospects || 0} Leads</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-bold text-gray-500">Identity Nodes</span>
                                                        <span className="font-bold text-gray-900">{formData.inbox_ids.length} Inboxes</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="font-bold text-gray-500">Persona Types</span>
                                                        <span className="font-bold text-gray-900">{processingResult?.personas_detected?.length || 0} Segments</span>
                                                    </div>
                                                    {formData.daily_batch_size && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="font-bold text-gray-500">Daily Batch</span>
                                                            <span className="font-bold text-blue-600">{formData.daily_batch_size} contacts/day</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                                <div className="px-5 py-3 flex items-center gap-3 border-b border-gray-100" style={{ background: 'linear-gradient(90deg, rgba(115,200,210,0.08), rgba(45,107,191,0.06))' }}>
                                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(115,200,210,0.2), rgba(45,107,191,0.15))' }}>
                                                        <Globe className="w-3.5 h-3.5" style={{ color: '#4db0bb' }} />
                                                    </div>
                                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Sending Window</p>
                                                </div>
                                                <div className="p-5 space-y-2">
                                                    {formData.start_date && (
                                                        <p className="text-sm font-bold" style={{ color: '#2d6bbf' }}>
                                                            Campaign Begins: <span className="font-black">
                                                                {new Date(formData.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </p>
                                                    )}
                                                    <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                                        {formData.sending_mode === 'spread' && <>
                                                            Spread evenly <span className="font-black text-gray-900">{formData.send_window_start} – {formData.send_window_end || '(open)'}</span>
                                                            {formData.min_gap_minutes > 0 && <>, max {formData.min_gap_minutes} min gap</>}
                                                        </>}
                                                        {formData.sending_mode === 'random' && <>
                                                            Random within <span className="font-black text-gray-900">{formData.send_window_start} – {formData.send_window_end || '(open)'}</span>
                                                            {formData.min_gap_minutes > 0 && <>, {formData.min_gap_minutes} min gap</>}
                                                        </>}
                                                        {formData.sending_mode === 'batch' && <>
                                                            Batches of <span className="font-black text-gray-900">{formData.batch_size || '?'}</span>, every <span className="font-black text-gray-900">{formData.batch_gap_minutes} min</span>
                                                            <>, window {formData.send_window_start} – {formData.send_window_end || '(open)'}</>
                                                        </>}
                                                        <br />
                                                        <span className="text-xs text-gray-500 font-medium">Timezone: {TIMEZONE_OPTIONS.find(tz => tz.value === formData.campaign_timezone)?.shortLabel || formData.campaign_timezone.replace(/_/g, ' ')}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {formData.daily_batch_size && (() => {
                                                const batchSize = formData.daily_batch_size;
                                                const total = processingResult?.total_prospects || 0;
                                                const totalDays = total > 0 ? Math.ceil(total / batchSize) : null;
                                                const previewDays = totalDays ? Math.min(totalDays, 5) : 3;
                                                return (
                                                    <div className="border border-blue-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(45,107,191,0.08)' }}>
                                                        <div className="px-5 py-3 flex items-center gap-3 border-b border-blue-100" style={{ background: 'linear-gradient(90deg, rgba(45,107,191,0.07), rgba(115,200,210,0.06))' }}>
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(45,107,191,0.15), rgba(115,200,210,0.15))' }}>
                                                                <Calendar className="w-3.5 h-3.5" style={{ color: '#2d6bbf' }} />
                                                            </div>
                                                            <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Daily Batch Schedule</p>
                                                            {totalDays && <span className="ml-auto text-[10px] font-bold text-blue-500">{totalDays} days total</span>}
                                                        </div>
                                                        <div className="p-4 space-y-2">
                                                            {Array.from({ length: previewDays }).map((_, i) => {
                                                                const start = i * batchSize + 1;
                                                                const end = total > 0 ? Math.min((i + 1) * batchSize, total) : (i + 1) * batchSize;
                                                                return (
                                                                    <div key={i} className="flex items-center justify-between text-xs">
                                                                        <span className="font-bold text-gray-500">Day {i + 1}</span>
                                                                        <span className="font-bold text-gray-900">
                                                                            Contacts {start}–{end}
                                                                            {total > 0 && <span className="ml-1 text-gray-400">({end - start + 1})</span>}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {totalDays && totalDays > previewDays && (
                                                                <p className="text-[10px] text-gray-400 font-medium pt-1">
                                                                    + {totalDays - previewDays} more day{totalDays - previewDays > 1 ? 's' : ''} ({total} contacts total)
                                                                </p>
                                                            )}
                                                            {!total && (
                                                                <p className="text-[10px] text-gray-400 font-medium">
                                                                    Exact schedule calculated at launch based on enrolled contacts.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Sequence Timeline</p>
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                {sequenceSteps.map((step, index) => {
                                                    const scheduleItem = schedulePreview.find(s => s.step_number === step.step_number);
                                                    const dateStr = scheduleLoading ? 'Calculating...' : (scheduleItem?.formatted || 'TBD');

                                                    return (
                                                        <div key={index} className="flex gap-4 items-center">
                                                            <div className="w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold text-sm"
                                                            style={index === 0
                                                                ? { background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)', borderColor: 'transparent', color: '#fff' }
                                                                : { background: '#fff', borderColor: '#e5e7eb', color: '#9ca3af' }}>
                                                                {step.step_number}
                                                            </div>
                                                            <div className="flex-1 bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center">
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-900 uppercase tracking-tighter">{step.type}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                                                        {index === 0 ? 'Immediate Launch' : `Day ${step.wait_days} Interval`}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xs font-bold text-blue-600 uppercase">{dateStr}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {errors.launch && (
                                        <p className="text-red-500 text-center mt-6 text-sm font-medium">{errors.launch}</p>
                                    )}
                                </div>

                                <div className="px-8 py-6 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCurrentStep(4)}
                                        className="text-slate-500 hover:text-slate-900 px-0"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Edit
                                    </Button>
                                    <Button
                                        onClick={() => { setErrors(prev => ({ ...prev, launch: undefined })); launchMutation.mutate(); }}
                                        isLoading={launchMutation.isPending}
                                        disabled={launchMutation.isPending}
                                        className="h-14 px-10 text-lg font-black uppercase tracking-widest text-white rounded-xl transition-all hover:scale-[1.005] active:scale-[0.998] hover:shadow-lg" style={{ background: 'linear-gradient(135deg, #2d6bbf, #73C8D2)' }}
                                    >
                                        <Rocket className="w-6 h-6 mr-3" />
                                        Execute Campaign
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </main>
            </div>
        </PageTransition>
    );
}
