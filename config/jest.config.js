// main jest configuration file
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

module.exports = {
    rootDir: BASE_DIR,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/*',
        'src/**/*',
        'src/**/**/*',
    ],
    coverageReporters: [
        'clover',
        'text',
        'json',
        'json-summary',
        'lcov',
    ],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: '<rootDir>/coverage',
            },
        ],
    ],
    testRunner: 'jest-circus/runner',
    testRegex: 'test/.*',
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        '/node_modules/',
    ],
    moduleFileExtensions: [
        'js',
        'json',
        'ts',
    ],
};
