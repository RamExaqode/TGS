import { AUTH_FILE } from '../auth-file';
import { env, mailboxName } from '../config/env';
import { test as setup } from '../fixtures/test-fixtures';

/**
 * Session captured here is reused by every test project, so the
 * login + OTP round trip runs once per suite instead of once per test.
 *
 * Deliberately untagged: it is a dependency of every project, so it runs
 * whatever `--grep` the caller passes.
 */
setup('authenticate', async ({ page, loginPage, otpPage, yopmailPage }) => {
  setup.setTimeout(120000);

  /* Note what is already in the mailbox first, so the code this login
     triggers can be told apart from leftovers of earlier runs. */
  await yopmailPage.openMailbox(mailboxName);

  const staleOtp = await yopmailPage.readCurrentOtp();

  await loginPage.navigate();
  await loginPage.verifyLoginPageLoaded();

  await loginPage.login(env.email, env.password);
  await loginPage.verifyOtpRequested();

  const otp = await yopmailPage.waitForNewOtp(staleOtp);

  await otpPage.enterOtp(otp);
  await otpPage.clickVerify();

  /* Wait for the dashboard before saving: the auth token is only
     written once the app finishes redirecting. */
  await otpPage.verifyDashboardReached();

  await page.context().storageState({ path: AUTH_FILE });
});
