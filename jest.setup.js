// Jest setup file
import '@testing-library/jest-dom';

// Polyfill for Node.js compatibility
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: jest.fn(() => '550e8400-e29b-41d4-a716-446655440000')
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});