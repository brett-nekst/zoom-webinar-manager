import { NextResponse } from 'next/server';

// Reports whether each integration's env vars are present. It never returns
// the values themselves — only which var names are set vs missing — so no
// secrets reach the browser. This is a presence check, not a live connectivity
// test: "configured" means the vars exist, not that the credentials work.

interface IntegrationStatus {
  key: string;
  label: string;
  configured: boolean;
  missing: string[];
  required: string[];
  whatItDoes: string;
  setupHint: string;
}

function check(
  key: string,
  label: string,
  required: string[],
  whatItDoes: string,
  setupHint: string
): IntegrationStatus {
  const missing = required.filter((name) => !process.env[name]);
  return { key, label, required, missing, configured: missing.length === 0, whatItDoes, setupHint };
}

export async function GET() {
  const integrations: IntegrationStatus[] = [
    check(
      'zoom',
      'Zoom',
      ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'ZOOM_USER_ID'],
      'Creates and manages the Wednesday webinar meetings in your Zoom account.',
      'Add these from your Zoom Server-to-Server OAuth app, then restart the dev server.'
    ),
    check(
      'hubspot',
      'HubSpot',
      ['HUBSPOT_PORTAL_ID', 'HUBSPOT_FORM_ID', 'HUBSPOT_PRIVATE_APP_TOKEN'],
      'Records each registrant as a HubSpot contact and triggers reminder workflows.',
      'Add your HubSpot portal ID, form ID, and private app token, then restart.'
    ),
    // Google Sheet is "configured" when the service account can authenticate.
    // REGISTRATION_SHEET_ID has a hardcoded default, so it is not required here.
    check(
      'googleSheet',
      'Google Sheet',
      ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'],
      'Appends every registration (name, email, session, topics) to the master log sheet.',
      'Add the service account email and private key, share the sheet with that email, then restart.'
    ),
  ];

  return NextResponse.json({ integrations });
}
