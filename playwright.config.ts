import { defineConfig, devices } from '@playwright/test';

import { AUTH_FILE } from './auth-file';
import { env } from './config/env';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    /* Per-test lines in the terminal. Without this the html reporter only
       prints failures, so a green run says nothing about what actually ran. */
    ['list'],
    /* Built-in report: fastest path to a trace when something fails locally. */
    ['html', { open: 'never' }],
    /* Allure: step timelines, attachments and trend history across runs. */
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: env.baseURL,

    /* Headed locally so a run can be watched; headless on CI, which has no
       display and would otherwise fail to launch a browser at all. */
    headless: !!process.env.CI,

    /* `viewport: null` means "use the window size", which pairs with the
       maximised window locally. A headless CI window is only 800x600, so
       there it gets an explicit desktop viewport instead — otherwise the
       sidebar collapses and layout-dependent locators miss. */
    viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
    launchOptions: {
      args: process.env.CI ? [] : ['--start-maximized'],
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */

    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    /* Logs in once and saves the session; every project below depends on it.
       Lives in its own directory, so the browser projects no longer need a
       testIgnore to keep it out of their run. */
    {
      name: 'setup',
      testDir: './setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
      /* Nothing under tests/api belongs to a browser project. */
      testIgnore: '**/api/**',
      dependencies: ['setup'],
    },
/*
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
      testIgnore: /.*\.setup\.ts/,
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: AUTH_FILE,
      },
      testIgnore: /.*\.setup\.ts/,
      dependencies: ['setup'],
    },
*/
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
