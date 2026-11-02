import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Same style rules as apps/api, so both workspaces read alike, plus React and React Hooks.
// Formatting comes from @stylistic only: a second formatter would fight these rules.

const styleRules = {
  'curly': ['error', 'all'],
  '@stylistic/brace-style': [
    'error',
    '1tbs',
    { allowSingleLine: true },
  ],
  '@stylistic/semi': ['error', 'always'],
  '@stylistic/space-infix-ops': 'error',
  '@stylistic/space-before-function-paren': ['error', 'always'],
  '@stylistic/space-before-blocks': 'error',
  '@stylistic/function-call-spacing': 'error',
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/object-property-newline': [
    'error',
    { allowAllPropertiesOnSameLine: false },
  ],
  '@stylistic/array-bracket-newline': ['error', 'consistent'],
  '@stylistic/array-element-newline': ['error', 'consistent'],
  '@stylistic/comma-dangle': ['warn', 'always-multiline'],
  '@stylistic/padding-line-between-statements': [
    'warn',
    {
      blankLine: 'always',
      prev: '*',
      next: ['return', 'export'],
    },
  ],
  '@stylistic/max-len': [
    'error',
    {
      code: 120,
      ignoreUrls: true,
    },
  ],
  '@stylistic/indent': ['error', 2],
  '@stylistic/quotes': ['error', 'single'],
  '@stylistic/jsx-quotes': ['error', 'prefer-double'],
  'import/newline-after-import': [
    'error',
    { count: 1 },
  ],
  '@stylistic/object-curly-newline': [
    'error',
    {
      ImportDeclaration: {
        multiline: true,
        minProperties: 2,
      },
    },
  ],
};

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.expo/**', 'expo-env.d.ts', 'android/**', 'ios/**'],
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.es2022,
        ...globals.jest,
        __DEV__: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@stylistic': stylistic,
      'import': importPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...styleRules,
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // No user-facing string in JSX: every one goes through a translation key.
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: true,
        },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true },
      ],
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { args: 'none' },
      ],
      'prefer-const': 'error',
      'no-console': 'warn',
    },
  },
  {
    // Catalogues are prose: a sentence stays on one line however long it is.
    files: ['src/lib/i18n/locales/**/*.ts'],
    rules: {
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          ignoreStrings: true,
        },
      ],
    },
  },
  {
    // Node-side config files.
    files: ['*.config.js', 'metro.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
