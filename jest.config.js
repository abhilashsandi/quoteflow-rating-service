/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  setupFiles: ['reflect-metadata', '<rootDir>/test/setup-env.ts'],
  clearMocks: true,
};
