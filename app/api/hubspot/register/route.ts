import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const {
      firstName,
      lastName,
      email,
      company,
      role,
      meetingId,
      meetingDate,
      meetingStartTime,
      meetingTopic,
      joinUrl,
    } = await request.json();

    if (!firstName || !lastName || !email || !meetingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const portalId = process.env.HUBSPOT_PORTAL_ID;
    const formId = process.env.HUBSPOT_FORM_ID;
    const privateToken = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

    if (!portalId || !formId || !privateToken) {
      return NextResponse.json({ error: 'HubSpot credentials not configured' }, { status: 500 });
    }

    const authHeaders = {
      Authorization: `Bearer ${privateToken}`,
      'Content-Type': 'application/json',
    };

    // 1. Submit to HubSpot Forms API (records form submission activity)
    const formFields: { name: string; value: string }[] = [
      { name: 'firstname', value: firstName },
      { name: 'lastname', value: lastName },
      { name: 'email', value: email },
    ];
    if (company) formFields.push({ name: 'company', value: company });
    if (role) formFields.push({ name: 'type_mktg', value: role });

    const formRes = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: formFields,
          context: {
            pageUri: 'https://zoom-webinar-manager.vercel.app/register',
            pageName: 'Nekst Tips & Tricks Webinar Registration',
          },
        }),
      }
    );

    if (!formRes.ok) {
      const err = await formRes.text();
      console.error('HubSpot form submission error:', err);
      // Non-fatal — fall through to Contacts API
    }

    // 2. Search for existing contact by email
    const searchRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: authHeaders,
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

    const contactProperties: Record<string, string> = {
      firstname: firstName,
      lastname: lastName,
    };
    if (company) contactProperties.company = company;
    if (role) contactProperties.type_mktg = role;

    // Set webinar date for workflow triggers (YYYY-MM-DD format)
    if (meetingStartTime) {
      const webinarDate = meetingStartTime.split('T')[0];
      contactProperties.webinar_date = webinarDate;
    }

    if (contactId) {
      // 3a. Update existing contact
      await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ properties: contactProperties }),
      });
    } else {
      // 3b. Create new contact
      const createRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          properties: { email, ...contactProperties },
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

    // 4. Add a note with meeting registration details
    if (contactId) {
      const noteBody = [
        'Registered for Nekst Tips & Tricks Webinar',
        `Date: ${meetingDate}`,
        `Topic: ${meetingTopic}`,
        `Join URL: ${joinUrl}`,
        `Meeting ID: ${meetingId}`,
      ].join('\n');

      const noteRes = await fetch('https://api.hubapi.com/crm/v3/objects/notes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          properties: {
            hs_note_body: noteBody,
            hs_timestamp: new Date().toISOString(),
          },
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
            },
          ],
        }),
      });

      if (!noteRes.ok) {
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
