# HubSpot Form Setup Guide for webinar.nekst.com

## Target Form ID
**Form ID:** `70ba28d7-dd94-4306-bbe5-03ae2f2f8a71`

This form needs to be linked to the webinar registration at webinar.nekst.com

## Step 1: Verify Vercel Environment Variables

Since this project is deployed on Vercel (webinar.nekst.com), you need to set the Form ID in Vercel:

1. Go to Vercel Dashboard
2. Select your `zoom-webinar-manager` project
3. Go to **Settings** > **Environment Variables**
4. Find or add `HUBSPOT_FORM_ID` and set it to:
   ```
   70ba28d7-dd94-4306-bbe5-03ae2f2f8a71
   ```
5. Make sure it's set for **Production**, **Preview**, and **Development** environments
6. **Redeploy** your application for changes to take effect

## Step 2: Verify HubSpot Form Configuration

1. Go to HubSpot > Marketing > Forms
2. Find the form with ID `70ba28d7-dd94-4306-bbe5-03ae2f2f8a71`
3. Edit the form and ensure it has these fields:

### Required Fields (must exist on the form):
- **firstname** - First Name (text input)
- **lastname** - Last Name (text input)
- **email** - Email (email input)

### Optional Fields (can be hidden):
- **company** - Company Name (text input)
- **type_mktg** - Role/Marketing Type (text input)

### Critical Fields for Workflows (can be hidden):
- **webinar_date** - Webinar Date
  - Type: **Number** (stores Unix timestamp)
  - Can be a hidden field
  - Required for workflow triggers

- **webinar_link** - Webinar Join Link
  - Type: **Single-line text**
  - Can be a hidden field
  - Required for workflow triggers

### How to Add Hidden Fields:
1. In the form editor, click "Add field"
2. Select the property (webinar_date or webinar_link)
3. Click on the field settings
4. Under "Visibility", select "Hidden"
5. Save the form

## Step 3: Verify Form Fields Match Code

The code submits these fields to the form:

```javascript
{
  firstname: "Contact's first name",
  lastname: "Contact's last name",
  email: "contact@example.com",
  company: "Company name" (if provided),
  type_mktg: "Role" (if provided),
  webinar_date: "1709136000000" (Unix timestamp in milliseconds),
  webinar_link: "https://zoom.us/j/123456789"
}
```

**Every field name must match exactly** between the code and your HubSpot form properties.

## Step 4: Create Custom Properties (if they don't exist)

If `webinar_date` or `webinar_link` properties don't exist:

1. Go to HubSpot > Settings > Properties > Contact Properties
2. Click "Create property"

### Create webinar_date:
- **Label:** Webinar Date
- **Internal name:** `webinar_date`
- **Field type:** Number
- **Description:** Webinar registration date (Unix timestamp in milliseconds)
- Click "Create"

### Create webinar_link:
- **Label:** Webinar Join Link
- **Internal name:** `webinar_link`
- **Field type:** Single-line text
- **Description:** Zoom webinar join URL
- Click "Create"

### Create type_mktg (if needed):
- **Label:** Marketing Type / Role
- **Internal name:** `type_mktg`
- **Field type:** Single-line text
- **Description:** Contact's role or marketing type
- Click "Create"

## Step 5: Verify Current Environment Variables

Check your current Vercel environment variables:

1. Go to Vercel > Settings > Environment Variables
2. Verify these are all set:

```
HUBSPOT_PORTAL_ID=your_portal_id
HUBSPOT_FORM_ID=70ba28d7-dd94-4306-bbe5-03ae2f2f8a71
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-xxxxx
ZOOM_ACCOUNT_ID=your_zoom_account
ZOOM_CLIENT_ID=your_zoom_client
ZOOM_CLIENT_SECRET=your_zoom_secret
ZOOM_USER_ID=your_email@nekst.com
CRON_SECRET=your_cron_secret
```

## Step 6: Test the Integration

After deploying with the correct Form ID:

1. **Register for a webinar** at webinar.nekst.com
2. **Check deployment logs** in Vercel:
   - Go to Vercel > Deployments > Select latest > Functions > api/hubspot/register
   - Look for these log messages:

   **Success:**
   ```
   Submitting to HubSpot form: 70ba28d7-dd94-4306-bbe5-03ae2f2f8a71
   Portal ID: [your portal id]
   Form fields being submitted: [list of fields]
   ✅ Successfully submitted to HubSpot form
   ✅ Workflows should trigger for this registration
   ```

   **Failure:**
   ```
   ❌ HubSpot form submission FAILED
   Status code: 400 (or other error code)
   Response body: [error details]
   ⚠️ WORKFLOWS WILL NOT TRIGGER - Form submission failed!
   ```

3. **Verify in HubSpot:**
   - Go to Contacts and search for your test email
   - Check the contact's timeline for "Form submission" activity
   - The form name should appear in the timeline
   - Check that webinar_date and webinar_link properties are set

4. **Verify Workflow:**
   - Go to Automation > Workflows
   - Open your webinar workflow
   - Check if the test contact was enrolled
   - Verify actions are executing (emails sent, etc.)

## Step 7: Common Issues & Solutions

### Issue: "Property X doesn't exist"
**Solution:** Create the custom property in HubSpot Settings > Properties

### Issue: Form submission returns 400 error
**Solution:**
- Check that all fields in the code exist on the form
- Verify field names match exactly (case-sensitive)
- Make sure hidden fields are added to the form

### Issue: Contact created but no form submission in timeline
**Solution:**
- Form submission is failing
- Check Vercel logs for the exact error
- Verify Form ID is correct: `70ba28d7-dd94-4306-bbe5-03ae2f2f8a71`

### Issue: Workflow not triggering
**Solution:**
- Verify workflow trigger is set to "Form submission" for form ID `70ba28d7-dd94-4306-bbe5-03ae2f2f8a71`
- OR set trigger to "webinar_date is known" or "webinar_date is set"
- Make sure workflow is turned ON

## Step 8: Deploy Changes

After updating the Vercel environment variable:

1. Go to Vercel > Deployments
2. Click "Redeploy" on the latest deployment
   - Or make a small code change and push to trigger new deployment
3. Wait for deployment to complete
4. Test the registration flow

## Verification Checklist

- [ ] Vercel environment variable `HUBSPOT_FORM_ID` = `70ba28d7-dd94-4306-bbe5-03ae2f2f8a71`
- [ ] HubSpot form has firstname, lastname, email fields
- [ ] HubSpot form has webinar_date field (can be hidden)
- [ ] HubSpot form has webinar_link field (can be hidden)
- [ ] Custom properties webinar_date and webinar_link exist in HubSpot
- [ ] Application redeployed with new Form ID
- [ ] Test registration shows "✅ Successfully submitted to HubSpot form" in logs
- [ ] Form submission appears in contact's timeline in HubSpot
- [ ] Workflow enrolls the contact after form submission

## Getting the Portal ID

If you also need to verify your Portal ID:

1. Go to HubSpot > Settings (gear icon in top right)
2. Click "Account Setup" in the left sidebar
3. Under "Account Defaults", you'll see your **Hub ID** (this is your Portal ID)
4. Make sure this matches your `HUBSPOT_PORTAL_ID` in Vercel

## Next Steps

1. Update `HUBSPOT_FORM_ID` in Vercel to `70ba28d7-dd94-4306-bbe5-03ae2f2f8a71`
2. Add webinar_date and webinar_link fields to the HubSpot form (can be hidden)
3. Redeploy the application
4. Test with a registration
5. Check logs for success/failure
6. Verify form submission in HubSpot contact timeline
