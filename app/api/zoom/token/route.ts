import { NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function GET() {
  try {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60000) {
      return NextResponse.json({ access_token: cachedToken });
    }

    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!accountId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Zoom credentials not configured' },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Zoom token error:', error);
      return NextResponse.json(
        { error: 'Failed to get Zoom access token' },
        { status: 500 }
      );
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;

    return NextResponse.json({ access_token: data.access_token });
  } catch (error) {
    console.error('Error getting Zoom token:', error);
    return NextResponse.json(
      { error: 'Failed to get Zoom access token' },
      { status: 500 }
    );
  }
}
