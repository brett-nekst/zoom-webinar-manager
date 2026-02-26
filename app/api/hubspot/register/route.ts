import { NextRequest, NextResponse } from 'next/server';

// Map user-friendly role values to HubSpot dropdown values
function mapRoleToHubSpot(role: string): string {
  const roleMap: Record<string, string> = {
    'Individual Agent': 'agent-solo',
    'Real Estate Team': 'agent-team',
    'Independent Transaction Coordinator': 'tc-solo',
    "Team of TC's": 'tc-team',
    'Other': 'Other',
  };
  return roleMap[role] || 'Other';
}

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

    // 1. Submit to HubSpot Forms API (records form submission activity and triggers workflows)
    // NOTE: Only submitting basic contact fields to the form
    // Webinar-specific fields (date, time, link) are set via Contact API below
    const formFields: { name: string; value: string }[] = [
      { name: 'firstname', value: firstName },
      { name: 'lastname', value: lastName },
      { name: 'email', value: email },
    ];
    if (company) formFields.push({ name: 'company', value: company });
    if (role) {
      const mappedRole = mapRoleToHubSpot(role);
      formFields.push({ name: 'type_mktg', value: mappedRole });
    }

    const formSubmissionPayload = {
      fields: formFields,
      context: {
        pageUri: 'https://webinar.nekst.com/register',
        pageName: 'Nekst Bi-Weekly Webinar Registration',
        hutk: request.cookies.get('hubspotutk')?.value, // HubSpot tracking cookie
      },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: 'I agree to allow Nekst to store and process my personal data.',
        },
      },
    };

    console.log('Submitting to HubSpot form:', formId);
    console.log('Portal ID:', portalId);
    console.log('Form fields being submitted:', formFields.map(f => `${f.name}: ${f.value}`));
    console.log('Full payload:', JSON.stringify(formSubmissionPayload, null, 2));

    const formRes = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSubmissionPayload),
      }
    );

    if (!formRes.ok) {
      const err = await formRes.text();
      console.error('❌ HubSpot form submission FAILED');
      console.error('Status code:', formRes.status);
      console.error('Status text:', formRes.statusText);
      console.error('Response body:', err);
      console.error('⚠️  WORKFLOWS WILL NOT TRIGGER - Form submission failed!');

      // Try to parse error for more details
      try {
        const errorData = JSON.parse(err);
        console.error('Parsed error details:', JSON.stringify(errorData, null, 2));

        // Check for specific error types
        if (errorData.errors) {
          errorData.errors.forEach((error: any, index: number) => {
            console.error(`Error ${index + 1}:`, error.message || error);
            if (error.errorType) console.error(`  Type: ${error.errorType}`);
            if (error.propertyName) console.error(`  Property: ${error.propertyName}`);
          });
        }
      } catch (parseError) {
        console.error('Could not parse error JSON - raw error:', err);
      }

      // Continue anyway - we'll still create/update the contact directly
    } else {
      console.log('✅ Successfully submitted to HubSpot form');
      console.log('✅ Workflows should trigger for this registration');
      const formData = await formRes.json();
      console.log('Form submission response:', JSON.stringify(formData, null, 2));
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
        console.log('Found existing contact:', contactId);
      } else {
        console.log('No existing contact found for email:', email);
      }
    } else {
      const searchError = await searchRes.text();
      console.error('HubSpot contact search error:', searchError);
      // Continue anyway and try to create the contact
    }

    const contactProperties: Record<string, string | number> = {
      firstname: firstName,
      lastname: lastName,
    };
    if (company) contactProperties.company = company;
    if (role) {
      const mappedRole = mapRoleToHubSpot(role);
      contactProperties.type_mktg = mappedRole;
    }

    // Set webinar date for workflow triggers (Unix timestamp in milliseconds)
    if (meetingStartTime) {
      const timestamp = new Date(meetingStartTime).getTime();
      contactProperties.webinar_date = timestamp;
      console.log('Setting webinar_date:', timestamp, 'for date:', meetingStartTime);
    }

    // Set Zoom webinar join link
    if (joinUrl) {
      contactProperties.webinar_link = joinUrl;
      console.log('Setting webinar_link:', joinUrl);
    }

    if (contactId) {
      // 3a. Update existing contact
      console.log('Updating existing contact:', contactId);
      const updateRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ properties: contactProperties }),
      });

      if (!updateRes.ok) {
        const updateError = await updateRes.text();
        console.error('HubSpot contact update error:', updateError);
        // Non-fatal - continue with registration even if update fails
      } else {
        console.log('Successfully updated contact:', contactId);
      }
    } else {
      // 3b. Create new contact
      console.log('Creating new contact with email:', email);
      console.log('Contact properties:', { email, ...contactProperties });

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
        console.error('Failed to create contact with properties:', { email, ...contactProperties });

        // Try to parse the error response to provide more details
        let errorMessage = 'Failed to create HubSpot contact';
        try {
          const errorData = JSON.parse(err);
          if (errorData.message) {
            errorMessage += ': ' + errorData.message;
          }
          if (errorData.errors) {
            console.error('Detailed errors:', errorData.errors);
          }
        } catch (parseError) {
          console.error('Could not parse error response:', err);
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

      const createData = await createRes.json();
      contactId = createData.id;
      console.log('Successfully created new contact:', contactId);
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
