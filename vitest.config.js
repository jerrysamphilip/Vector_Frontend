// Unit tests (Vitest + Testing Library, jsdom). Reuses the Vite config (React plugin, base path).
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.js'],
        include: ['src/**/*.test.{js,jsx}'],
        css: false,
        restoreMocks: true,
    },
}));
