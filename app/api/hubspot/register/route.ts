import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, meetingId, meetingDate, meetingTopic, joinUrl } =
      await request.json();

    if (!firstName || !lastName || !email || !meetingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const portalId = process.env.HUBSPOT_PORTAL_ID;
    const formId = process.env.HUBSPOT_FORM_ID;
    const privateToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!portalId || !formId || !privateToken) {
      return NextResponse.json({ error: 'HubSpot credentials not configured' }, { status: 500 });
    }

    // 1. Submit to HubSpot Forms API (no auth required)
    const formPayload = {
      fields: [
        { name: 'firstname', value: firstName },
        { name: 'lastname', value: lastName },
        { name: 'email', value: email },
      ],
      context: {
        pageUri: 'https://zoom-webinar-manager.vercel.app/register',
        pageName: 'Nekst Tips & Tricks Webinar Registration',
      },
    };

    const formRes = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formPayload),
      }
    );

    if (!formRes.ok) {
      const err = await formRes.text();
      console.error('HubSpot form submission error:', err);
      return NextResponse.json({ error: 'Failed to submit to HubSpot' }, { status: 500 });
    }

    // 2. Look up or create the contact and add a note with meeting details
    // First, search for existing contact by email
    const searchRes = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${privateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: 'email', operator: 'EQ', value: email },
              ],
            },
          ],
          properties: ['email', 'firstname', 'lastname'],
          limit: 1,
        }),
      }
    );

    let contactId: string | null = null;

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.results?.length > 0) {
        contactId = searchData.results[0].id;
      }
    }

    // If no existing contact, create one
    if (!contactId) {
      const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${privateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            email,
            firstname: firstName,
            lastname: lastName,
          },
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        contactId = createData.id;
      }
    }

    // 3. Add a note to the contact with meeting registration details
    if (contactId) {
      const noteBody = `Registered for Nekst Tips & Tricks Webinar\nDate: ${meetingDate}\nTopic: ${meetingTopic}\nJoin URL: ${joinUrl}\nMeeting ID: ${meetingId}`;

      const noteRes = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${privateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            hs_note_body: noteBody,
            hs_timestamp: new Date().toISOString(),
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: 'HUBSPOT_DEFINED',
                  associationTypeId: 202, // Note to Contact
                },
              ],
            },
          ],
        }),
      });

      if (!noteRes.ok) {
        // Non-fatal: form submission already worked, just log the note failure
        console.error('HubSpot note creation failed:', await noteRes.text());
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
