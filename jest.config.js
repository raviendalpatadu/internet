module.exports = {
  // Use jest-junit reporter for test results
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports',
        outputName: 'junit.xml',
      },
    ],
  ],
  // Enable code coverage
  collectCoverage: true,
  // Directory where coverage files will be saved
  coverageDirectory: 'coverage',
  // Formats for coverage reports
  coverageReporters: ['text', 'lcov', 'cobertura'],
};
