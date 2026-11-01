import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import securityNode from 'eslint-plugin-security-node';
import globals from 'globals';

// The rule set below is the legacy `.eslintrc.js` one, ported as-is to the ESLint 9 flat config.
// Formatting rules come from `@stylistic` because ESLint 9 deprecates its core formatting rules
// and ESLint 10 removes them; the rule names and options are otherwise unchanged.
// `eslint-plugin-nestjs` (unmaintained since 2019, legacy config only) has been dropped; the
// four `warn`-level rules it provided (`parse-int-pipe`, `deprecated-api-modules`,
// `use-dependency-injection`, `use-validation-pipe`) have no replacement.

const typescriptRules = {
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    { allowExpressions: true },
  ],
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    { args: 'none' },
  ],
  '@typescript-eslint/no-use-before-define': 'error',
};

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
    { blankLine: 'always',
      prev: '*',
      next: ['return', 'export'] },
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
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'temp/**'],
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  promisePlugin.configs['flat/recommended'],
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.jest,
      },
    },
    plugins: {
      '@stylistic': stylistic,
      'security-node': securityNode,
      'import': importPlugin,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts', '.d.ts'],
        },
      },
    },
    rules: {
      ...securityNode.configs.recommended.rules,
      ...typescriptRules,
      ...styleRules,
      'promise/catch-or-return': [
        'error',
        { allowFinally: true },
      ],
      'security-node/detect-object-injection': 'off',
      'no-param-reassign': [
        'error',
        { props: false },
      ],
      'no-plusplus': [
        'error',
        { allowForLoopAfterthoughts: true },
      ],
      'no-underscore-dangle': [
        'error',
        { allow: ['_id'] },
      ],
      'import/no-extraneous-dependencies': 'off',
      'import/no-unresolved': 'off',
      'import/prefer-default-export': 'off',
      'prefer-const': 'error',
      'no-console': 'warn',
      'max-classes-per-file': ['error', 1],
    },
  },
  {
    // CLI scripts talk to the terminal; console output is their job.
    files: ['src/commands/**/*.ts'],
    rules: {
      'no-console': 'off',
      'security-node/detect-crlf': 'off',
    },
  },
];
