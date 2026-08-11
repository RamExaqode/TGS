import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. `
    );
  }

  return value;
}

export const env = {
  baseURL: required('TSR_BASE_URL'),
  email: required('TSR_EMAIL'),
  password: required('TSR_PASSWORD'),
  userName: required('TSR_USER_NAME'),
  /* Separate origin from the app, so it cannot ride on Playwright's baseURL. */
  yopmailUrl: required('YOPMAIL_URL'),
};

/** Yopmail mailbox backing the test account, e.g. `bansari.p@yopmail.com` -> `bansari.p`. */
export const mailboxName = env.email.split('@')[0];
