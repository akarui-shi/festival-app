/**
 * Custom fixtures that extend Playwright's base test.
 * Import `test` and `expect` from this file instead of @playwright/test.
 */
import { test as base, expect } from '@playwright/test';
import { STORAGE_STATE } from './global.setup.js';

type Fixtures = {
  /** Page pre-authenticated as admin */
  adminPage: ReturnType<typeof base.extend> extends infer T ? any : any;
};

// Test that uses a pre-authenticated admin session
export const test = base.extend({
  // Nothing extra by default — use storageState in individual test files
});

export { expect };

// Auth storage state paths — re-export for convenience
export { STORAGE_STATE };
