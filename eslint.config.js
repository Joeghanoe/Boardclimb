import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.expo/**', 'artifacts/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: 'error',
    },
  },
  {
    // T.2: business code takes time and ids through ports; only composition roots read the ambient clock.
    files: ['packages/**/src/**/*.ts', 'apps/**/src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx', 'apps/mobile/src/composition/**'],
    rules: {
      'no-restricted-globals': ['error', { name: 'localStorage', message: 'Use a store port.' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Read time through the Clock port (T.2).',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Read time through the Clock port (T.2).',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Take ids from the IdGenerator port (T.2).',
        },
      ],
    },
  },
);
