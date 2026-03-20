/**
 * tests/setup.js — Jest configuration and test helpers
 *
 * Run tests: npm test
 * Coverage: npm test -- --coverage
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/seed.js',
    '!src/config/**',
  ],
  coverageThreshold: {
    global: {
      statements: 50,  // 50% is reasonable for MVP (aim for 70%+)
      branches: 40,
      functions: 50,
      lines: 50,
    },
  },
};
