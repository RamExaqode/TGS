import { test } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';

test('Dashboard metrics should be displayed', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);

  // Navigate to Dashboard
  await dashboardPage.navigate();

  // Verify all metric cards are visible
  await dashboardPage.verifyAllMetricCardsVisible();

  // Read all six dashboard metrics
  const metrics = await dashboardPage.readAllMetrics();

  // Print values displayed on the UI
  for (const metric of metrics) {
    console.log(
      `${metric.metric}: ${metric.value} ${metric.unit}`
    );
  }
});