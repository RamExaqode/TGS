import { expect, Locator, Page } from '@playwright/test';

export class LoginPage {
  // Page
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  // Constructor
  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
  }

  // Actions
  async navigate(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  // Verification
  async verifyLoginPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/login/);
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async verifyOtpRequested(): Promise<void> {
    await expect(this.page).toHaveURL(/verify-otp/, { timeout: 15000 });
  }
}
