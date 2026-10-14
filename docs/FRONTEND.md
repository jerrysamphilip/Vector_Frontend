# Outreach 360 frontend

React 19 + Vite 7, JavaScript (JSX), TanStack Query for server state, Tailwind CSS 4, React Router 7.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173; `/api` is proxied to `API_PROXY_TARGET` (default `http://localhost:8000`) |
| `npm run build` | Production build into `dist/` (`BASE_PATH=/vector/ npm run build` serves the app under `/vector`) |
| `npm run test` | Unit tests once (Vitest + Testing Library, jsdom) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run lint` | ESLint (recommended JS rules, React, React Hooks) |

The end-to-end Playwright suites live in the backend repository (`system_tests/ui_*`) and run against the live stack.

## Folder structure

```
src/
  main.jsx, App.jsx        entry point and routes (pages are lazy-loaded)
  api/                     all HTTP: one module per backend area, built on the shared client in http.js
  lib/                     framework-free helpers (auth storage, safe return paths, sales hierarchy, sanitising)
  pages/                   one component per route; large pages are thin orchestrators
  components/
    common/                cross-cutting pieces: useDialog, DialogPanel, Loading, ErrorBoundary, RichTextEditor ...
    ui/                    design-system primitives (Button, Card, Input, KpiTile ...)
    layout/                app shell: Layout, Sidebar, Header, AdminLayout, mobile nav drawer
    campaigns/wizard/      create-campaign wizard: one component per step + useCreateCampaignWizard and its hooks
    campaigns/tabs/        campaign detail tabs (tabs/inbox/ holds the inbox tab's panes and useCampaignInbox)
    inbox/accounts/        Email Accounts page sections, dialogs and useEmailAccounts
    dashboard/, reports/, team/, platformAdmin/, prospects/listModal/
                           sections and the page hook (use<Page>.js) of the matching page
  help/                    in-app help articles
  test/setup.js            Vitest setup (jest-dom matchers, jsdom layout stubs)
```

### Pages, hooks and sections

A large page keeps three layers:

1. **Hook** (`use<Page>.js`, next to its sections): state, queries, mutations and handlers. Separate concerns get
   their own hook (for example the wizard's `useCampaignDraft`, `useProspectUpload`, `useTemplateEditor`,
   `useWizardMutations`), composed by the page hook.
2. **Sections** (`components/<area>/*.jsx`): presentational components. Most take the page hook's return value as a
   single prop (`wizard`, `accounts`, `dashboard`, `team`, `admin`, `inbox`, `modal`) and destructure what they use, so
   a section can be rendered in a test with a plain object.
3. **Page** (`pages/<Page>.jsx`): calls the hook and lays out the sections (the split pages are each under 150 lines).

Pure logic (formatting, token substitution, date ranges) lives in plain `.js` modules so it can be unit-tested
without rendering.

## Data fetching

- **Every HTTP call goes through `src/api/`.** Components never import `axios` or call `fetch`; they call a function
  such as `campaignApi.get(id)`, `inboxesApi.sync(id)` or `uploadsApi.validateFile(file)`.
- `src/api/http.js` exports the shared axios clients (`apiClient` for `/api/...`, `apiV1Client` for `/api/api/...`).
  They apply, for every request:
  - cookie auth (`withCredentials`, `X-Auth-Mode: cookie`; no token is ever readable by JavaScript),
  - the `X-CSRF-Token` header (from the `csrf_token` cookie) on state-changing requests,
  - one silent session refresh on 401, then a redirect to `/login?reason=expired&next=<current page>`,
  - a redirect to `/login?reason=suspended` when the workspace was suspended (403 "Tenant suspended"),
  - the MFA-setup redirect on 403 `MFA_SETUP_REQUIRED`,
  - error normalisation: a FastAPI validation list becomes readable text in `error.response.data.detail`; a structured
    `{code, message, ...}` detail becomes `detail` (the message) + `code`, with the full object kept in `detail_data`.
  Pass `{ skipAuth: true }` in the request config for calls that must not refresh or redirect (sign-in forms).
- API functions return `response.data`. Show errors with `err.response?.data?.detail` (or `errorMessage(err)` from
  `api/contacts.js`).
- Server state is read with TanStack Query (`useQuery` / `useMutation`); after a mutation, invalidate the affected
  query keys (e.g. `['campaigns']`, `['inboxes']`, `['prospect-lists']`) instead of patching local copies.
- The `?next=` return path is validated by `lib/returnTo.js` (`safeReturnPath`): only internal `/app` and `/admin`
  paths are accepted, so it cannot be used as an open redirect.

## Dialogs and accessibility

- Every overlay dialog uses `useDialog` (`components/common/useDialog.js`) or its wrapper `DialogPanel`:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the dialog title,
  - focus moves into the dialog when it opens (first form field, else first control),
  - Tab / Shift+Tab are trapped inside; focus that escapes to the page behind is pulled back,
  - Escape closes it (pass `closeOnEscape={false}` for dialogs that must not be dismissed, e.g. a one-time link),
  - focus returns to the control that opened it (`returnFocusRef` when that control is gone),
  - with nested dialogs only the top-most reacts to Escape and Tab.
- Hand-built overlay: render `<DialogPanel onClose={...} labelledBy="my-title">` as the panel inside the backdrop and
  give the title `id="my-title"`; use `as={motion.div}` for animated panels. Custom panels spread
  `dialogProps` from `useDialog({ onClose })` and put `titleId` on the title.
- Icon-only buttons need an `aria-label` (e.g. `aria-label="Close"`); form fields need a `<label>` or `aria-label`.
  The Playwright suites select by role, label and text, so keep those stable when changing markup.

## Testing

- `npm run test` runs `src/**/*.test.{js,jsx}` with Vitest in jsdom (config: `vitest.config.js`, which reuses
  `vite.config.js`; setup: `src/test/setup.js`).
- Prefer Testing Library queries by role / label / text and `@testing-library/user-event` for interaction.
- Unit tests cover the return-path guard, the sales hierarchy rules, the HTTP client (error normalisation, CSRF,
  suspended / expired handling, refresh-and-retry), the API modules' endpoints, money formatting, `useDialog` /
  `DialogPanel` behaviour, the wizard's preview / timezone helpers and wizard step components.
- To test an API call, set `apiClient.defaults.adapter` to a function that records the request config and returns a
  response; to stub navigation, `vi.stubGlobal('location', { pathname, search, hash, assign: vi.fn() })`.

## JavaScript, not TypeScript

The app is plain JavaScript. The Vite starter's TypeScript files and `tsconfig.json` were removed, and the build no
longer runs `tsc` (it type-checked nothing but the unused starter files). `jsconfig.json` only gives editors module
resolution and JSX settings for `src/` (`checkJs` is off).
