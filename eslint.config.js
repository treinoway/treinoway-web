import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import { defineConfig, globalIgnores } from 'eslint/config'
import local from './eslint-rules/index.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' }],
      'react/prop-types': 'warn',
      'react/self-closing-comp': 'warn',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'error',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    files: ['playwright.config.js', 'e2e/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['src/contexts/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Comment conventions (see CLAUDE.md). Pre-existing violations are frozen in eslint-suppressions.json; only new ones fail.
  {
    files: ['**/*.{js,jsx}'],
    plugins: { local },
    rules: {
      'local/function-header-comment': 'error',
      'local/no-comments-in-function': 'error',
      'local/disable-requires-reason': 'error',
    },
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['**/*.test.{js,jsx}', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[property.name='message'][object.property.name='data'][object.object.property.name='response']",
          message: 'Read error.userMessage (set by the Axios interceptor), never error.response.data.message.',
        },
        {
          selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
          message: 'Use the app confirm dialog component, never window.confirm.',
        },
      ],
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'axios', message: 'Use the shared instance from src/api/axios.js.' }] },
      ],
    },
  },
  {
    files: ['src/api/axios.js'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
