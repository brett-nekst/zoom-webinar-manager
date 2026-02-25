# HubSpot Webinar Registration Troubleshooting Guide

## Issues Addressed

### 1. "Failed to create a Hubspot contact"
New contacts can't register for webinars because they don't exist in your HubSpot CRM.

### 2. Workflows Not Triggering
Form submissions complete but HubSpot workflows for reminders and confirmations don't trigger.

## Recent Fixes Applied

The code has been updated to:
1. **Include webinar fields in form submission** - `webinar_date` and `webinar_link` are now submitted to the form
2. **Enhanced form submission logging** - See exactly what's being submitted and whether it succeeds
3. **Better error messages** - Specific details from HubSpot API errors
4. **Improved contact creation** - Detailed logging at every step
5. **Workflow trigger verification** - Logs confirm when workflows should trigger

## Common Causes and Solutions

### 1. Missing or Invalid HubSpot Private App Token

**Symptom:** Error when creating new contacts

**Solution:**
1. Go to HubSpot Settings > Integrations > Private Apps
2. Create a new Private App or update existing one
3. Ensure the following scopes are enabled:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.notes.write` (for creating registration notes)
4. Copy the Private App token
5. Update your `.env.local` file with:
   ```
   HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-your_token_here
   ```

### 2. Workflows Not Triggering After Form Submission

**Symptom:** Contacts are created/updated but workflow emails/reminders don't send

**Root Cause:** The HubSpot form submission is failing, so workflows based on form submissions don't trigger.

**Solution:**

**Step 1: Verify Form Configuration**
1. Go to HubSpot Marketing > Forms
2. Find your webinar registration form
3. Verify the Form ID matches your `.env.local`:
   ```
   HUBSPOT_FORM_ID=your_form_id_here
   ```
4. Ensure these fields exist on the form:
   - `firstname`
   - `lastname`
   - `email`
   - `company` (optional)
   - `type_mktg` (optional - for role)
   - **`webinar_date`** (REQUIRED for workflow triggers)
   - **`webinar_link`** (REQUIRED for workflow triggers)

**Step 2: Add Missing Fields to Your Form**
If `webinar_date` or `webinar_link` are missing:
1. Edit your HubSpot form
2. Add these fields (they can be hidden fields)
3. Save the form

**Step 3: Verify Workflow Trigger**
1. Go to HubSpot Automation > Workflows
2. Open your webinar reminder workflow
3. Check the enrollment trigger - it should be based on:
   - Form submission (your webinar registration form)
   - OR property change (`webinar_date` is set)
4. Make sure the workflow is turned ON

**Step 4: Check Logs**
After registration, check the server logs for:
- `Successfully submitted to HubSpot form - workflows should trigger`
- If you see `Form submission failed - workflows may not trigger!`, check the error details

### 3. Invalid Custom Properties

**Symptom:** Contact/form submission fails with "property not found" error

**Solution:**
The code uses these custom properties:
- `type_mktg` (role field)
- `webinar_date` (timestamp) - **CRITICAL for workflows**
- `webinar_link` (Zoom join URL) - **CRITICAL for workflows**

**Create the custom properties:**
1. Go to HubSpot Settings > Properties > Contact Properties
2. Create the following properties:
   - **Name:** `type_mktg`
     - **Label:** Marketing Type or Role
     - **Type:** Single-line text
   - **Name:** `webinar_date`
     - **Label:** Webinar Date
     - **Type:** Number (stores Unix timestamp in milliseconds)
     - **IMPORTANT:** Must also be added as a field on your HubSpot form
   - **Name:** `webinar_link`
     - **Label:** Webinar Join Link
     - **Type:** Single-line text
     - **IMPORTANT:** Must also be added as a field on your HubSpot form

**After creating properties:**
1. Add them to your HubSpot form (can be hidden fields)
2. Update your workflow to use these properties if needed

### 4. Invalid Email Format

**Symptom:** Contact creation fails with validation error

**Solution:**
Ensure the registration form validates email addresses before submission. The email must be a valid format (e.g., user@domain.com).

### 5. API Rate Limiting

**Symptom:** Intermittent failures during high registration volume

**Solution:**
HubSpot has rate limits on API calls. If you're experiencing rate limiting:
1. Check your HubSpot API usage in Settings > Account > API Key
2. Consider upgrading your HubSpot plan for higher limits
3. Implement retry logic with exponential backoff (requires code modification)

### 6. Network or Authentication Issues

**Symptom:** All API calls failing

**Solution:**
1. Verify your HubSpot Portal ID in `.env.local`:
   ```
   HUBSPOT_PORTAL_ID=your_portal_id_here
   ```
2. Verify your HubSpot Form ID in `.env.local`:
   ```
   HUBSPOT_FORM_ID=your_form_id_here
   ```
   To find Form ID: Go to Marketing > Forms > Click your form > Check the URL or form settings
3. Check that your Private App token hasn't expired
4. Ensure your server can reach `api.hubapi.com` and `api.hsforms.com`

## Testing the Fix

### Test 1: Verify Environment Variables
```bash
cat .env.local
```
Ensure all HubSpot variables are set:
- `HUBSPOT_PORTAL_ID`
- `HUBSPOT_FORM_ID`
- `HUBSPOT_PRIVATE_APP_TOKEN`

### Test 2: Test Form Submission & Workflow Trigger

1. **Register a test contact:**
   - Go to your webinar registration page
   - Register with a test email (can be existing or new contact)
   - Complete the registration

2. **Check server logs** for these messages:

   **Form Submission:**
   - ✅ `Submitting to HubSpot form: [formId] with fields: [field names]`
   - ✅ `Successfully submitted to HubSpot form - workflows should trigger`
   - ❌ `Form submission failed - workflows may not trigger!` (if this appears, check form configuration)

   **Contact Creation/Update:**
   - ✅ `Found existing contact: [contactId]` OR `No existing contact found for email: [email]`
   - ✅ `Creating new contact with email: [email]` (for new contacts)
   - ✅ `Successfully created new contact: [contactId]` OR `Successfully updated contact: [contactId]`

3. **Verify in HubSpot:**

   **Check Contact:**
   - Go to HubSpot Contacts
   - Search for the test email
   - Verify contact has:
     - First name, last name, email
     - Company (if provided)
     - Role/type_mktg (if provided)
     - **Webinar date** (should be a Unix timestamp)
     - **Webinar link** (should be the Zoom join URL)
   - Check activity timeline for:
     - Form submission activity
     - Note about webinar registration

   **Check Workflow:**
   - Go to Automation > Workflows
   - Open your webinar reminder workflow
   - Click "Enrolled contacts" or "Contact history"
   - Verify your test contact was enrolled
   - Check if workflow actions are executing (emails being sent, etc.)

### Test 3: Test New Contact Creation

1. **Register with a brand new email** that doesn't exist in HubSpot
2. Check logs for:
   - `No existing contact found for email: [email]`
   - `Creating new contact with email: [email]`
   - `Successfully created new contact: [contactId]`
   - `Successfully submitted to HubSpot form - workflows should trigger`
3. Verify the contact exists in HubSpot with all properties
4. Verify the workflow enrolled the new contact

## How the Registration Flow Works

1. **Form Submission to HubSpot Forms API:**
   - Submits contact info and **webinar fields** to HubSpot form
   - **This triggers your workflows!**
   - Form submission creates timeline activity in HubSpot
   - Fields submitted: firstname, lastname, email, company, type_mktg, **webinar_date**, **webinar_link**

2. **Contact Search:**
   - Searches for existing contact by email using Contacts API

3. **Create or Update Contact:**
   - If contact exists: Updates contact properties via Contacts API
   - If contact doesn't exist: Creates new contact via Contacts API
   - Sets all properties including webinar date and link

4. **Note Creation:**
   - Adds a note to the contact's timeline with full webinar details
   - Includes meeting topic, date, join URL, meeting ID

5. **Success Response:**
   - Returns success with join URL for the webinar
   - Frontend displays confirmation to user

**Important:** The form submission (step 1) is what triggers your workflows. If this step fails, workflows won't trigger even if the contact is created/updated in steps 3-4.

## Next Steps if Issue Persists

1. **Review the detailed error logs** in your deployment platform (Vercel, etc.)
2. **Check HubSpot API documentation** for any changes: https://developers.hubspot.com/docs/api/crm/contacts
3. **Verify all custom properties** exist in your HubSpot account
4. **Test the HubSpot API directly** using curl or Postman with your token:
   ```bash
   curl -X POST https://api.hubapi.com/crm/v3/objects/contacts \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "properties": {
         "email": "test@example.com",
         "firstname": "Test",
         "lastname": "User"
       }
     }'
   ```

## Support

If you continue to experience issues after following these steps:
1. Check the detailed error message in the logs
2. Verify your HubSpot Private App permissions
3. Ensure all custom properties exist in HubSpot
4. Test with the simplest possible contact (just email, first name, last name)
