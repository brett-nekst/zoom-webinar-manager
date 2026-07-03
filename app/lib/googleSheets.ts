import { google } from 'googleapis';

const DEFAULT_SHEET_ID = '1pt8LuAaMdLhpnpxVPod04QWaIEYiVKG2bkzf-E1VZM0';
const SHEET_RANGE = 'A:G';

export interface RegistrationRow {
  registrationDateTime: string;
  webinarDate: string;
  registrantName: string;
  email: string;
  topics: string;
  company: string;
  role: string;
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
            row.company,
            row.role,
          ],
        ],
      },
    });

    console.log('✅ Appended registration row to Google Sheet for:', row.email);
  } catch (error) {
    console.error('❌ Google Sheet append failed (non-fatal):', error);
  }
}
