import { env, mailboxName } from '../../config/env';
import { test } from '../../fixtures/test-fixtures';

/* This test is the one place that still exercises the real login flow,
   so it opts out of the shared session. */
test.use({ storageState: { cookies: [], origins: [] } });

test('login using Yopmail OTP', {
  tag: ['@smoke'],
}, async ({ loginPage, otpPage, yopmailPage }) => {
  test.setTimeout(120000);

  /* Note what is already in the mailbox before triggering anything: the setup
     project has just logged in with the same account, so "the latest email"
     would be its code rather than this test's. */
  await yopmailPage.openMailbox(mailboxName);

  const staleOtp = await yopmailPage.readCurrentOtp();

  await loginPage.navigate();
  await loginPage.verifyLoginPageLoaded();

  await loginPage.login(env.email, env.password);
  await loginPage.verifyOtpRequested();

  const otp = await yopmailPage.waitForNewOtp(staleOtp);

  await otpPage.enterOtp(otp);
  await otpPage.clickVerify();

  await otpPage.verifyDashboardReached();
});
