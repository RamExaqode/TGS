import { env } from '../../config/env';
import { test } from '../../fixtures/test-fixtures';

/* Session comes from the `setup` project, so this lands on the
   dashboard without needing to log in again. */
test('Verify Dashboard', {
  tag: ['@smoke'],
}, async ({ dashboardPage }) => {
  await dashboardPage.navigate();

  await dashboardPage.verifyDashboardLoaded(env.userName);
});
