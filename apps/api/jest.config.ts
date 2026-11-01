import type { Config } from 'jest';

// Shared by the three suites. Path aliases mirror `tsconfig.json`.
const base: Pick<Config, 'moduleFileExtensions' | 'transform' | 'testEnvironment' | 'moduleNameMapper'> = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config$': '<rootDir>/src/config',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
};

const config: Config = {
  rootDir: '.',
  // The integration suite is empty until the first service with database access lands.
  passWithNoTests: true,
  // Three complementary suites, selected with `jest --selectProjects <name>`:
  //   unit         `*.spec.ts` next to the code, dependencies mocked
  //   integration  `*.int-spec.ts` next to the code, real database, no HTTP layer
  //   e2e          `test/**/*.e2e-spec.ts`, full application over HTTP
  projects: [
    {
      ...base,
      displayName: 'unit',
      rootDir: '.',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
    },
    {
      ...base,
      displayName: 'integration',
      rootDir: '.',
      testMatch: ['<rootDir>/src/**/*.int-spec.ts'],
    },
    {
      ...base,
      displayName: 'e2e',
      rootDir: '.',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
    },
  ],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  // Purely declarative files carry no logic worth measuring.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '\\.module\\.ts$',
    '\\.dto\\.ts$',
    '\\.entity\\.ts$',
    '/src/migrations/',
    '/src/seeders/',
    '/src/main\\.ts$',
    '/src/commands/',
  ],
};

export default config;
