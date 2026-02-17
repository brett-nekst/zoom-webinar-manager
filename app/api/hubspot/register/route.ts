import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, meetingId, meetingDate, meetingTopic, joinUrl } =
      await request.json();

    if (!firstName || !lastName || !email || !meetingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const privateToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!privateToken) {
      return NextResponse.json({ error: 'HubSpot credentials not configured' }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${privateToken}`,
      'Content-Type': 'application/json',
    };

    // 1. Search for existing contact by email
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filterGroups: [
          { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] },
        ],
        properties: ['email', 'firstname', 'lastname'],
        limit: 1,
      }),
    });

    let contactId: string | null = null;

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.results?.length > 0) {
        contactId = searchData.results[0].id;
      }
    }

    if (contactId) {
      // 2a. Update existing contact
      await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          properties: { firstname: firstName, lastname: lastName },
        }),
      });
    } else {
      // 2b. Create new contact
      const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          properties: { email, firstname: firstName, lastname: lastName },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error('HubSpot contact creation error:', err);
        return NextResponse.json({ error: 'Failed to create HubSpot contact' }, { status: 500 });
      }

      const createData = await createRes.json();
      contactId = createData.id;
    }

    // 3. Add a note with meeting registration details
    if (contactId) {
      const noteBody = `Registered for Nekst Tips & Tricks Webinar\nDate: ${meetingDate}\nTopic: ${meetingTopic}\nJoin URL: ${joinUrl}\nMeeting ID: ${meetingId}`;

      const noteRes = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          properties: {
            hs_note_body: noteBody,
            hs_timestamp: new Date().toISOString(),
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                { associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 },
              ],
            },
          ],
        }),
      });

      if (!noteRes.ok) {
        console.error('HubSpot note creation failed:', await noteRes.text());
        // Non-fatal — contact was created/updated successfully
      }
    }

    return NextResponse.json({ success: true, joinUrl });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    );
  }
}
