
import { expect, Locator, Page } from '@playwright/test';

export type TsrUser = {
  name: string;
  role: string;
  email: string;
};

export type PaginationSummary = {
  from: number;
  to: number;
  total: number;
};

/** Guard against an infinite walk if "Next" never stops advancing. */
const MAX_PAGES = 50;

/**
 * The /users page. Both of its tabs render the same three-column table —
 * User details (name + role), Email, Action — so one reader serves both.
 * That table is a column narrower than the dashboard's non-accepting list,
 * which also carries Company, hence a separate page object rather than reuse.
 */
export class TsrUsersPage {
  // Page
  readonly page: Page;

  // Locators
  readonly tsrUsersTab: Locator;
  readonly nonAcceptingTab: Locator;

  readonly card: Locator;
  readonly cardHeading: Locator;
  readonly searchInput: Locator;
  readonly addTsrAdminButton: Locator;

  readonly rows: Locator;
  readonly nameCells: Locator;
  readonly roleCells: Locator;
  readonly emailCells: Locator;

  readonly paginationSummary: Locator;
  readonly nextButton: Locator;
  readonly previousButton: Locator;

  // Constructor
  constructor(page: Page) {
    this.page = page;

    const main = page.locator('main');

    /* Each tab label is repeated by the card heading below it once that tab is
       active, so text alone matches twice. The tab bar sits above the card in
       the DOM, which makes `.first()` the tab and `.last()` the heading. */
    this.tsrUsersTab = main.getByText('TSR Users', { exact: true }).first();
    this.nonAcceptingTab = main
      .getByText('Non-accepting users', { exact: true })
      .first();

    this.card = main.locator('.MuiCard-root').first();
    this.cardHeading = this.card.getByRole('heading').first();

    this.searchInput = this.card.getByPlaceholder('Search by name, email');
    this.addTsrAdminButton = this.card.getByRole('button', {
      name: 'Add TSR Admin',
    });

    this.rows = this.card.locator('tbody tr');

    /* Read a column at a time: three calls per page rather than one per cell. */
    this.nameCells = this.card.locator('tbody tr td:nth-child(1) h6');
    this.roleCells = this.card.locator('tbody tr td:nth-child(1) p');
    this.emailCells = this.card.locator('tbody tr td:nth-child(2) p');

    this.paginationSummary = this.card.locator(
      '.MuiTablePagination-displayedRows'
    );

    /* Two controls carry these labels — the compact arrows beside "1–10 of 18"
       and the numbered pager. Either works; take the first. */
    this.nextButton = this.card
      .getByRole('button', { name: 'Go to next page' })
      .first();
    this.previousButton = this.card
      .getByRole('button', { name: 'Go to previous page' })
      .first();
  }

  // Actions
  async openTsrUsersTab(): Promise<void> {
    await this.tsrUsersTab.click();
    await this.verifyCardHeading('TSR Users');
  }

  async openNonAcceptingTab(): Promise<void> {
    await this.nonAcceptingTab.click();
    await this.verifyCardHeading('Non-accepting users');
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  /** Parses the "1–10 of 18" footer, which is the authoritative row count. */
  async readPaginationSummary(): Promise<PaginationSummary | null> {
    const text = await this.paginationSummary.innerText();
    /* The separator is an en dash in the rendered markup, not a hyphen. */
    const match = text.match(/(\d+)\s*[-–]\s*(\d+)\s+of\s+(\d+)/i);

    if (!match) {
      return null;
    }

    return {
      from: Number(match[1]),
      to: Number(match[2]),
      total: Number(match[3]),
    };
  }

  /** Reads the rows currently rendered, column by column. */
  async readVisibleRows(): Promise<TsrUser[]> {
    const [names, roles, emails] = await Promise.all([
      this.nameCells.allInnerTexts(),
      this.roleCells.allInnerTexts(),
      this.emailCells.allInnerTexts(),
    ]);

    /* Columns are zipped by position, so a row missing a cell would silently
       shift every value below it. Fail loudly instead. */
    if (roles.length !== names.length || emails.length !== names.length) {
      throw new Error(
        `Row columns are uneven: ${names.length} names, ${roles.length} roles, ` +
          `${emails.length} emails`
      );
    }

    return names.map((name, index) => ({
      name: name.trim(),
      role: roles[index].trim(),
      email: emails[index].trim(),
    }));
  }

  /**
   * Walks every page of whichever tab is open and returns all rows.
   *
   * Dedupes on email + name + role: the list shows near-duplicate accounts
   * (two "Bansari pawar" rows differing only by address), so email alone is
   * too narrow a key to be safe.
   */
  async collectAllRows(): Promise<TsrUser[]> {
    const summary = await this.readPaginationSummary();
    const collected: TsrUser[] = [];
    const seen = new Set<string>();

    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
      const rows = await this.readVisibleRows();

      for (const row of rows) {
        const key = `${row.email}|${row.name}|${row.role}`;

        if (!seen.has(key)) {
          seen.add(key);
          collected.push(row);
        }
      }

      if (summary !== null && collected.length >= summary.total) {
        break;
      }

      if (await this.nextButton.isDisabled().catch(() => true)) {
        break;
      }

      const firstEmailBefore = rows[0]?.email ?? '';

      await this.nextButton.click();

      /* Paging is client side, so there is no navigation to await. The first
         row changing is the signal the new page rendered. */
      await expect
        .poll(async () => (await this.emailCells.first().innerText()).trim(), {
          timeout: 10000,
          intervals: [250, 500, 1000],
          message: 'Next page never rendered a different first row',
        })
        .not.toBe(firstEmailBefore);
    }

    return collected;
  }

  // Verification
  async verifyLoaded(): Promise<void> {
    await expect(this.tsrUsersTab).toBeVisible({ timeout: 20000 });
    await expect(this.nonAcceptingTab).toBeVisible();
    await expect(this.rows.first()).toBeVisible({ timeout: 15000 });
  }

  /** The card heading is what changes when a tab is switched, so it is the settle signal. */
  async verifyCardHeading(text: string): Promise<void> {
    await expect(this.cardHeading).toHaveText(text, { timeout: 15000 });
    await expect(this.rows.first()).toBeVisible({ timeout: 15000 });
  }

  async verifyRowCountMatchesTotal(collected: TsrUser[]): Promise<void> {
    const summary = await this.readPaginationSummary();

    expect(
      summary,
      'Could not read the "1–10 of 18" pagination footer, so there is no ' +
        'trustworthy total to check the export against'
    ).not.toBeNull();

    expect(
      collected,
      `Collected ${collected.length} rows but the page reports ${summary?.total}`
    ).toHaveLength(summary?.total ?? collected.length);
  }
}
