# Project Summary — TurnkeySR Admin Playwright Suite

This document summarizes the automation framework's design and the work
completed to date. It complements [`README.md`](./README.md) (setup and
day-to-day usage) and [`scenarios.md`](./scenarios.md) (full scenario
inventory), and is meant as a single place to understand *why* the framework
is built the way it is and *what has actually shipped*.

---

## 1. What this is

An end-to-end UI test suite for the **TurnkeySR Strategic Relations admin
portal** (`admin.dev.turnkeysr.ai`), written in Playwright + TypeScript. It
logs in once per run — including a real email OTP round trip against a
Yopmail inbox — reuses that session across every test, and follows a strict
Page Object Model. Screens with large tables export their data to CSV as part
of the test.

Stack: Playwright Test (`^1.62`), TypeScript, `dotenv` for config,
`allure-playwright` for reporting. Node 18+ locally, Node 24 on CI.

---

## 2. Framework architecture, in detail

### 2.1 The core design constraint: token in `localStorage`

The single fact that shapes almost every architectural decision in this
suite is that the app stores its auth token in **`localStorage`**, not
cookies, and that token **expires after 15 minutes**. Three consequences
follow directly from this:

1. Playwright's `storageState` snapshot mechanism only replays
   `localStorage` into a page **after** that page navigates to the app's
   origin — so every test that relies on the saved session must call
   `dashboardPage.navigate()` (or similar) before it is actually
   authenticated. This is not optional boilerplate; skipping it means the
   test runs unauthenticated.
2. Because tokens die after 15 minutes, the session cannot be cached between
   suite runs the way a long-lived cookie could be. It is rebuilt by the
   `setup` project **every single run**.
3. Because building the session means driving a full login + OTP flow, that
   flow is isolated into its own Playwright *project* (`setup`) rather than
   repeated inside each test — see 2.2.

### 2.2 Two-project structure: `setup` → `chromium`

`playwright.config.ts` declares two projects:

| Project | testDir | Depends on | Role |
|---|---|---|---|
| `setup` | `./setup` | — | Runs `setup/auth.setup.ts`: logs in for real, including OTP, and writes the resulting session to `playwright/.auth/user.json` |
| `chromium` | `./tests` | `setup` | Every actual test. Launched with `storageState: AUTH_FILE`, so each test starts already signed in |

`chromium` declares `dependencies: ['setup']`, which is what makes Playwright
run the login exactly once before any test file, regardless of which tests
are selected — even a single-test run via `-g "title"` still performs one
full login and consumes one OTP. This is a deliberate tradeoff documented in
the README: it keeps every test's *setup* code identical and centralized,
at the cost of every run — however narrow — spending a mailbox round trip.

Firefox and WebKit projects are present in the config but commented out.
Every "passing" claim currently means "passing in Chromium only."

**Why `auth-file.ts` exists as its own one-line module**: both
`playwright.config.ts` (to set `storageState`) and `setup/auth.setup.ts` (to
write the file) need the session path. Importing the path *from* the setup
file into the config would execute `setup(...)` while the config is merely
being read — registering a Playwright test outside of a test file, which
throws. A tiny shared module (`export const AUTH_FILE = ...`) breaks that
cycle without duplicating the path string.

### 2.3 The OTP race, and how `YopmailPage` avoids it

The Yopmail inbox backing the test account is public and shared. Two logins
happening close together (e.g. a manual run overlapping with `setup`, or two
concurrent test runs) means "read the latest email" is not a safe way to get
*this* login's code — it might be a leftover from a moment earlier.

The fix, implemented in `YopmailPage.waitForNewOtp()` and used identically
by both `setup/auth.setup.ts` and `login.spec.ts`:

1. **Before** triggering the login, open the mailbox and note whatever OTP
   is currently sitting at the top (`readCurrentOtp()`).
2. Trigger the login normally.
3. Poll the inbox until a code appears that is **different from the noted
   one** (`waitForNewOtp(staleOtp)`), rather than just "any code."

This pattern is why `login.spec.ts` explicitly reads the stale OTP itself
even though `setup` has *just* logged in with the same account seconds
earlier — without that step, the test could pick up `setup`'s leftover code
and pass without actually exercising anything.

**Why Yopmail gets its own browser instance, not just another context**:
`fixtures/test-fixtures.ts` launches a dedicated headless Chromium instance
for `yopmailPage` (`chromium.launch({ headless: true })`) rather than a
second browser context in the same browser. `headless` is fixed at browser
launch time and can't be overridden per-context, and local runs are headed
so the visible window stays on the app under test. It also keeps Yopmail's
own cookies out of the saved `storageState` for the app.

### 2.4 Page Object Model — the shape every page object follows

Every file under `pages/` follows the same four-part layout, enforced by
convention rather than a base class:

```ts
export class LoginPage {
  readonly page: Page;                              // 1. Page

  readonly emailInput: Locator;                      // 2. Locators
  readonly passwordInput: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {                          // 3. Constructor
    this.page = page;
    this.emailInput = page.getByPlaceholder('Email');
    this.passwordInput = page.getByPlaceholder('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string, password: string) { … } // 4a. Actions
  async verifyOtpRequested() { … }                    // 4b. Verification
}
```

Rules the codebase holds to, and the reasoning behind each:

| Rule | Why |
|---|---|
| Locators are `readonly` fields built once in the constructor | They read as a declaration of the page's shape; nothing is built mid-test |
| Actions and verification are separate methods | A `login()` that also asserts the redirect is doing two jobs — callers that only want the action shouldn't pay for the assertion |
| Test files contain **zero** locators | Selector churn is isolated to `pages/`; a DOM change never touches a `.spec.ts` |
| Page objects never import `config/` | Keeps them reusable and parameter-driven — e.g. `verifyDashboardLoaded(userName)` takes the name as an argument instead of reading `env` itself; the fixture layer supplies it |
| Prefer `getByRole` / `getByPlaceholder` / `getByText` over CSS | Survive restyling; a redesign that keeps the same semantics keeps the same locator |


### 2.5 Fixtures — why tests declare only what they use

`fixtures/test-fixtures.ts` extends Playwright's base `test` with one
fixture per page object:

```ts
test('Verify Dashboard', async ({ dashboardPage }) => { … });
```

Fixtures are **lazy**: Playwright only constructs the page objects a given
test actually names in its parameter list, so a test that never touches
`yopmailPage` never pays for the extra browser launch described in 2.3. This
is also what lets `setup/auth.setup.ts` reuse the exact same fixtures as the
real tests (`import { test as setup } from '../fixtures/test-fixtures'`)
instead of duplicating page-object construction.

### 2.6 Configuration — fail fast, name the missing variable

`config/env.ts` is the single source of truth for configuration. It loads
`.env` via `dotenv` and validates five required variables (`TSR_BASE_URL`,
`TSR_EMAIL`, `TSR_PASSWORD`, `TSR_USER_NAME`, `YOPMAIL_URL`) at **import
time**, throwing immediately with the specific variable's name if one is
missing:

```
Missing required environment variable TSR_BASE_URL.
```

This is a deliberate design choice over letting a missing value surface
later as a confusing timeout (e.g. a blank `baseURL` causing `page.goto('')`
to hang, or a login attempt failing thirty seconds in with no obvious
cause). Both `playwright.config.ts` and every page object that needs
account data import from this one module — nothing reads `process.env`
directly anywhere else in the suite.

`TSR_EMAIL` doubles as the Yopmail mailbox name: `mailboxName` is derived by
splitting on `@` (`config/env.ts:28`), so the account **must** be a Yopmail
address for the OTP-reading flow to work at all.

### 2.7 CSV export utility

`utils/csv.ts` is a small, dependency-free CSV writer used by the regression
specs that walk paginated tables (Non-accepting Users, TSR Users). Two
details matter:

- **Selective quoting**: `escapeCell()` only wraps a value in quotes when it
  contains a comma, quote, or newline. An unescaped comma in a company name
  would otherwise silently shift every column after it — a bug that is easy
  to miss because the CSV still "looks fine" until you count columns.
- **UTF-8 BOM prefix**: `writeCsv()` prepends a byte-order mark before
  writing. Without it, Excel guesses the file's encoding and mangles
  accented names; with it, Excel reads it as UTF-8 correctly.

Every export additionally asserts its collected row count against the
table's own `1–10 of N` footer text before considering the export valid —
without that check, a pagination walk that silently stops after page 1
would still produce a CSV and still look like a pass.

### 2.8 Headless/viewport switching for CI

`playwright.config.ts` branches on `process.env.CI` in three places:

```ts
headless: !!process.env.CI,
viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
launchOptions: { args: process.env.CI ? [] : ['--start-maximized'] },
```

Locally, runs are headed and the window is maximised (`viewport: null` means
"use the actual window size"). On CI there is no display, so a headed launch
would fail outright — but simply going headless isn't sufficient on its own:
a headless browser's default window is 800×600, which is narrow enough to
collapse the sidebar in this app and break every layout-dependent locator
that assumes it's expanded. The explicit `1920×1080` viewport on CI is what
keeps CI runs structurally identical to local ones.

### 2.9 CI pipeline (`.github/workflows/playwright.yml`)

- **Triggers**: manual (`workflow_dispatch`, with a dropdown for
  `all` / `smoke` / `regression`) and push to `main`/`master` — except pushes
  that only touch `**.md`, `.gitignore`, or `.env.example`, since every run
  spends a real OTP from the shared mailbox and a README typo shouldn't cost
  one.
- **Concurrency**: runs are serialized per-ref (`concurrency: group:
  playwright-${{ github.ref }}`, `cancel-in-progress: true`) — specifically
  to prevent two simultaneous runs from racing for the same Yopmail inbox
  and each potentially reading the other's OTP (the same race described in
  2.3, but across CI runs instead of within one).
- **Caching**: both `npm` (via `setup-node`'s built-in cache) and the
  Playwright browser binary (`~/.cache/ms-playwright`, keyed on
  `package-lock.json`) are cached. Even on a browser-binary cache hit, the
  workflow still runs `playwright install-deps` — the OS-level shared
  libraries Chromium links against live outside that cached directory and
  aren't part of the cache key.
- **Retries**: `1` on CI (not Playwright's default of `2`) — a failure that
  survives one retry is treated as a real failure rather than flake, and a
  second retry mostly triples the wall-clock time of a genuinely broken run.
- **Artifacts** (all uploaded with `if: always()`, so a red run still
  produces evidence): the Playwright HTML report, raw Allure results, and —
  only when the regression suite ran — the generated CSVs. The CSVs contain
  real names and emails, so that artifact is only as private as the repo.
- **Secrets**: `TSR_BASE_URL`, `TSR_EMAIL`, `TSR_PASSWORD`, `TSR_USER_NAME`
  are read from GitHub Actions secrets (not yet configured in the repo as of
  this writing — see §4). `YOPMAIL_URL` is hardcoded in the workflow since
  it isn't sensitive.
- **Job summary**: `.github/scripts/summary.js` reads the `json` reporter's
  output (`test-results/results.json`, only produced on CI) and writes a
  results table directly into the GitHub Actions run summary, so a result
  can be read without downloading and unzipping the HTML report.

### 2.10 Reporting

Three reporters run on every invocation: `list` (terminal, so a green run
still prints what it ran — the `html` reporter alone only prints failures),
`html` (`playwright-report/`, fastest path to a trace locally), and
`allure-playwright` (`allure-results/`, step timelines and attachments with
trend history across runs, served via `npm run allure:serve`). CI adds
`github` (inline PR annotations) and `json` (feeds the job-summary script).
Traces are captured `on-first-retry`, and retries only happen on CI, so
trace collection has no cost on local runs.

---


## 3. Known gaps and recommended next steps

Carried over from `scenarios.md`, ranked by value per unit of effort:

1. **Logout and session-expiry tests** (page-object methods `logout()` /
   `verifyLoggedOut()` already exist and are unused) — cheapest high-value
   addition.
2. **Console-error / failed-request listeners** — one shared fixture would
   add cross-cutting coverage to every existing test for near-zero added
   runtime.
3. **Search functionality** on both tables — `search()` already exists on
   both page objects, exercised by nothing.
4. **Restore metric-card assertions** — `dashboard-metrics.spec.ts`
   currently logs values instead of asserting them (regressed at some
   point).
5. **Negative login paths** (wrong password, wrong OTP) — no data risk,
   real coverage gap.
6. **Companies / TSR Chatbot / Help** — zero coverage, blocked on seeing
   those screens to write concrete locators.
7. **Destructive scenarios** (Add/Edit/Delete/Resend Invite, marked 💣 in
   `scenarios.md`) — highest remaining value but mutate shared dev data or
   send real email; need a decision on a throwaway test account or a
   teardown strategy before automating.
8. **Firefox/WebKit** — projects exist in `playwright.config.ts` but are
   commented out; every current "passing" claim is Chromium-only.
9. **CI secrets** — add the four required repo secrets so the already-built
   pipeline can actually execute instead of failing at config validation.
