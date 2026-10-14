// ESLint flat config: recommended JS rules + React (JSX scope/usage) + React Hooks.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['dist/**', 'node_modules/**', 'src - ExistUI/**', 'docker/**', 'manifests/**', 'public/**'] },
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: { ...globals.browser },
        },
        plugins: { react, 'react-hooks': reactHooks },
        settings: { react: { version: 'detect' } },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
        },
    },
    {
        files: ['vite.config.js', 'vitest.config.js', 'eslint.config.js'],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ['src/**/*.test.{js,jsx}', 'src/test/**'],
        languageOptions: { globals: { ...globals.node } },
    },
];
