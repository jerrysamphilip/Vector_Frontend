import { matchPath } from 'react-router-dom';
import { ARTICLES, CATEGORIES } from './articles';

export { ARTICLES, CATEGORIES };

export const articleById = (id) => ARTICLES.find(a => a.id === id);

/** The article for the screen at this path (most specific route wins), else the getting-started guide. */
export function articleForPath(pathname) {
    const path = pathname.replace(/^\/vector/, '');
    let best = null;
    for (const a of ARTICLES) {
        for (const pattern of a.routes || []) {
            if (matchPath({ path: pattern, end: true }, path)) {
                const score = pattern.split('/').length + (pattern.includes(':') ? 0 : 0.5);
                if (!best || score > best.score) best = { article: a, score };
            }
        }
    }
    return best?.article || articleById('getting-started');
}

function text(article) {
    const parts = [article.title, article.summary, ...(article.keywords || [])];
    for (const b of article.body || []) {
        if (b.h) parts.push(b.h);
        if (b.p) parts.push(b.p);
        if (b.tip) parts.push(b.tip);
        if (b.note) parts.push(b.note);
        (b.steps || b.list || []).forEach(x => parts.push(typeof x === 'string' ? x : `${x.term} ${x.text}`));
    }
    return parts.join(' ').toLowerCase().replace(/\*\*/g, '');
}
const INDEX = ARTICLES.map(a => ({ a, title: a.title.toLowerCase(), all: text(a) }));

/** Simple ranked search: every word must appear; title matches rank first. */
export function searchHelp(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return INDEX
        .filter(x => words.every(w => x.all.includes(w)))
        .map(x => ({ article: x.a, score: words.reduce((s, w) => s + (x.title.includes(w) ? 3 : 1), 0) }))
        .sort((a, b) => b.score - a.score)
        .map(x => x.article);
}

/** The screen an article describes, when it has one without parameters. */
export const screenPathFor = (article) => (article.routes || []).find(r => !r.includes(':'));
