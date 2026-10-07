const typescriptRules = {
  '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
  '@typescript-eslint/no-shadow': 'error',
  '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
  '@typescript-eslint/no-use-before-define': 'error',
};

const styleRules = {
  'curly': ['error', 'all'],
  'brace-style': ['error', '1tbs', { allowSingleLine: true }],
  'semi': ['error', 'always'],
  'space-infix-ops': 'error',
  'space-before-function-paren': ['error', 'always'],
  'space-before-blocks': 'error',
  'func-call-spacing': 'error',
  'object-curly-spacing': ['error', 'always'],
  'object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
  'array-bracket-newline': ['error', 'consistent'],
  'array-element-newline': ['error', 'consistent'],
  'comma-dangle': ['warn', 'always-multiline'],
  'padding-line-between-statements': [
    'warn',
    { blankLine: 'always', prev: '*', next: ['return', 'export'] },
  ],
  'max-len': ['error', { code: 120, ignoreUrls: true }],
  'indent': ['error', 2],
  'quotes': ['error', 'single'],
  'import/newline-after-import': ['error', { count: 1 }], // <- nouvelle ligne après les imports
  'object-curly-newline': ['error', { ImportDeclaration: { multiline: true, minProperties: 2 } }],
};

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'promise', 'security-node', 'nestjs', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:promise/recommended',
    'plugin:security-node/recommended',
    'plugin:nestjs/recommended',
  ],
  rules: {
    ...typescriptRules,
    ...styleRules,
    'promise/catch-or-return': ['error', { allowFinally: true }],
    'security-node/detect-object-injection': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-underscore-dangle': ['error', { allow: ['_id'] }],
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'prefer-const': 'error',
    'no-console': 'warn',
    'max-classes-per-file': ['error', 1],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.d.ts'],
      },
    },
  },
};
