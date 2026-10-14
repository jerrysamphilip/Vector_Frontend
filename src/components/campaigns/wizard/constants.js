// Shared constants of the create-campaign wizard.

export const INITIAL_FORM_DATA = {
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

export const INITIAL_SEQUENCE_STEPS = [
    { step_number: 1, wait_days: 0, type: 'Initial Email' },
];

export const MAX_SEQUENCE_STEPS = 7;

export const WIZARD_STEPS = [
    { n: 1, label: 'Details' },
    { n: 2, label: 'Sequence' },
    { n: 3, label: 'Prospects' },
    { n: 4, label: 'Templates' },
    { n: 5, label: 'Launch' },
];

/** framer-motion variants for the step cards (slide in from the right, out to the left). */
export const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

/** Rows per page of the embedded list-prospects table (step 3). */
export const PROSPECT_PAGE_SIZE = 10;
