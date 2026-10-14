# Outreach 360 frontend

React 19 + Vite single-page app for Outreach 360 (campaigns, contacts, sales pipeline, deliverability).

```bash
npm ci
npm run dev        # http://localhost:5173, /api proxied to API_PROXY_TARGET (default http://localhost:8000)
npm run build      # dist/; BASE_PATH=/vector/ npm run build to serve under /vector
npm run test       # unit tests (Vitest + Testing Library)
npm run lint       # ESLint
```

The app is JavaScript (JSX). There is no TypeScript build step: `jsconfig.json` only configures editors
(`checkJs` off).

See [docs/FRONTEND.md](docs/FRONTEND.md) for the folder structure, data fetching through `src/api` and TanStack Query,
dialog / accessibility conventions (`useDialog`, `DialogPanel`) and testing.
