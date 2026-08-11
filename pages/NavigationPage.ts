import { expect, Locator, Page } from '@playwright/test';

/** Every option in the left sidebar, top to bottom. */
export const NAV_ITEMS = [
  'Home',
  'TSR Users',
  'Companies',
  'TSR Chatbot',
  'Help',
  'Logout',
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/** Logout is excluded because it ends the session. */
export const NAV_ITEMS_WITHOUT_LOGOUT: readonly NavItem[] = NAV_ITEMS.filter(
  (item) => item !== 'Logout'
);

/**
 * Path each link actually lands on, which is not always its href: the app
 * redirects "/" to "/dashboard", so Home ends up somewhere its anchor does
 * not name. Logout is absent because the walk never clicks it.
 */
export const NAV_ROUTES: Readonly<Record<string, string>> = {
  Home: '/dashboard',
  'TSR Users': '/users',
  Companies: '/companies',
  'TSR Chatbot': '/website-chatbot',
  Help: '/help',
};

/**
 * Title the top bar shows for each section. Home is confirmed ("Dashboard");
 * the rest are filled in from a run rather than guessed, because a wrong value
 * fails for the wrong reason and reads like a product bug.
 */
export const EXPECTED_TITLES: Partial<Record<NavItem, string>> = {
  Home: 'Dashboard',
  'TSR Users': 'TSR Users',
};

export class NavigationPage {
  // Page
  readonly page: Page;

  // Locators
  readonly pageTitle: Locator;

  readonly homeLink: Locator;
  readonly tsrUsersLink: Locator;
  readonly companiesLink: Locator;
  readonly tsrChatbotLink: Locator;
  readonly helpLink: Locator;
  readonly logoutLink: Locator;

  /** The same six locators keyed by label, so the suite can walk them. */
  readonly items: Readonly<Record<NavItem, Locator>>;

  // Constructor
  constructor(page: Page) {
    this.page = page;

    /* Title the app renders in the top bar, e.g. "Dashboard". */
    this.pageTitle = page.locator('header p.MuiTypography-body1');

    /* Addressed by the heading inside each link, not by href: Logout's href
       mirrors whatever page you are on, so on /users it collides with the TSR
       Users link. Matching the nested heading is exact and stays unique —
       and unlike the link's own accessible name, it is not polluted by the
       icon's alt text (the Chatbot link would otherwise read
       "TSR Chatbot TSR Chatbot"). */
    const sidebar = page.getByRole('navigation', { name: 'mailbox folders' });

    const sidebarLink = (name: NavItem): Locator =>
      sidebar.getByRole('button').filter({
        has: page.getByRole('heading', { name, exact: true }),
      });

    this.homeLink = sidebarLink('Home');
    this.tsrUsersLink = sidebarLink('TSR Users');
    this.companiesLink = sidebarLink('Companies');
    this.tsrChatbotLink = sidebarLink('TSR Chatbot');
    this.helpLink = sidebarLink('Help');
    this.logoutLink = sidebarLink('Logout');

    this.items = {
      Home: this.homeLink,
      'TSR Users': this.tsrUsersLink,
      Companies: this.companiesLink,
      'TSR Chatbot': this.tsrChatbotLink,
      Help: this.helpLink,
      Logout: this.logoutLink,
    };
  }

  // Actions
  /** Opens a section and returns the URL it landed on. */
  async open(name: NavItem): Promise<string> {
    await this.items[name].click();

    await expect(this.items[name]).toBeVisible({ timeout: 15000 });
    await this.page.waitForLoadState('domcontentloaded');

    return this.page.url();
  }

  async logout(): Promise<void> {
    await this.logoutLink.click();
  }

  async readPageTitle(): Promise<string> {
    return (await this.pageTitle.innerText()).trim();
  }

  // Verification
  async verifySidebarVisible(): Promise<void> {
    for (const name of NAV_ITEMS) {
      await expect(this.items[name]).toBeVisible({ timeout: 15000 });
    }
  }

  async verifyItemVisible(name: NavItem): Promise<void> {
    await expect(this.items[name]).toBeVisible({ timeout: 15000 });
  }

  /**
   * Visible and enabled is the cheap half of "clickable"; the other half is
   * proved by open(), since Playwright's click waits for the element to be
   * stable and actually receiving pointer events before it fires.
   */
  async verifyItemClickable(name: NavItem): Promise<void> {
    await expect(this.items[name]).toBeVisible({ timeout: 15000 });
    await expect(this.items[name]).toBeEnabled();
  }

  /**
   * Compares pathnames rather than whole URLs, so Home's "/" cannot be
   * satisfied by any address that merely ends in a slash.
   */
  async verifyRoute(name: NavItem): Promise<void> {
    const expected = NAV_ROUTES[name];

    if (expected === undefined) {
      return;
    }

    await expect
      .poll(() => new URL(this.page.url()).pathname, {
        timeout: 15000,
        message: `"${name}" did not open ${expected}`,
      })
      .toBe(expected);
  }

  /**
   * Asserts the top-bar title when one is configured, and reports whether it
   * actually checked anything so the caller can surface the gap rather than
   * passing silently.
   */
  async verifyPageTitle(name: NavItem): Promise<boolean> {
    const expected = EXPECTED_TITLES[name];

    if (expected === undefined) {
      return false;
    }

    await expect(this.pageTitle).toHaveText(expected, { timeout: 15000 });

    return true;
  }

  async verifyLoggedOut(): Promise<void> {
    await expect(this.page).toHaveURL(/login/, { timeout: 10000 });
  }
}
