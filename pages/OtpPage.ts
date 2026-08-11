import { expect, Locator, Page } from '@playwright/test';

/** The code is split across one input per digit. */
const OTP_LENGTH = 6;

export class OtpPage {
  // Page
  readonly page: Page;

  // Locators
  readonly otpInputs: Locator;
  readonly verifyButton: Locator;

  // Constructor
  constructor(page: Page) {
    this.page = page;

    this.otpInputs = page.locator('input[type="text"]');
    this.verifyButton = page.getByRole('button', { name: 'Verify Now' });
  }

  // Actions
  async enterOtp(otp: string): Promise<void> {
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
      throw new Error(`Invalid OTP received: ${otp}`);
    }

    await this.page.bringToFront();

    await this.verifyOtpFieldsReady();

    for (let index = 0; index < otp.length; index += 1) {
      await this.otpInputs.nth(index).fill(otp[index]);
    }
  }

  async clickVerify(): Promise<void> {
    await this.verifyButton.click();
  }

  // Verification
  async verifyOtpFieldsReady(): Promise<void> {
    await expect(this.otpInputs).toHaveCount(OTP_LENGTH);
  }

  async verifyDashboardReached(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard/, { timeout: 20000 });
  }
}
