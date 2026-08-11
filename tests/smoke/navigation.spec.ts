import { test } from '../../fixtures/test-fixtures';
import {
  NAV_ITEMS_WITHOUT_LOGOUT,
  NAV_ROUTES,
  NavItem,
} from '../../pages/NavigationPage';

type SectionReport = {
  url: string;
  pageTitle: string;
  titleAsserted: boolean;
};

/* Session comes from the `setup` project, so this starts already signed in. */
test('every sidebar option is visible, clickable and opens its section', {
  tag: ['@smoke'],
}, async ({ dashboardPage, navigationPage }) => {
  await dashboardPage.navigate();

  await navigationPage.verifySidebarVisible();

  const report: Partial<Record<NavItem, SectionReport>> = {};
  const unverified: NavItem[] = [];

  for (const item of NAV_ITEMS_WITHOUT_LOGOUT) {
    await test.step(`open "${item}" (${NAV_ROUTES[item]})`, async () => {
      await navigationPage.verifyItemClickable(item);

      const url = await navigationPage.open(item);

      await navigationPage.verifyRoute(item);

      /* The sidebar surviving is what separates "the section loaded" from
         "the app fell over and rendered an error page". */
      await navigationPage.verifySidebarVisible();

      const titleAsserted = await navigationPage.verifyPageTitle(item);

      if (!titleAsserted) {
        unverified.push(item);
      }

      report[item] = {
        url,
        pageTitle: await navigationPage.readPageTitle(),
        titleAsserted,
      };
    });
  }

  await test.info().attach('sidebar-sections.json', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });

  console.log('Sidebar sections:\n', JSON.stringify(report, null, 2));

  if (unverified.length > 0) {
    test.info().annotations.push({
      type: 'title-not-yet-asserted',
      description:
        `No expected title configured for: ${unverified.join(', ')}. ` +
        `Add them to EXPECTED_TITLES in pages/NavigationPage.ts.`,
    });
  }

  /* Logout is never clicked, but it must still be there afterwards —
     that is what proves the walk left the session intact. */
  await navigationPage.verifyItemVisible('Logout');
});
