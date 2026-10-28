# Changelog

All notable changes to the Outreach 360 web app. The release number is `version` in `package.json` (and the
root of `package-lock.json`); it matches the backend's `VERSION` for the same release. CI
(`npm run version:check`, `scripts/check-version.mjs`) fails when the version references disagree.
Format: [Keep a Changelog](https://keepachangelog.com/), versions follow [SemVer](https://semver.org/).

## [1.1.0] - Unreleased

Release candidate for BRD v2.0 Phase 1 (R1.0) and Phase 2 (R2.1), released together with backend 1.1.0.

### Added
- Custom property safety (C-17): contact and company property settings list deactivated properties
  (`?include_inactive=true`) marked "Inactive" with Reactivate; Delete is now "Deactivate" (saved values are kept and
  still exported) and is not offered for system properties; properties can be edited (label, group, required,
  choices, maximum length) with the data type locked; renamed choices keep their stored values (options sent as
  `{value, label}`); new types Yes / No (BOOLEAN) and Long text (LONG_TEXT); `max_length` for text properties (up to
  1000 / 10000) enforced on record forms, with the server's 400 message shown. Pickers, filters and record pages show
  choice labels and store values (`src/lib/customProperties.js`).
- Mailboxes show when reply reading (IMAP) is derived from the SMTP settings or not set up (`imap_configured`,
  `imap_derived_from_smtp`), on the list, the detail and the IMAP test result (S-26).
- Sending-domain DNS records compared with live DNS (S-25): per record OK / Add / Update / Unknown (icon and word),
  what DNS has now, the value to publish with a copy button (SPF merged into the existing record), the summary and
  when DNS was checked.
- Field validation and normalisation on contact, company and campaign sender forms (`src/lib/fieldValidation.js`):
  names, e-mail, international phone, LinkedIn/website/CTA links (https, no script schemes), country/state/postal
  code, revenue, column lengths, no HTML; server 422 errors shown on their fields.
- Every dialog runs on the Radix-based DialogPanel; the hand-rolled focus trap (useDialog / activateModal) is gone and
  the mobile nav drawer uses Radix FocusScope / DismissableLayer.
- Campaign editor after launch (`/app/campaigns/:id/edit`): steps, persona versions, preview as a real contact,
  sender/window/inboxes, "N unsent emails will be updated" before saving; Settings tab editable for active campaigns.
- Companies: saved views, column chooser, archived filter, custom properties, backfill preview/run/undo, export.
- Duplicate review page, merge preview, contact e-mail history and merge history, export log (admins).
- Import wizard with live progress and cancel; import history.
- Toasts and confirm dialogs replace window.alert/confirm; friendly error text with request reference; 22 pages that
  showed an empty state or spun forever on a failed load now show the error with Retry.
- One auth context (`src/auth`): session from /api/auth/me, single-flight refresh, idle warning before the 30-minute
  limit, sign-out across tabs; one shared read hook (`src/lib/useApiQuery.js`) with request cancellation.
- Dialogs, menus and tabs on Radix UI primitives (@radix-ui/react-dropdown-menu, -tabs, -focus-scope,
  -dismissable-layer; MIT); render tests for all 49 pages.
- Campaigns list paging (page size 10/20/50/100); dashboard totals and automation pickers read every
  campaign (`campaignApi.listAll`), no longer only the first 20.
- Load-error panel with request reference and Retry on list and detail pages (a 500 no longer looks like
  "No contacts yet" or "not found"); bulk edit/delete in the list modal reports "X of Y" and keeps failed rows selected.
- CSV cells guarded against spreadsheet formula injection (`src/lib/csv.js`); report date ranges use the local
  calendar date instead of UTC (`src/lib/dates.js`).
- CI gates (backend `docs/CI_GATES.md`): help anchors test (W-13, `src/help/helpAnchors.test.js`: every
  in-app route has a help article and every help link resolves), release identity check, blocking
  `npm audit` (high and critical) with a dated ignore list in `ci/npm_audit_ignore.txt`.
- Session idle timeout: the app reports real user activity on token refresh and explains why a session ended.
- CRM KPIs card (BRD section 8) and forecast accuracy shown as actual vs committed.
- Multi-company contacts, @mentions, KPI cards, deals on contact and company pages, purge, 404 page.
- Cookie sessions, two-factor sign-in and the account security page.
- Platform admin console views; responsive drawer navigation.

### Changed
- Refactor: large pages split into components and hooks; every API call goes through `src/api`; Vitest and
  ESLint added and run in CI before the build.
- Removed the unused legacy UI copy (`src - ExistUI`).

### Fixed
- UAT time zones: API times without a zone were read as the browser's local time, so a bounce at 17:54 UTC
  showed as 05:54 PM in every zone. `src/lib/dates.js` (`parseApiDate`, `formatDateTime`, `formatTime`,
  `formatDate`) reads them as UTC and shows the viewer's zone with its abbreviation (1:54 PM EDT); about 20
  screens use it (inbox, schedule, trigger logs, mailboxes, charts, lead detail). Date-only chart buckets are
  local calendar days, so Oct 26 no longer shows under "Oct 25" and Nov 1 no longer lands in October.
- Bounce "Delivery Failed" notes show as bounces, not replies (inbox list badge, thread, no "Create lead").
- UAT campaign analytics labels: "Enrolled" (was "Total Leads Contacted"), "Emails sent (incl. bounced)"
  (was "Contacts enrolled"), "In sequence" (was "In Progress"), "Opened (unique)", rates name their
  denominator ("of delivered" / "of sent"), "Mailbox Sends Today / Capacity" (all campaigns, since 00:00 UTC);
  tooltips on every tile and campaign list column. Open and reply rates are over delivered emails on the
  campaign page and dashboard, matching the backend.
- Accessible dialogs on all overlays (focus trap, labels), login field labels, return to the page after sign-in,
  suspended-account handling, template library errors.
- Broken API calls found by the frontend/backend contract check; structured error details kept so duplicate
  contact/lead 409s link to the existing record; company revenue and number custom fields save correctly.

## [0.0.0]

Unversioned builds before 1.1.0.

## Release checklist

1. Set `version` in `package.json` and both version fields at the top of `package-lock.json` to the backend
   `VERSION`; move the `Unreleased` entries under the number with today's date (CI: `npm run version:check`).
2. `npm run lint`, `npm run test` (includes the help anchors test) and `npm run build` pass (CI).
3. `npm run audit:check` passes: no unreviewed high/critical advisory, no ignore entry past its review date (CI).
4. The backend route contract check passes against this commit (backend CI job "Route contract").
5. Help articles updated for every new or renamed screen (the help anchors test fails otherwise).
6. Tag the repository `v<version>` on the deployed commit and tag the image with the same number.
