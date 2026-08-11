import { expect, Locator, Page } from '@playwright/test';

export const DASHBOARD_METRICS = [
  'Total Users',
  'New Users',
  'User Logins',
  'Companies',
  'Active Users',
  'Total Hours',
] as const;

export type DashboardMetric = (typeof DASHBOARD_METRICS)[number];

export type MetricReading = {
  metric: DashboardMetric;
  value: string;
  unit: string;
};

export class DashboardPage {
  // Page
  readonly page: Page;

  // Page-level locators
  readonly welcomeMessage: Locator;
  readonly userLocationsHeading: Locator;

  // Constructor
  constructor(page: Page) {
    this.page = page;

    this.welcomeMessage = page.getByRole('heading', {
      level: 1,
    });

    this.userLocationsHeading = page.getByRole('heading', {
      name: 'User Locations',
      exact: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async navigate(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  // ---------------------------------------------------------------------------
  // Locators
  // ---------------------------------------------------------------------------

  /**
   * Finds the dashboard card containing the specified metric title.
   */
  private metricCard(metric: DashboardMetric): Locator {
    return this.page
      .locator('.MuiCard-root')
      .filter({
        has: this.page.getByText(metric, {
          exact: true,
        }),
      });
  }

  /**
   * Finds the metric value exactly as displayed on the UI.
   */
  private metricValue(metric: DashboardMetric): Locator {
    return this.metricCard(metric).locator('h3');
  }

  /**
   * Finds the unit displayed above the metric title.
   *
   * DOM structure:
   *
   * <div>
   *   <div>
   *     <h3>2676</h3>
   *   </div>
   *
   *   <div>
   *     <p>Users</p>
   *     <p>Total Users</p>
   *   </div>
   * </div>
   *
   * We move from h3 -> parent div -> next sibling div -> first p.
   */
  private metricUnit(metric: DashboardMetric): Locator {
    return this.metricValue(metric)
      .locator('..')
      .locator('xpath=following-sibling::div[1]')
      .locator('p')
      .first();
  }

  // ---------------------------------------------------------------------------
  // Metric reading
  // ---------------------------------------------------------------------------

  /**
   * Reads one metric exactly as displayed on the UI.
   */
  async getMetric(
    metric: DashboardMetric
  ): Promise<MetricReading> {
    const valueLocator = this.metricValue(metric);
    const unitLocator = this.metricUnit(metric);

    await expect(valueLocator).toBeVisible({
      timeout: 15000,
    });

    await expect(unitLocator).toBeVisible({
      timeout: 15000,
    });

    const value = (await valueLocator.innerText()).trim();
    const unit = (await unitLocator.innerText()).trim();

    return {
      metric,
      value,
      unit,
    };
  }

  /**
   * Reads all dashboard metrics in UI display order.
   */
  async readAllMetrics(): Promise<MetricReading[]> {
    return Promise.all(
      DASHBOARD_METRICS.map((metric) =>
        this.getMetric(metric)
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Verification
  // ---------------------------------------------------------------------------

  /**
   * Verifies that the dashboard has loaded.
   */
  async verifyDashboardLoaded(
    userName: string
  ): Promise<void> {
    await expect(this.page).toHaveURL(
      /\/dashboard(?:\/|$)/,
      {
        timeout: 20000,
      }
    );

    await this.verifyWelcomeMessage(userName);

    await expect(
      this.userLocationsHeading
    ).toBeVisible();

    await expect(
      this.metricValue('Total Users')
    ).toBeVisible({
      timeout: 15000,
    });
  }

  /**
   * Verifies the welcome message.
   */
  async verifyWelcomeMessage(
    userName: string
  ): Promise<void> {
    await expect(
      this.welcomeMessage
    ).toBeVisible({
      timeout: 10000,
    });

    await expect(
      this.welcomeMessage
    ).toContainText(userName);
  }

  /**
   * Verifies that all six metric values are visible.
   */
  async verifyAllMetricCardsVisible(): Promise<void> {
    for (const metric of DASHBOARD_METRICS) {
      await expect(
        this.metricValue(metric)
      ).toBeVisible({
        timeout: 15000,
      });
    }
  }
}