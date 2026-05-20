import { test } from '@playwright/test';

/**
 * Tenant roles management e2e — PENDING MIGRATION to mock-server pattern.
 *
 * The original implementation used Playwright's page.route() to stub API
 * calls. After the BFF migration, browser fetches go to /api/* (BFF) which
 * makes server-to-server calls to Go — page.route() cannot see those.
 *
 * Migration recipe:
 *   1. Replace page.route() blocks with registerMock() from helpers/mock.ts.
 *   2. Use signInAsTier() from helpers/sign-in.ts for the auth bootstrap.
 *   3. Adjust route assertions to current routes (no /operator/tenants/[slug]).
 *
 * Reference implementation: see operator-tenant-management.spec.ts.
 */
test.fixme('PENDING: tenant roles management spec migration', () => {});
