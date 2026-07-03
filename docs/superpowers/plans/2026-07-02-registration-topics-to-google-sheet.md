# Registration Topics → Google Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional "what do you hope to cover" field to the webinar registration form and append every signup as a row to a master Google Sheet, while leaving the existing HubSpot flow intact.

**Architecture:** A new isolated module (`app/lib/googleSheets.ts`) authenticates to the Google Sheets API with a service account and appends one row per registration. The existing registration API route calls it as a non-fatal side effect after its HubSpot steps. The registration form gains one optional textarea.

**Tech Stack:** Next.js 16 (App Router), TypeScript, `googleapis` (new dependency), Google Sheets API v4, service-account JWT auth.

## Global Constraints

- **No test framework exists in this project.** Verification is via `npx tsc --noEmit` (typecheck), `npm run lint`, and manual verification against the running dev server. Do NOT add a test runner.
- **Sheet ID:** `1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0` (used as the default for `REGISTRATION_SHEET_ID`).
- **Sheet columns, exact order (A–E):** Registration Date/Time | Webinar Date | Registrant Name | Email Address | What information are you hoping to cover?
- **Append only** to the first sheet tab, range `A:E`. Never write the header row.
- **Non-fatal Google writes:** a Sheet failure must be logged and swallowed; registration still returns `{ success: true }`.
- **Defensive env checks:** missing Google env vars → log a warning and no-op, matching the HubSpot credential-check style already in the route.
- **Times use `America/New_York`**, consistent with the form's existing date/time formatting.
- Dev server runs on `http://localhost:3000` (started via `./node_modules/.bin/next dev -p 3000`); admin password is in `.env.local`.

---

### Task 1: Add the `googleapis` dependency and the Sheets append module

**Files:**
- Modify: `package.json` (add `googleapis` dependency)
- Create: `app/lib/googleSheets.ts`
- Modify: `.env.local.example` (document the three env vars)

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `export async function appendRegistrationRow(row: RegistrationRow): Promise<void>` where
  ```ts
  interface RegistrationRow {
    registrationDateTime: string;
    webinarDate: string;
    registrantName: string;
    email: string;
    topics: string;
  }
  ```
  Never throws. Reads env `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `REGISTRATION_SHEET_ID`.

- [ ] **Step 1: Install `googleapis`**

Run:
```bash
cd "/Users/brettkeppler/Documents/Brett Personal/Nekst Backup 9-1-21/Claude/projects/zoom-webinar-manager"
npm install googleapis
```
Expected: `googleapis` added to `dependencies` in `package.json`; `package-lock.json` updated; exit code 0.

- [ ] **Step 2: Create the module**

Create `app/lib/googleSheets.ts` with exactly:

```ts
import { google } from 'googleapis';

const DEFAULT_SHEET_ID = '1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0';
const SHEET_RANGE = 'A:E';

export interface RegistrationRow {
  registrationDateTime: string;
  webinarDate: string;
  registrantName: string;
  email: string;
  topics: string;
}

/**
 * Append one registration row to the master Google Sheet.
 * Never throws — a failure is logged and swallowed so registration is never blocked.
 */
export async function appendRegistrationRow(row: RegistrationRow): Promise<void> {
  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const sheetId = process.env.REGISTRATION_SHEET_ID || DEFAULT_SHEET_ID;

    if (!clientEmail || !rawPrivateKey) {
      console.warn(
        '⚠️  Google Sheets not configured (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY missing) — skipping sheet append.'
      );
      return;
    }

    // Env vars store the PEM with literal "\n"; convert to real newlines.
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: SHEET_RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            row.registrationDateTime,
            row.webinarDate,
            row.registrantName,
            row.email,
            row.topics,
          ],
        ],
      },
    });

    console.log('✅ Appended registration row to Google Sheet for:', row.email);
  } catch (error) {
    console.error('❌ Google Sheet append failed (non-fatal):', error);
  }
}
```

- [ ] **Step 3: Document env vars in `.env.local.example`**

Append these lines to the end of `.env.local.example`:

```
# Google Sheets - master registration log
# Service account email (reuse an existing service account, or create one)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
# Service account private key (PEM). Keep the literal \n escapes on one line.
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_key_here\n-----END PRIVATE KEY-----\n"
# Master registration sheet ID (defaults to the shared sheet if omitted)
REGISTRATION_SHEET_ID=1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0
```

- [ ] **Step 4: Typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: exit code 0, no errors referencing `app/lib/googleSheets.ts`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/lib/googleSheets.ts .env.local.example
git commit -m "feat: add Google Sheets append module for registrations"
```

---

### Task 2: Wire the Sheet append + topics into the registration API route

**Files:**
- Modify: `app/api/hubspot/register/route.ts`

**Interfaces:**
- Consumes: `appendRegistrationRow` from `app/lib/googleSheets.ts` (see Task 1 signature).
- Produces: the route now accepts a `topics` string in the request body; response shape unchanged (`{ success: true, joinUrl }`).

- [ ] **Step 1: Import the module**

At the top of `app/api/hubspot/register/route.ts`, below the existing `next/server` import, add:

```ts
import { appendRegistrationRow } from '@/app/lib/googleSheets';
```

(Confirmed: `tsconfig.json` maps `@/*` → `./*`, so `@/app/lib/googleSheets` resolves correctly.)

- [ ] **Step 2: Destructure `topics` from the body**

In the `const { ... } = await request.json();` block, add `topics` to the destructured fields:

```ts
    const {
      firstName,
      lastName,
      email,
      company,
      role,
      topics,
      meetingId,
      meetingDate,
      meetingStartTime,
      meetingTopic,
      joinUrl,
    } = await request.json();
```

- [ ] **Step 3: Add topics to the HubSpot Note body**

Locate the `noteBody` array (the `const noteBody = [ ... ].join('\n');` block). Change it to conditionally include the topics line:

```ts
      const noteLines = [
        'Registered for Nekst Tips & Tricks Webinar',
        `Date: ${meetingDate}`,
        `Topic: ${meetingTopic}`,
        `Join URL: ${joinUrl}`,
        `Meeting ID: ${meetingId}`,
      ];
      if (topics) {
        noteLines.push(`Topics to cover: ${topics}`);
      }
      const noteBody = noteLines.join('\n');
```

- [ ] **Step 4: Append the Sheet row before the final success response**

Immediately before the final `return NextResponse.json({ success: true, joinUrl });` line (the one at the end of the `try` block), add:

```ts
    // Append to the master Google Sheet (non-fatal — never blocks registration).
    const registrationDateTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
    });
    await appendRegistrationRow({
      registrationDateTime,
      webinarDate: meetingDate || '',
      registrantName: `${firstName} ${lastName}`,
      email,
      topics: topics || '',
    });
```

- [ ] **Step 5: Typecheck and lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```
Expected: both exit 0. (Lint may warn on pre-existing `any` usage in this file — that is acceptable; ensure no NEW errors are introduced by these changes.)

- [ ] **Step 6: Commit**

```bash
git add app/api/hubspot/register/route.ts
git commit -m "feat: accept topics and append registrations to Google Sheet"
```

---

### Task 3: Add the topics textarea to the registration form

**Files:**
- Modify: `app/register/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: the POST body sent to `/api/hubspot/register` now includes `topics: string`.

- [ ] **Step 1: Add the `topics` state variable**

In `RegisterPage`, alongside the other `useState` field declarations (near `const [role, setRole] = useState('');`), add:

```ts
  const [topics, setTopics] = useState('');
```

- [ ] **Step 2: Include `topics` in the POST body**

In `handleSubmit`, in the `body: JSON.stringify({ ... })` object sent to `/api/hubspot/register`, add `topics` (place it after `role`):

```ts
          role,
          topics,
```

- [ ] **Step 3: Add the textarea to the form**

In the `step === 'form'` block, immediately AFTER the role `<div>` (the one containing the "What best describes your role?" `<select>`) and BEFORE the `{submitError && ( ... )}` block, insert:

```tsx
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: NAVY, marginBottom: '6px' }}>
                    What information are you hoping to cover? <span style={{ color: GRAY_TEXT, fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    placeholder="e.g. setting up my first workflow, syncing with my email, best practices for reminders..."
                    rows={4}
                    style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
                    onFocus={(e) => (e.target.style.borderColor = INPUT_FOCUS)}
                    onBlur={(e) => (e.target.style.borderColor = INPUT_BORDER)}
                  />
                </div>
```

- [ ] **Step 4: Typecheck and lint**

Run:
```bash
npx tsc --noEmit
npm run lint
```
Expected: both exit 0, no new errors.

- [ ] **Step 5: Manual verification in the browser**

Ensure the dev server is running (`./node_modules/.bin/next dev -p 3000`). Then:
1. Open `http://localhost:3000/register`.
2. Confirm the page loads (if Zoom env is unset, the date list may be empty/error — that is expected and unrelated; the goal here is to see the form renders. If no date can be selected, temporarily verify the textarea markup by reading the rendered HTML instead).
3. If a session is selectable, click Continue → confirm the "What information are you hoping to cover? (optional)" textarea appears after the role dropdown, matches the other inputs' styling, and is resizable.

Expected: textarea present, optional, styled consistently.

- [ ] **Step 6: Commit**

```bash
git add app/register/page.tsx
git commit -m "feat: add optional topics textarea to registration form"
```

---

### Task 4: End-to-end verification with Google credentials

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Set Google env vars locally**

With Brett's help, add the three vars to `.env.local`:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
REGISTRATION_SHEET_ID=1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0
```
Then share the sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Editor** in Google Sheets.

- [ ] **Step 2: Restart the dev server**

Env vars load at startup only. Stop the running server and relaunch:
```bash
pkill -f "next-server"; sleep 2
cd "/Users/brettkeppler/Documents/Brett Personal/Nekst Backup 9-1-21/Claude/projects/zoom-webinar-manager"
./node_modules/.bin/next dev -p 3000
```
Expected: startup log shows `Environments: .env.local`.

- [ ] **Step 3: POST a test registration directly to the API**

Run (bypasses the Zoom-dependent UI; exercises HubSpot + Sheet path). Note: if HubSpot env is also unset the route returns a 500 before reaching the sheet append, so for an isolated sheet test either set HubSpot env too, or temporarily test by confirming the append call runs. Preferred: set both HubSpot and Google env, then:
```bash
curl -s -X POST http://localhost:3000/api/hubspot/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test+sheet@nekst.com","role":"Individual Agent","topics":"Testing the new topics field","meetingId":12345,"meetingDate":"Monday, July 7, 2026","meetingStartTime":"2026-07-07T18:00:00Z","meetingTopic":"Nekst Tips & Tricks","joinUrl":"https://zoom.us/j/test"}'
```
Expected: `{"success":true,...}`.

- [ ] **Step 4: Confirm the row landed**

Open the master sheet (`https://docs.google.com/spreadsheets/d/1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0/edit`).
Expected: a new row appended below the header with: a timestamp, `Monday, July 7, 2026`, `Test User`, `test+sheet@nekst.com`, `Testing the new topics field`.

- [ ] **Step 5: Confirm non-fatal behavior**

Temporarily unset `REGISTRATION_SHEET_ID` to a bad value (or rename to an unshared sheet), restart, and repeat the curl.
Expected: response is still `{"success":true,...}`; the dev-server log shows `❌ Google Sheet append failed (non-fatal)`. Restore the correct sheet ID afterward.

---

## Self-Review

**Spec coverage:**
- Optional topics form field → Task 3 ✓
- Sheet append module, service-account auth, no-op on missing env, never throws → Task 1 ✓
- Column order matches existing 5 headers, append `A:E` first tab → Task 1 (module) + Task 2 (values) ✓
- HubSpot flow unchanged + topics added to Note → Task 2 (Steps 3) ✓
- Non-fatal Sheet write, registration still succeeds → Task 1 (try/catch) + Task 2 (Step 4) + Task 4 (Step 5) ✓
- Env vars documented (`.env.local.example`) → Task 1 (Step 3) ✓
- Eastern timezone for registration timestamp → Task 2 (Step 4) ✓
- One-time Google setup / verification → Task 4 ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases" — all steps contain concrete code or exact commands.

**Type consistency:** `appendRegistrationRow(row: RegistrationRow)` and its five string fields are used identically in Task 1 (definition), Task 2 (call site). Body field `topics` is consistent across Tasks 2 and 3.
```
