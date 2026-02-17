import { NextRequest, NextResponse } from 'next/server';

async function getZoomToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom credentials not configured');
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
    throw new Error('Failed to get Zoom access token');
  }

  const data = await response.json();
  return data.access_token;
}

// DELETE - Cancel/delete a meeting
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const token = await getZoomToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      console.error('Zoom delete meeting error:', error);
      return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete meeting' },
      { status: 500 }
    );
  }
}

// PATCH - Update a meeting's topic/agenda
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const { topic, agenda } = await request.json();

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const token = await getZoomToken();

    const response = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, agenda }),
    });

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      console.error('Zoom update meeting error:', error);
      return NextResponse.json({ error: 'Failed to update meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update meeting' },
      { status: 500 }
    );
  }
}
