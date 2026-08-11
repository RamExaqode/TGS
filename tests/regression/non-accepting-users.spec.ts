import { test, expect } from '../../fixtures/test-fixtures';
import { writeCsv } from '../../utils/csv';

/* Session comes from the `setup` project, so this starts already signed in. */
test('export every non-accepting user across all pages to CSV', {
  tag: ['@regression'],
}, async ({ dashboardPage, nonAcceptingUsersPage }) => {
  test.setTimeout(120000);

  await dashboardPage.navigate();

  await nonAcceptingUsersPage.verifyLoaded();

  const users = await nonAcceptingUsersPage.collectAllUsers();

  /* The footer total is the only independent check that pagination was walked
     to the end — without it, a silent stop on page 1 still looks like a pass. */
  await nonAcceptingUsersPage.verifyRowCountMatchesTotal(users);

  for (const user of users) {
    expect(
      user.email,
      `Row parsed with no email: ${user.raw.join(' | ')}`
    ).toMatch(/@/);
  }

  const csvPath = writeCsv(
    'non-accepting-users.csv',
    ['Name', 'Role', 'Email', 'Company'],
    users.map((user) => [user.name, user.role, user.email, user.company])
  );

  await test.info().attach('non-accepting-users.json', {
    body: JSON.stringify(users, null, 2),
    contentType: 'application/json',
  });

  console.log(`Non-accepting users CSV: ${csvPath} (${users.length} rows)`);
});
