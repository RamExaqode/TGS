import { chromium, test as base } from '@playwright/test';

import { env } from '../config/env';

import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NavigationPage } from '../pages/NavigationPage';
import { NonAcceptingUsersPage } from '../pages/NonAcceptingUsersPage';
import { OtpPage } from '../pages/OtpPage';
import { TsrUsersPage } from '../pages/TsrUsersPage';
import { YopmailPage } from '../pages/YopmailPage';

type PageObjects = {
  loginPage: LoginPage;
  otpPage: OtpPage;
  dashboardPage: DashboardPage;
  navigationPage: NavigationPage;
  nonAcceptingUsersPage: NonAcceptingUsersPage;
  tsrUsersPage: TsrUsersPage;
  yopmailPage: YopmailPage;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  otpPage: async ({ page }, use) => {
    await use(new OtpPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  navigationPage: async ({ page }, use) => {
    await use(new NavigationPage(page));
  },

  nonAcceptingUsersPage: async ({ page }, use) => {
    await use(new NonAcceptingUsersPage(page));
  },

  tsrUsersPage: async ({ page }, use) => {
    await use(new TsrUsersPage(page));
  },

  /* Nobody needs to watch an inbox, and this keeps the visible window on the
     app when the suite runs headed. It has to be a separate browser rather
     than another context, because `headless` is fixed when a browser launches
     and cannot be overridden per context. */
  yopmailPage: async ({}, use) => {
    const mailBrowser = await chromium.launch({ headless: true });
    const mailContext = await mailBrowser.newContext();
    const mailPage = await mailContext.newPage();

    await use(new YopmailPage(mailPage, env.yopmailUrl));

    await mailBrowser.close();
  },
});

export { expect } from '@playwright/test';
