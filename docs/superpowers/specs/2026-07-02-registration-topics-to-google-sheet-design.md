# Design: "Topics to Cover" Field → Master Google Sheet

**Date:** 2026-07-02
**Status:** Approved for planning

## Overview

Add an optional free-text field to the webinar registration form asking what
the registrant hopes to have covered during the training call. On submit, every
registration continues to flow to HubSpot exactly as it does today, and
additionally gets appended as one new row to a master Google Sheet.

A failed Google Sheet write is logged but never blocks the registration — the
same non-fatal pattern already used for HubSpot note/form failures. Registration
succeeds as long as the existing HubSpot flow succeeds.

## Goals

- Collect an optional "what do you hope to cover" note from each registrant.
- Append every signup (with their note) as an ongoing row to an existing master
  Google Sheet.
- Keep the current HubSpot behavior fully intact.

## Non-Goals

- No change to HubSpot workflows, properties, or the Forms API submission.
- No new admin UI for viewing topics (they live in the Sheet and the HubSpot note).
- No backfill of past registrations into the Sheet.

## The Master Google Sheet

- **Sheet ID:** `1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0`
- The sheet already exists and already has a header row. The app appends rows
  only; it never writes or edits the header.
- **Existing columns (order must be matched exactly):**

  | A | B | C | D | E |
  |---|---|---|---|---|
  | Registration Date/Time | Webinar Date | Registrant Name | Email Address | What information are you hoping to cover? |

- Rows are appended to range `A:E` of the **first sheet tab**.

## Component 1 — Registration Form

**File:** `app/register/page.tsx`

- Add a `topics` state variable (`useState('')`).
- Add a `<textarea>` on the `form` step, placed **after the role dropdown** and
  before the submit button.
- **Label:** `What information are you hoping to cover? (optional)` — voice
  matches existing optional labels; no red asterisk.
- **Optional field.** Users can submit with it blank.
- Styled with the existing `inputStyle`, plus `minHeight: '90px'`,
  `resize: 'vertical'`, and `fontFamily: 'inherit'`, so it matches the other
  inputs. Reuses the existing `onFocus`/`onBlur` border-color handlers.
- Include `topics` in the existing POST body to `/api/hubspot/register`.

## Component 2 — Google Sheets Module (new, isolated)

**File:** `app/lib/googleSheets.ts`

Single responsibility: append one registration row to the master Sheet.

**Interface:**

```ts
export async function appendRegistrationRow(row: {
  registrationDateTime: string; // pre-formatted display string (Eastern)
  webinarDate: string;          // the session's dateLabel
  registrantName: string;       // "First Last"
  email: string;
  topics: string;               // may be empty string
}): Promise<void>
```

**Behavior:**

- Reads env vars:
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (PEM; `\n` escapes normalized to real
    newlines before use)
  - `REGISTRATION_SHEET_ID` (defaults to the ID above if unset)
- If any required env var is missing, logs a warning and returns without doing
  anything (no-op) — mirrors the defensive credential checks in the HubSpot
  route so the app still runs locally without Google configured.
- Authenticates via the `googleapis` library using a `google.auth.JWT` /
  `GoogleAuth` service-account credential with scope
  `https://www.googleapis.com/auth/spreadsheets`.
- Calls `sheets.spreadsheets.values.append` on range `A:E` with
  `valueInputOption: 'USER_ENTERED'`, passing the five values in column order.
- **Never throws to the caller.** All errors are caught and logged; the function
  resolves normally so the caller's registration flow is never blocked.

**Dependency:** add `googleapis` to `package.json`.

## Component 3 — API Route Wiring

**File:** `app/api/hubspot/register/route.ts`

- Destructure `topics` from the request body (alongside the existing fields).
- **HubSpot flow unchanged.** As a small addition, append the topics to the
  existing contact Note body — one extra line, only when `topics` is non-empty,
  e.g. `Topics to cover: <topics>`.
- After the existing HubSpot steps complete and before returning the success
  response, call `appendRegistrationRow(...)`:
  - `registrationDateTime`: current time formatted for Eastern
    (`America/New_York`), consistent with how the form labels session times.
  - `webinarDate`: the `meetingDate` value already received in the body.
  - `registrantName`: `` `${firstName} ${lastName}` ``.
  - `email`, `topics`: as received.
- The call is wrapped so any failure is logged only and does not change the
  response — registration still returns `{ success: true }`.

## Data Flow

```
register/page.tsx (form, incl. topics)
        │  POST { ...fields, topics }
        ▼
api/hubspot/register/route.ts
        ├─► HubSpot Forms API      (unchanged)
        ├─► HubSpot contact upsert (unchanged)
        ├─► HubSpot Note           (+ "Topics to cover" line)
        └─► appendRegistrationRow  → Google Sheet row  (non-fatal)
        │
        ▼
  { success: true, joinUrl }
```

## Error Handling

- Missing Google env vars → module no-ops with a warning; registration
  unaffected.
- Google API error at append time → caught and logged; registration still
  succeeds.
- Existing HubSpot error handling is unchanged.

## Environment Variables

Add to `.env.local` (local) and Vercel (production):

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `REGISTRATION_SHEET_ID=1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0`

Also add these three names to `.env.local.example` (with placeholder values).

## One-Time Google Setup

Because Brett already has Google service accounts set up for other tools, the
fast path is:

1. Reuse an existing service account — grab its client email and private key.
2. Ensure the **Google Sheets API** is enabled in that account's Google Cloud
   project.
3. **Share the master Sheet** (`1pt8Lu…VZM0`) with the service account email,
   granting **Editor**.
4. Set the three env vars locally and in Vercel.

If starting fresh instead: create a Google Cloud project → create a service
account → create a JSON key → enable the Sheets API → then steps 3–4 above.

## Testing / Verification

- **Local, no Google env:** submit a registration → HubSpot path runs, module
  logs a "not configured" warning, registration succeeds. No crash.
- **Local, Google env set:** submit a registration → a new row appears in the
  Sheet with the five columns populated (topics blank when left empty).
- **Failure simulation:** with an invalid Sheet ID or unshared sheet, submit →
  registration still succeeds and the Sheets error is logged.
- Confirm the form textarea renders, is optional, and matches the existing
  input styling.
```
