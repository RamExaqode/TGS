# UI Test Scenarios — TurnkeySR Admin

Full scenario inventory for `admin.dev.turnkeysr.ai`, with current automation
status. Everything here is browser-driven.

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Automated and passing |
| 🟡 | Partially automated — some assertions still missing |
| ⬜ | Not automated yet, no blocker |
| 🔒 | Blocked — needs a decision or information before it can be written |
| 💣 | Mutates data. Needs explicit approval before automating against dev |

Priority: **P1** critical path · **P2** important · **P3** nice to have

---

## Coverage summary

| Area | Scenarios | Automated | Coverage |
|---|---|---|---|
| Authentication & session | 12 | 2 | 17% |
| Dashboard | 18 | 5 | 28% |
| Navigation & layout | 14 | 6 | 43% |
| TSR Users page | 22 | 6 | 27% |
| Companies | 10 | 0 | 0% |
| TSR Chatbot | 6 | 0 | 0% |
| Help | 4 | 0 | 0% |
| Cross-cutting | 16 | 0 | 0% |
| **Total** | **102** | **19** | **~19%** |

Automated today: 6 test files — `dashboard.spec.ts`, `login.spec.ts` (currently
`test.skip`), `navigation.spec.ts`, `dashboard-metrics.spec.ts`,
`non-accepting-users.spec.ts`, `tsr-users.spec.ts`.

---

## 1. Authentication & session

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 1.1 | Log in with valid credentials, OTP verifies, lands on dashboard | P1 | ✅ | `login.spec.ts`. Opts out of the shared session and spends its own OTP |
| 1.2 | Session is saved and reused across tests | P1 | ✅ | `setup/auth.setup.ts` + `storageState` |
| 1.3 | Login page renders email, password and Sign in | P1 | ✅ | `verifyLoginPageLoaded()` |
| 1.4 | Invalid password shows an error, stays on `/login` | P1 | ⬜ | Needs the error copy |
| 1.5 | Unregistered email shows an error | P2 | ⬜ | Confirm whether the message differs from 1.4 — leaking that would be an enumeration issue |
| 1.6 | Empty email / password blocks submit | P2 | ⬜ | |
| 1.7 | Malformed email is rejected client-side | P3 | ⬜ | |
| 1.8 | Wrong OTP is rejected, stays on `/verify-otp` | P1 | ⬜ | Six wrong digits |
| 1.9 | Expired OTP is rejected | P2 | 🔒 | Needs the 15-minute window, or a way to force expiry |
| 1.10 | OTP resend issues a new code and invalidates the old one | P2 | 🔒 | Is there a resend control on `/verify-otp`? |
| 1.11 | Visiting a protected route unauthenticated redirects to `/login` | P1 | ⬜ | Clear `storageState`, `goto('/users')` |
| 1.12 | Expired token forces re-login | P2 | 🔒 | Tokens last 15 min; needs a saved-session-ageing strategy |

---

## 2. Dashboard

### 2.1 Stat cards

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 2.1.1 | All six cards render with a value and a unit | P1 | ✅ | `verifyAllMetricCardsVisible()` |
| 2.1.2 | Every value is a whole non-negative number | P1 | 🟡 | Was asserted; current spec only logs. Worth restoring |
| 2.1.3 | Units are correct per card (Users / Companies / Hours) | P2 | 🟡 | Read but not asserted |
| 2.1.4 | Cards export to CSV | P2 | 🟡 | Export was removed from the spec in its last edit |
| 2.1.5 | Card totals agree with their source lists | P2 | ⬜ | e.g. Companies count vs the Companies page total |
| 2.1.6 | Card tooltips / `aria-label` describe the metric | P3 | ⬜ | Each card carries a descriptive `aria-label` already |
| 2.1.7 | Kebab menu on 4 of the 6 cards opens and offers period options | P2 | ⬜ | Total Users and Companies have no kebab |
| 2.1.8 | Changing the period changes the value | P2 | ⬜ | Depends on 2.1.7 |

### 2.2 User Locations map

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 2.2.1 | Map renders with the active-users caption | P2 | ⬜ | Caption reads `Active users (N)` |
| 2.2.2 | Caption count matches the Active Users card | P2 | ⬜ | Screenshots showed 106 vs 105 — worth checking whether they should agree |
| 2.2.3 | Period dropdown (Quarterly) opens and switches | P2 | ⬜ | |
| 2.2.4 | Hovering a country shows its tooltip | P3 | ⬜ | jVectorMap tooltips exist in the DOM |

### 2.3 Non-accepting users panel

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 2.3.1 | Table renders with all four columns | P1 | ✅ | `verifyLoaded()` |
| 2.3.2 | Every page walked, all rows collected to CSV | P1 | ✅ | 81 rows confirmed |
| 2.3.3 | Collected count equals the footer total | P1 | ✅ | `verifyRowCountMatchesTotal()` |
| 2.3.4 | Search by name filters the table | P2 | ⬜ | `search()` exists, no test uses it |
| 2.3.5 | Search by email filters the table | P2 | ⬜ | |
| 2.3.6 | Search by company filters the table | P2 | ⬜ | This panel's placeholder includes company; the `/users` one does not |
| 2.3.7 | Search with no matches shows an empty state | P2 | ⬜ | Need the empty-state copy |
| 2.3.8 | Clearing search restores the full list | P2 | ⬜ | |
| 2.3.9 | Column sort toggles ascending / descending | P2 | ⬜ | Headers carry `MuiTableSortLabel` — sorting is wired up |
| 2.3.10 | Previous is disabled on page 1, Next on the last page | P2 | 🟡 | Relied on, not asserted |
| 2.3.11 | Jumping to a numbered page loads that page | P2 | ⬜ | Numbered pager is separate from the arrows |
| 2.3.12 | Resend Invite sends and confirms | P2 | 💣 | Sends a real email to a real address |

---

## 3. Navigation & layout

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 3.1 | All six sidebar items are visible | P1 | ✅ | `verifySidebarVisible()` |
| 3.2 | Each item is clickable | P1 | ✅ | `verifyItemClickable()` |
| 3.3 | Each item opens its route | P1 | ✅ | `verifyRoute()` — Home redirects `/` → `/dashboard` |
| 3.4 | Top-bar title matches the section | P1 | 🟡 | Only Home and TSR Users confirmed; Companies, Chatbot, Help still report-only |
| 3.5 | Active item is highlighted | P2 | ⬜ | `Mui-selected` class is applied |
| 3.6 | Sidebar survives navigation | P1 | ✅ | Re-asserted after every hop |
| 3.7 | Logout ends the session and returns to `/login` | P1 | ⬜ | `logout()` + `verifyLoggedOut()` exist, unused |
| 3.8 | After logout, Back does not restore the session | P1 | ⬜ | |
| 3.9 | Sidebar collapse toggle (‹) collapses and expands | P2 | ⬜ | |
| 3.10 | Collapsed state persists across navigation | P3 | ⬜ | |
| 3.11 | Logo links to home | P3 | ⬜ | Anchor with `href="/"` |
| 3.12 | Footer shows the signed-in user's name and email | P2 | ⬜ | Sidebar bottom shows both |
| 3.13 | Header avatar shows the user's initials | P3 | ⬜ | Renders `Bp` |
| 3.14 | Unknown route shows a 404 / redirect | P2 | ⬜ | `goto('/does-not-exist')` |

---

## 4. TSR Users page (`/users`)

### 4.1 Tabs and layout

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 4.1.1 | Page opens from the sidebar with the right title | P1 | ✅ | `tsr-users.spec.ts` |
| 4.1.2 | Both tabs are visible | P1 | ✅ | `verifyLoaded()` |
| 4.1.3 | TSR Users tab is active by default | P2 | ⬜ | |
| 4.1.4 | Switching tabs swaps the table | P1 | ✅ | Verified via the card heading |
| 4.1.5 | Tab switch does not change the URL | P2 | ⬜ | Confirmed manually, not asserted — worth locking in |
| 4.1.6 | Active tab is visually marked | P3 | ⬜ | |

### 4.2 TSR Users list

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 4.2.1 | All rows collected across pages to CSV | P1 | ✅ | |
| 4.2.2 | Collected count equals the footer total | P1 | ✅ | 18 rows |
| 4.2.3 | Every row has name, role and a valid email | P1 | ✅ | |
| 4.2.4 | Roles are within the known set (Admin / Super admin) | P2 | ⬜ | Cheap and catches data corruption |
| 4.2.5 | Avatar initials match the name | P3 | ⬜ | |
| 4.2.6 | Search by name filters | P2 | ⬜ | |
| 4.2.7 | Search by email filters | P2 | ⬜ | |
| 4.2.8 | No-match search shows an empty state | P2 | ⬜ | |
| 4.2.9 | Pagination arrows and numbered pager agree | P2 | ⬜ | |
| 4.2.10 | Edit opens the edit form pre-filled | P2 | ⬜ | Read-only up to opening the form |
| 4.2.11 | Edit saves a change | P2 | 💣 | Modifies a real user |
| 4.2.12 | Edit cancel discards changes | P2 | ⬜ | Safe if nothing is saved |
| 4.2.13 | Delete asks for confirmation | P2 | ⬜ | Safe if the dialog is cancelled |
| 4.2.14 | Delete removes the user | P1 | 💣 | Destructive |
| 4.2.15 | Delete is disabled for the signed-in user | P2 | ⬜ | The `bansari.p` row's delete looks greyed out |
| 4.2.16 | Add TSR Admin opens the form | P1 | ⬜ | Safe up to opening |
| 4.2.17 | Add TSR Admin validates required fields | P2 | ⬜ | Submitting empty should be safe |
| 4.2.18 | Add TSR Admin rejects a duplicate email | P2 | ⬜ | |
| 4.2.19 | Add TSR Admin creates a user | P1 | 💣 | Creates real data and sends an invite |

### 4.3 Non-accepting tab

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 4.3.1 | All rows collected across pages to CSV | P1 | ✅ | 8 rows |
| 4.3.2 | Count equals the footer total | P1 | ✅ | |
| 4.3.3 | This list and the TSR Users list share no one | P2 | ⬜ | Would have caught a status-filter bug |
| 4.3.4 | Resend Invite shows a confirmation | P2 | 💣 | Sends a real email |

---

## 5. Companies (`/companies`)

🔒 Screen not seen yet — scenarios are inferred from the pattern the other
pages follow. Send the page's HTML or a screenshot and these become concrete.

| # | Scenario | Pri | Status |
|---|---|---|---|
| 5.1 | Page opens from the sidebar with the right title | P1 | ⬜ |
| 5.2 | Company list renders with its columns | P1 | ⬜ |
| 5.3 | All companies collected across pages | P1 | ⬜ |
| 5.4 | Count matches the Companies stat card (135) | P2 | ⬜ |
| 5.5 | Search filters the list | P2 | ⬜ |
| 5.6 | Sorting works | P2 | ⬜ |
| 5.7 | Opening a company shows its detail | P1 | ⬜ |
| 5.8 | Add company form validates | P2 | ⬜ |
| 5.9 | Add company creates a record | P1 | 💣 |
| 5.10 | Delete company | P2 | 💣 |

---

## 6. TSR Chatbot (`/website-chatbot`)

🔒 Screen not seen yet.

| # | Scenario | Pri | Status |
|---|---|---|---|
| 6.1 | Page opens from the sidebar with the right title | P1 | ⬜ |
| 6.2 | Chat widget renders | P1 | ⬜ |
| 6.3 | Sending a message returns a reply | P1 | ⬜ |
| 6.4 | Empty message cannot be sent | P2 | ⬜ |
| 6.5 | History persists across navigation | P2 | ⬜ |
| 6.6 | Long / special-character input is handled | P3 | ⬜ |

---

## 7. Help (`/help`)

🔒 Screen not seen yet.

| # | Scenario | Pri | Status |
|---|---|---|---|
| 7.1 | Page opens from the sidebar with the right title | P1 | ⬜ |
| 7.2 | Help content renders | P1 | ⬜ |
| 7.3 | Links resolve (no 404s) | P2 | ⬜ |
| 7.4 | Support contact / form works | P2 | ⬜ |

---

## 8. Cross-cutting

| # | Scenario | Pri | Status | Notes |
|---|---|---|---|---|
| 8.1 | No console errors on any page | P2 | ⬜ | `page.on('console')` across the nav walk — cheap, high value |
| 8.2 | No failed network requests (4xx/5xx) | P2 | ⬜ | `page.on('response')` |
| 8.3 | Layout holds at tablet width | P2 | ⬜ | Config currently pins `viewport: null` + maximised |
| 8.4 | Layout holds at mobile width | P2 | ⬜ | |
| 8.5 | Tables scroll rather than overflow on narrow screens | P2 | ⬜ | |
| 8.6 | Keyboard-only navigation reaches every control | P2 | ⬜ | |
| 8.7 | Focus is visible throughout | P2 | ⬜ | |
| 8.8 | No detectable accessibility violations | P2 | ⬜ | Needs `@axe-core/playwright` |
| 8.9 | Images have alt text | P3 | ⬜ | |
| 8.10 | Slow network still renders (no infinite spinner) | P2 | ⬜ | Route interception with a delay |
| 8.11 | API failure surfaces an error, not a blank page | P1 | ⬜ | `page.route()` returning 500 — high value, no data risk |
| 8.12 | Empty states render when a list has no rows | P2 | ⬜ | Mock an empty response |
| 8.13 | Dashboard loads within a time budget | P3 | ⬜ | |
| 8.14 | Browser Back / Forward keep the app consistent | P2 | ⬜ | |
| 8.15 | Refresh preserves the current page and session | P2 | ⬜ | |
| 8.16 | Suite passes on Firefox and WebKit | P2 | ⬜ | Both projects are commented out in the config |

---

## Recommended next steps

Ranked by value per unit of effort:

1. **Logout and session-expiry** (3.7, 3.8, 1.11) — page objects already exist; three short tests
2. **Console-error and failed-request listeners** (8.1, 8.2) — one fixture, applies to every existing test at no extra runtime
3. **Search on both tables** (2.3.4–2.3.8, 4.2.6–4.2.8) — `search()` is already on both page objects and unused
4. **Restore the metric assertions** (2.1.2–2.1.4) — the spec regressed to logging only
5. **Negative login paths** (1.4, 1.8) — no data risk, real coverage
6. **Failed-response and empty-state rendering** (8.11, 8.12) — `page.route()` mocking, no dev data touched
7. **Companies / Chatbot / Help** — blocked on seeing the screens

## Two things needing a decision

**Destructive scenarios (💣).** Add, edit, delete and resend-invite all mutate
the shared dev environment or send real email to real addresses. They are the
highest-value untested paths and also the ones most likely to annoy someone.
Options: a dedicated throwaway test account, a teardown that reverses each
change, or leaving them manual.

**Firefox and WebKit (8.16).** Both projects exist in the config but are
commented out, so every claim of "it works" currently means "it works in
Chromium".
