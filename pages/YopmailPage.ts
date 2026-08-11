import { expect, Locator, Page } from '@playwright/test';

const OTP_PATTERN = /\b\d{6}\b/;

export class YopmailPage {
  // Page
  readonly page: Page;

  // Config
  /** Injected by the fixture, so this page stays unaware of how config is loaded. */
  readonly baseUrl: string;

  // Locators
  readonly mailboxInput: Locator;
  readonly refreshButton: Locator;
  readonly emailBody: Locator;

  // Constructor
  constructor(page: Page, baseUrl: string) {
    this.page = page;
    this.baseUrl = baseUrl;

    this.mailboxInput = page.locator('#login');
    this.refreshButton = page.locator('#refresh');
    /* The message renders inside an iframe, so the body has to be reached
       through a frame locator rather than the page. */
    this.emailBody = page.frameLocator('#ifmail').locator('body');
  }

  // Actions
  async openMailbox(mailboxName: string): Promise<void> {
    await this.page.goto(this.baseUrl);

    await this.mailboxInput.fill(mailboxName);
    await this.page.keyboard.press('Enter');

    await this.page.waitForTimeout(5000);
  }

  async refreshInbox(): Promise<void> {
    if (await this.refreshButton.isVisible()) {
      await this.refreshButton.click();
      await this.page.waitForTimeout(3000);
    }
  }

  /** Returns the code currently in the inbox, or null when there is none. */
  async readCurrentOtp(): Promise<string | null> {
    if (!(await this.emailBody.isVisible().catch(() => false))) {
      return null;
    }

    const emailText = await this.emailBody.innerText().catch(() => '');

    return emailText.match(OTP_PATTERN)?.[0] ?? null;
  }

  /**
   * The mailbox is shared across logins, so whatever sits in it when a login
   * starts is not necessarily the code that login triggered. Polls until a
   * code appears that differs from the one already seen.
   */
  async waitForNewOtp(
    previousOtp: string | null,
    timeout = 60000
  ): Promise<string> {
    let latestOtp: string | null = null;

    await expect
      .poll(
        async () => {
          await this.refreshInbox();
          latestOtp = await this.readCurrentOtp();

          return latestOtp !== null && latestOtp !== previousOtp;
        },
        {
          timeout,
          intervals: [2000],
          message: `No OTP newer than ${previousOtp ?? '(empty inbox)'} arrived in Yopmail`,
        }
      )
      .toBe(true);

    return latestOtp as unknown as string;
  }

  // Verification
  async verifyMailboxOpen(): Promise<void> {
    await expect(this.emailBody).toBeVisible({ timeout: 15000 });
  }
}
