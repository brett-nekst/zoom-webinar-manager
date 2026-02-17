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

  if (!response.ok) throw new Error('Failed to get Zoom access token');
  const data = await response.json();
  return data.access_token;
}

function getNextWednesdays(count: number): string[] {
  const results: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay();
  const daysUntilWed = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;
  d.setDate(d.getDate() + daysUntilWed);

  for (let i = 0; i < count; i++) {
    results.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 7);
  }
  return results;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// GET - Called by Vercel Cron every Wednesday at 8 AM ET
export async function GET(request: NextRequest) {
  // Verify this is being called by Vercel Cron (or authorized manually)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: { date: string; action: string; topic?: string; error?: string }[] = [];

  try {
    const token = await getZoomToken();
    const targetDates = getNextWednesdays(3);

    // Fetch all existing scheduled meetings
    const listRes = await fetch(
      'https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=300',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!listRes.ok) throw new Error('Failed to list existing meetings');

    const listData = await listRes.json();
    const existingMeetings: { start_time: string }[] = listData.meetings || [];

    // Find which Wednesdays already have a meeting
    const existingDates = new Set(
      existingMeetings.map((m) =>
        new Date(m.start_time).toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
        })
      )
    );

    // Create meetings for any Wednesdays that don't already have one
    for (const date of targetDates) {
      if (existingDates.has(date)) {
        results.push({ date, action: 'skipped - already exists' });
        continue;
      }

      const label = formatDateLabel(date);
      const topic = `Weekly Webinar - ${label}`;

      const createRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          type: 2,
          start_time: `${date}T14:00:00`,
          duration: 60,
          timezone: 'America/New_York',
          settings: {
            host_video: true,
            participant_video: false,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
            approval_type: 2,
            audio: 'both',
            auto_recording: 'none',
          },
        }),
      });

      if (createRes.ok) {
        results.push({ date, action: 'created', topic });
      } else {
        const err = await createRes.text();
        results.push({ date, action: 'failed', error: err });
      }
    }

    console.log('Cron: create-weekly-meetings results:', results);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}
