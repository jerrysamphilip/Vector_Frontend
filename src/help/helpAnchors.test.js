// W-13 help anchors (NTS Build Standard Addendum): every screen of the app has its own help article, and
// every link inside the help library resolves. Runs in CI with the other Vitest suites (npm run test).
import { describe, expect, it } from 'vitest';
import { matchPath } from 'react-router-dom';
import appSource from '../App.jsx?raw';
import helpPanelSource from './HelpPanel.jsx?raw';
import helpIndexSource from './helpIndex.js?raw';
import helpCenterSource from '../pages/HelpCenter.jsx?raw';
import { ARTICLES, CATEGORIES, articleById } from './helpIndex';

// Screens outside the in-app layout (no help panel is mounted there) and catch-alls.
const NO_HELP_PANEL = new Set(['/', '/login', '/forgot-password', '/reset-password', '/accept-invite',
    '/magic-login', '/set-password', '/admin', '/admin/tenants', '/admin/users', '/admin/security']);
// /app routes that intentionally share the general guide. Keep this list empty unless a screen really has
// nothing to explain; every entry needs a reason.
const SHARED_GUIDE = {
    '/app': 'layout route; its index redirects to /app/dashboard',
    '/app/test-automation': 'development-only screen (import.meta.env.DEV), not shipped',
};

/** Full paths of every <Route path="..."> in App.jsx; nested paths are joined to their layout route. */
function appRoutes() {
    const out = [];
    const layouts = [];
    const re = /<Route\b[^>]*?\bpath="([^"]+)"/gs;
    for (let m = re.exec(appSource); m; m = re.exec(appSource)) {
        const p = m[1];
        if (p.startsWith('/')) {
            out.push(p);
            if (p !== '/') layouts.push({ path: p, at: m.index });
        } else {
            const parent = [...layouts].reverse().find((l) => l.at < m.index);
            out.push(`${parent ? parent.path : ''}/${p}`);
        }
    }
    return out.filter((p) => !p.endsWith('*'));
}

const sample = (pattern) => pattern.replace(/:[A-Za-z]+/g, '123');
const explicitArticleFor = (path) => ARTICLES.find((a) => (a.routes || []).some((r) => matchPath({ path: r.split('?')[0], end: true }, path)));

describe('help anchors (W-13)', () => {
    const routes = appRoutes();

    it('finds the app routes', () => {
        expect(routes).toContain('/app/dashboard');
        expect(routes).toContain('/app/contacts/:id');
        expect(routes.length).toBeGreaterThan(40);
    });

    it('every in-app screen has a help article that names its route', () => {
        const missing = routes
            .filter((p) => !NO_HELP_PANEL.has(p) && !SHARED_GUIDE[p])
            .filter((p) => !explicitArticleFor(sample(p)));
        expect(missing, `routes without a help article (add the route to an article's routes): ${missing.join(', ')}`).toEqual([]);
    });

    it('the exceptions lists only name real routes', () => {
        const stale = [...NO_HELP_PANEL, ...Object.keys(SHARED_GUIDE)].filter((p) => !routes.includes(p));
        expect(stale).toEqual([]);
    });

    it('every route an article claims exists in App.jsx', () => {
        const bad = [];
        for (const a of ARTICLES) {
            for (const r of a.routes || []) {
                if (!routes.some((p) => matchPath({ path: p, end: true }, sample(r.split('?')[0])))) bad.push(`${a.id}: ${r}`);
            }
        }
        expect(bad).toEqual([]);
    });

    it('article ids are unique and categories are known', () => {
        const ids = ARTICLES.map((a) => a.id);
        expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
        expect(ARTICLES.filter((a) => !CATEGORIES.includes(a.category)).map((a) => a.id)).toEqual([]);
        ARTICLES.forEach((a) => {
            expect(a.title, a.id).toBeTruthy();
            expect(a.id, a.id).toMatch(/^[a-z0-9-]+$/);
        });
    });

    it('every related link resolves to an article', () => {
        const broken = ARTICLES.flatMap((a) => (a.related || []).filter((id) => !articleById(id)).map((id) => `${a.id} -> ${id}`));
        expect(broken).toEqual([]);
    });

    it('every article id hard-coded in the help UI exists', () => {
        const src = [helpPanelSource, helpIndexSource, helpCenterSource].join('\n');
        const ids = [...src.matchAll(/(?:articleById|openHelp)\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
        const links = [...src.matchAll(/\/app\/help\/([a-z0-9-]+)/g)].map((m) => m[1]);
        expect(ids.length).toBeGreaterThan(0);
        expect([...ids, ...links].filter((id) => !articleById(id))).toEqual([]);
    });

    it('every "See …" cross-reference names an article title or a heading', () => {
        const titles = new Set(ARTICLES.map((a) => a.title.toLowerCase()));
        const headings = new Set(ARTICLES.flatMap((a) => (a.body || []).filter((b) => b.h).map((b) => b.h.toLowerCase())));
        const text = (a) => [a.summary, ...(a.body || []).flatMap((b) => [b.p, b.tip, b.note, ...(b.steps || []),
            ...(b.list || []).map((x) => (typeof x === 'string' ? x : x.text))])].filter(Boolean).join('\n');
        const broken = [];
        for (const a of ARTICLES) {
            for (const m of text(a).matchAll(/\b[Ss]ee "([^"]+)"/g)) {
                const ref = m[1].toLowerCase();
                if (!titles.has(ref) && !headings.has(ref)) broken.push(`${a.id}: "${m[1]}"`);
            }
        }
        expect(broken).toEqual([]);
    });
});
