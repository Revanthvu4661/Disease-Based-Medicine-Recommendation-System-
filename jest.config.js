module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/swagger.js'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true
};
