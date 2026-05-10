/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	roots: ['<rootDir>/nodes', '<rootDir>/credentials', '<rootDir>/__tests__'],
	collectCoverageFrom: ['nodes/**/*.ts', 'credentials/**/*.ts'],
	coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
