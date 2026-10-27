# Changelog

All notable changes to the Outreach 360 web app. The release number is `version` in `package.json` (and the
root of `package-lock.json`); it matches the backend's `VERSION` for the same release. CI
(`npm run version:check`, `scripts/check-version.mjs`) fails when the version references disagree.
Format: [Keep a Changelog](https://keepachangelog.com/), versions follow [SemVer](https://semver.org/).

## [1.1.0] - Unreleased

Release candidate for BRD v2.0 Phase 1 (R1.0) and Phase 2 (R2.1), released together with backend 1.1.0.

### Added
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
