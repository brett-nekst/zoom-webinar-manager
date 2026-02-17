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

// GET - List all scheduled meetings
export async function GET() {
  try {
    const token = await getZoomToken();

    const response = await fetch(
      'https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Zoom list meetings error:', error);
      return NextResponse.json({ error: 'Failed to list meetings' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data.meetings || []);
  } catch (error) {
    console.error('Error listing meetings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list meetings' },
      { status: 500 }
    );
  }
}

// POST - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const { topic, date, duration, agenda } = await request.json();

    if (!topic || !date) {
      return NextResponse.json(
        { error: 'Topic and date are required' },
        { status: 400 }
      );
    }

    const token = await getZoomToken();

    // Build start_time: date at 14:00 Eastern
    // Pass timezone separately so Zoom handles DST correctly
    const startTime = `${date}T14:00:00`;

    const meetingPayload = {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration: duration || 60,
      timezone: 'America/New_York',
      agenda: agenda || '',
      settings: {
        host_video: true,
        participant_video: false,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        approval_type: 2, // No registration required (manual invite/link sharing)
        audio: 'both',
        auto_recording: 'none',
      },
    };

    const response = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meetingPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Zoom create meeting error:', error);
      return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
    }

    const meeting = await response.json();
    return NextResponse.json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
