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

## Release checklist (deployment hardening)

- **P-2 image pins.** Before each release refresh the base-image digests and commit them:
  `python3 scripts/pin_images.py` (add `PIN_MIRROR=mirror.gcr.io` if Docker Hub rate-limits; the
  digests are identical). `python3 scripts/pin_images.py --check` (run by CICD.yaml) fails on any
  `FROM` / `image:` line without `@sha256:`. `<ECR_IMAGE_URI>` in `manifests/deployment.yaml` is
  replaced by CI with the pushed image by digest and re-checked with `--check --strict`.
- **P-1 container.** The runtime is `nginxinc/nginx-unprivileged` (uid 101, port 8080; the Service
  keeps port 80) on a read-only root filesystem; only `/tmp` and `/var/cache/nginx` are writable
  (emptyDir). Anything new nginx must write goes under `/tmp` (see `nginx.conf`).
- **P-3 network.** `manifests/networkpolicy.yaml` is applied when the repository variable
  `APPLY_NETWORK_POLICIES=true` (decision record: Vector_Backend `docs/adr/0008-internal-transport.md`).
- `src/test/manifests.test.js` enforces all three in `npm run test`. Backend checklist:
  Vector_Backend `docs/RELEASE.md`.
