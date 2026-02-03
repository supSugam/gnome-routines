// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Global ignores
  {
    ignores: ['node_modules/**', 'scripts/**', '**/*.d.ts'],
  },

  // ESLint recommended
  eslint.configs.recommended,

  // TypeScript ESLint recommended
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // Prettier compatibility
  eslintConfigPrettier,

  // Project-specific TypeScript config
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Disable rules that cause false positives
      'no-fallthrough': 'off', // Intentional switch fallthrough is valid
      'no-empty': 'off', // Empty catch blocks are valid

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],

      // Padding between statements
      '@stylistic/padding-line-between-statements': [
        'error',
        // Imports
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },

        // Classes and functions
        { blankLine: 'always', prev: '*', next: 'class' },
        { blankLine: 'always', prev: 'class', next: '*' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'function', next: '*' },

        // Return statements
        { blankLine: 'always', prev: '*', next: 'return' },

        // Variable declarations
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },

        // Control flow
        { blankLine: 'always', prev: '*', next: 'switch' },
        { blankLine: 'always', prev: '*', next: 'try' },

        // Switch cases
        { blankLine: 'always', prev: 'case', next: 'case' },
        { blankLine: 'always', prev: 'case', next: 'default' },
        { blankLine: 'always', prev: 'default', next: 'case' },

        // Block statements
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],

      // Class members
      '@stylistic/lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: true },
      ],

      // Empty lines
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      '@stylistic/eol-last': ['error', 'always'],

      // Disable rules handled by Prettier
      '@stylistic/indent': 'off',
      '@stylistic/quotes': 'off',
      '@stylistic/semi': 'off',
    },
  },

  // Format built JavaScript files with same padding rules
  {
    files: ['dist/**/*.js'],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Disable rules that cause false positives
      'no-fallthrough': 'off',
      'no-empty': 'off',
      'no-unused-vars': 'off',

      // Padding between statements (same as TypeScript)
      '@stylistic/padding-line-between-statements': [
        'error',
        // Imports
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },

        // Classes and functions
        { blankLine: 'always', prev: '*', next: 'class' },
        { blankLine: 'always', prev: 'class', next: '*' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'function', next: '*' },

        // Return statements
        { blankLine: 'always', prev: '*', next: 'return' },

        // Variable declarations
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        {
          blankLine: 'any',
          prev: ['const', 'let', 'var'],
          next: ['const', 'let', 'var'],
        },

        // Control flow
        { blankLine: 'always', prev: '*', next: 'switch' },
        { blankLine: 'always', prev: '*', next: 'try' },

        // Switch cases
        { blankLine: 'always', prev: 'case', next: 'case' },
        { blankLine: 'always', prev: 'case', next: 'default' },
        { blankLine: 'always', prev: 'default', next: 'case' },

        // Block statements
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],

      // Class members
      '@stylistic/lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: true },
      ],

      // Empty lines
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      '@stylistic/eol-last': ['error', 'always'],
    },
  },
];
