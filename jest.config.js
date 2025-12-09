/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/tests/**/*.test.ts'],
  // Ignore UI/Gnome files that import 'gi://'
  coveragePathIgnorePatterns: [
    'src/ui/',
    'src/gnome/',
    'src/utils/constants.ts',
  ],
  modulePathIgnorePatterns: ['dist/', 'schemas/', 'scripts/'],
  // Mock imports if necessary, though we try to isolate logic
  moduleNameMapper: {
    '^gi://.*$': '<rootDir>/tests/mocks/gi.mock.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
