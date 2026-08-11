import { expect, Locator, Page } from '@playwright/test';

export type NonAcceptingUser = {
  name: string;
  role: string;
  email: string;
  company: string;
  /** The row's four values, kept so a misparse is diagnosable from the report. */
  raw: string[];
};

export type PaginationSummary = {
  from: number;
  to: number;
  total: number;
};

/** Guard against an infinite walk if "Next" never stops advancing. */
const MAX_PAGES = 50;

export class NonAcceptingUsersPage {
  // Page
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly card: Locator;
  readonly searchInput: Locator;
  readonly rows: Locator;
  readonly nameCells: Locator;
  readonly roleCells: Locator;
  readonly emailCells: Locator;
  readonly companyCells: Locator;
  readonly paginationSummary: Locator;
  readonly nextButton: Locator;
  readonly previousButton: Locator;

  // Constructor
  constructor(page: Page) {
    this.page = page;

    this.heading = page.getByRole('heading', { name: 'Non-accepting users' });
    this.card = page.locator('.MuiCard-root').filter({ has: this.heading });

    this.searchInput = this.card.getByPlaceholder(
      'Search by name, email or company'
    );

    this.rows = this.card.locator('tbody tr');

    /* Read a whole column at a time rather than cell by cell: four calls per
       page instead of forty, and still plain locators that show up in traces.
       Column order is fixed by the table header: User details, Email, Company. */
    this.nameCells = this.card.locator('tbody tr td:nth-child(1) h6');
    this.roleCells = this.card.locator('tbody tr td:nth-child(1) p');
    this.emailCells = this.card.locator('tbody tr td:nth-child(2) p');
    this.companyCells = this.card.locator('tbody tr td:nth-child(3) p');

    this.paginationSummary = this.card.locator(
      '.MuiTablePagination-displayedRows'
    );

    /* Two controls carry these labels — the compact arrows beside "1–10 of 81"
       and the numbered pager below. Either works; take the first. */
    this.nextButton = this.card
      .getByRole('button', { name: 'Go to next page' })
      .first();
    this.previousButton = this.card
      .getByRole('button', { name: 'Go to previous page' })
      .first();
  }

  // Actions
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  /** Parses the "1–10 of 81" footer, which is the authoritative row count. */
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
  async readVisibleRows(): Promise<NonAcceptingUser[]> {
    const [names, roles, emails, companies] = await Promise.all([
      this.nameCells.allInnerTexts(),
      this.roleCells.allInnerTexts(),
      this.emailCells.allInnerTexts(),
      this.companyCells.allInnerTexts(),
    ]);

    /* Columns are zipped by position, so a row missing a cell would silently
       shift every value below it. Fail loudly instead. */
    if (
      roles.length !== names.length ||
      emails.length !== names.length ||
      companies.length !== names.length
    ) {
      throw new Error(
        `Row columns are uneven: ${names.length} names, ${roles.length} roles, ` +
          `${emails.length} emails, ${companies.length} companies`
      );
    }

    return names.map((name, index) => {
      const row = [
        name.trim(),
        roles[index].trim(),
        emails[index].trim(),
        companies[index].trim(),
      ];

      return {
        name: row[0],
        role: row[1],
        email: row[2],
        company: row[3],
        raw: row,
      };
    });
  }

  /**
   * Walks every page and returns all rows.
   *
   * Dedupes on email + company + role, not email alone: the same person can
   * legitimately appear several times against different companies.
   */
  async collectAllUsers(): Promise<NonAcceptingUser[]> {
    await this.verifyLoaded();

    const summary = await this.readPaginationSummary();
    const collected: NonAcceptingUser[] = [];
    const seen = new Set<string>();

    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
      const rows = await this.readVisibleRows();

      for (const row of rows) {
        const key = `${row.email}|${row.company}|${row.role}`;

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
    await expect(this.heading).toBeVisible({ timeout: 20000 });
    await this.card.scrollIntoViewIfNeeded();
    await expect(this.rows.first()).toBeVisible({ timeout: 15000 });
  }

  async verifyRowCountMatchesTotal(
    collected: NonAcceptingUser[]
  ): Promise<void> {
    const summary = await this.readPaginationSummary();

    expect(
      summary,
      'Could not read the "1–10 of 81" pagination footer, so there is no ' +
        'trustworthy total to check the export against'
    ).not.toBeNull();

    expect(
      collected,
      `Collected ${collected.length} rows but the page reports ${summary?.total}`
    ).toHaveLength(summary?.total ?? collected.length);
  }
}
