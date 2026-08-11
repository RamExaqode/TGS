/**
 * Where the authenticated session is stored.
 *
 * Kept outside `tests/` so `playwright.config.ts` can import it without
 * pulling in a file that registers tests at config-load time.
 */
export const AUTH_FILE = 'playwright/.auth/user.json';
