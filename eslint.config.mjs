import typescriptEslint from 'typescript-eslint';

const commonRules = {
  curly: 'error',
  eqeqeq: 'error',
  'no-throw-literal': 'error',
};

export default [
  {
    files: ['src/**/*.ts'],

    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
    },

    languageOptions: {
      parser: typescriptEslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },

    rules: {
      ...commonRules,

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'import',
          format: ['camelCase', 'PascalCase'],
        },
      ],
    },
  },

  {
    files: ['media/pet-view/**/*.js'],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        acquireVsCodeApi: 'readonly',
        document: 'readonly',
      },
    },

    rules: {
      ...commonRules,
      'no-undef': 'error',
      'no-unused-vars': 'error',
    },
  },
];
