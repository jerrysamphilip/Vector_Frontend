// Vitest setup: jest-dom matchers, DOM clean-up between tests, and layout stubs jsdom lacks.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
    localStorage.clear();
    document.cookie.split('; ').filter(Boolean).forEach((c) => {
        document.cookie = `${c.split('=')[0]}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
});

// jsdom does no layout: every element reports no client rects, which the dialog focus helpers (ui/focus.js) read as "not visible".
// Report one rect so focusable controls count as rendered.
if (!Element.prototype.__rectsStubbed) {
    Element.prototype.getClientRects = function getClientRects() { return [{ width: 1, height: 1 }]; };
    Element.prototype.__rectsStubbed = true;
}

// framer-motion / charts may query these
if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}

// Radix UI popups (menus) measure their trigger with ResizeObserver, which jsdom lacks
if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
