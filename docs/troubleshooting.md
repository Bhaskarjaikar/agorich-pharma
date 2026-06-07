# Troubleshooting Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Login Issues](#login-issues)
3. [Dashboard Problems](#dashboard-problems)
4. [Command Center Errors](#command-center-errors)
5. [Voice AI Issues](#voice-ai-issues)
6. [Inventory Alert Problems](#inventory-alert-problems)
7. [Approval Queue Issues](#approval-queue-issues)
8. [Performance Issues](#performance-issues)
9. [Mobile App Problems](#mobile-app-problems)
10. [Emergency & Security Issues](#emergency--security-issues)

---

## Getting Started

### Before You Start Troubleshooting

**Gather this information:**
- Your role (Admin, Distributor, Retailer)
- Browser and version (Chrome, Firefox, Safari, Edge)
- When the issue started
- Steps to reproduce
- Screenshots (if possible)

**Quick Checks (Do First):**

| Check | Action |
|-------|--------|
| Internet | Can you open other websites? |
| Browser | Try a different browser |
| Cache | Clear browser cache |
| Login | Can you log out and back in? |

---

## Login Issues

### Issue: "Invalid Credentials"

**Symptoms:**
- Error message: "Invalid email or password"
- Can't access account

**Possible Causes:**
1. Wrong email or password
2. Caps Lock is on
3. Account locked after failed attempts
4. Account doesn't exist

**Step-by-Step Solution:**

```
Step 1: Check if Caps Lock is on
        - Look for CAPS indicator on keyboard
        - Retype password with Caps Lock off

Step 2: Use "Forgot Password"
        - Click "Forgot Password" link
        - Enter your email
        - Check email for reset link
        - Create new password

Step 3: Try these if still not working:
        - Clear browser cookies
        - Try incognito/private window
        - Try different browser

Step 4: Contact support if:
        - Email not recognized
        - Reset link not received
        - Account locked
```

**Who to Contact:** tech@agorichpharma.com

---

### Issue: "Account Locked"

**Symptoms:**
- Error: "Account locked due to too many attempts"
- Can't login even with correct password

**Possible Causes:**
1. Multiple failed login attempts
2. Suspicious activity detected
3. Password expired

**Step-by-Step Solution:**

```
Step 1: Wait 30 minutes
        - Lock auto-resets after 30 minutes

Step 2: If urgent, reset password
        - Use "Forgot Password"
        - Create new password
        - Login with new password

Step 3: Contact admin if:
        - You didn't try to login
        - Account keeps locking
        - Need immediate access
```

**Who to Contact:** Your organization's admin first, then tech support

---

### Issue: "Session Expired"

**Symptoms:**
- Redirected to login page
- "Your session has expired"
- Changes not saving

**Possible Causes:**
1. Inactivity for too long
2. Browser closed
3. Login from multiple devices

**Step-by-Step Solution:**

```
Step 1: Refresh the page
        - Press F5 or Ctrl+R
        - You may be redirected to login

Step 2: Log in again
        - Enter credentials
        - You should return to your work

Step 3: Prevent future issues:
        - Keep browser open
        - Don't use incognito for work
        - Save work frequently
```

---

## Dashboard Problems

### Issue: Dashboard Not Loading

**Symptoms:**
- Blank screen or loading spinner
- Dashboard shows error
- Partial loading

**Possible Causes:**
1. Internet connection issue
2. Server temporarily down
3. Browser issue
4. Cache corruption

**Step-by-Step Solution:**

```
Step 1: Check internet
        - Try opening google.com
        - If not working, check your connection

Step 2: Try these browser steps:
        a) Hard refresh: Ctrl + Shift + R
        b) Clear cache: Ctrl + Shift + Delete
        c) Disable extensions temporarily
        d) Try incognito mode

Step 3: Check server status
        - Ask colleagues if they have issues
        - Check status.agorichpharma.com

Step 4: Try different device
        - Use your phone to test
        - Use different computer
```

**Who to Contact:** If persists >30 minutes, contact tech support

---

### Issue: Metrics Not Updating

**Symptoms:**
- Old data showing
- Numbers don't match
- "Last updated" is old

**Possible Causes:**
1. Data sync delay
2. Cached old data
3. Report generation failed

**Step-by-Step Solution:**

```
Step 1: Refresh the page
        - Press F5 to refresh
        - Check "Last updated" time

Step 2: Force refresh
        - Ctrl + Shift + R
        - Or Ctrl + F5

Step 3: Clear browser cache
        - Chrome: Ctrl + Shift + Delete
        - Select "Cached images and files"
        - Click "Clear data"

Step 4: Wait for sync
        - Data syncs every 15 minutes
        - Check back in a few minutes

Step 5: Run the report again
        - Go to Reports
        - Generate fresh report
```

---

## Command Center Errors

### Issue: Command Center Not Responding

**Symptoms:**
- No response to queries
- "Processing..." forever
- Error message shown

**Possible Causes:**
1. Query too complex
2. No matching data
3. System busy
4. AI service temporarily down

**Step-by-Step Solution:**

```
Step 1: Simplify your question
        - Instead of: "Show me all overdue payments above 50000 for Maharashtra region"
        - Try: "Show overdue payments"

Step 2: Rephrase the question
        - Instead of: "What is the status of my AR?"
        - Try: "Who owes me money?"

Step 3: Check if data exists
        - Command Center only shows existing data
        - If no overdue, it will say "No overdue payments"

Step 4: Wait and retry
        - If "System busy", wait 1 minute
        - Try again

Step 5: Check AI status
        - Go to Admin → Agent Status
        - If shows "Degraded", wait for recovery
```

---

### Issue: "I Don't Understand" Response

**Symptoms:**
- AI says it doesn't understand
- Wrong data returned
- Off-topic response

**Possible Causes:**
1. Question unclear
2. Using abbreviations AI doesn't know
3. Complex query

**Step-by-Step Solution:**

```
Step 1: Use clearer language
        - Bad: "AR status?"
        - Good: "Show accounts receivable summary"

Step 2: Define terms
        - Instead of: "What is my PSR?"
        - Try: "What is my payment collection rate?"

Step 3: Break into parts
        - Instead of: "Sales, AR, and inventory for Mumbai"
        - Try: "Show me sales for Mumbai" first

Step 4: Check glossary
        - See common terms in User Guide
        - Use standard terminology

Step 5: Use examples
        - Try: "Show me something like last month's report"
```

---

### Issue: Wrong or Inaccurate Data

**Symptoms:**
- Numbers don't match other reports
- Customer data incorrect
- Historical data wrong

**Step-by-Step Solution:**

```
Step 1: Verify with other source
        - Check same data in Reports section
        - Compare with exported data

Step 2: Check date range
        - Ensure you're looking at same period
        - Default may be different than expected

Step 3: Note what is wrong
        - Which specific numbers?
        - How much is the difference?

Step 4: Report the error
        - Email tech support
        - Include:
          - The query you asked
          - What AI returned
          - What you expected
          - Screenshots
```

**Important:** Don't make decisions based on suspicious AI data. Always verify.

---

## Voice AI Issues

### Issue: Voice AI Not Making Calls

**Symptoms:**
- No calls being made
- Customers not receiving calls
- Queue shows 0 calls

**Possible Causes:**
1. AI feature disabled
2. Emergency stop active
3. No overdue customers
4. Calling credits exhausted
5. Wrong phone numbers

**Step-by-Step Solution:**

```
Step 1: Check Emergency Controls
        - Go to Admin → Emergency Controls
        - If "AGENT_PAUSE" or "FULL_STOP" active, resume

Step 2: Verify AI is enabled
        - Go to Admin → Voice AI Settings
        - Ensure "Enable Voice AI" is ON

Step 3: Check overdue list
        - Go to AR → Overdue List
        - Verify there are overdue customers
        - No overdue = no calls

Step 4: Verify phone numbers
        - Go to any customer
        - Check phone format
        - Should be +91XXXXXXXXXX

Step 5: Check calling credits
        - Go to Admin → Spending
        - Check Voice AI credits
        - If 0, calls won't go out

Step 6: Check call logs
        - Go to Voice AI → Call Logs
        - See if any calls attempted
        - Look for error messages
```

---

### Issue: Call Failed / Customer Didn't Receive

**Symptoms:**
- Customer says no call received
- Call log shows "Failed"
- One-way audio

**Possible Causes:**
1. Wrong phone number
2. Network issue at customer end
3. Phone blocked/Do Not Disturb
4. Carrier issue

**Step-by-Step Solution:**

```
Step 1: Verify phone number
        - Check customer's profile
        - Confirm number with customer
        - Look for formatting issues

Step 2: Check call logs
        - Go to Voice AI → Call Logs
        - Find the failed call
        - Note the error code

Step 3: Common error codes:
        - "Number not reachable" → Phone off or no signal
        - "Call rejected" → Customer declined
        - "No answer" → Customer didn't pick up
        - "Busy" → Customer on another call

Step 4: Manual retry
        - Call customer manually
        - Update system with outcome
        - Note if different number needed

Step 5: If consistent failures
        - Ask customer to whitelist your number
        - Try at different time
        - Consider SMS reminder instead
```

---

### Issue: AI Spoke Wrong Amount

**Symptoms:**
- Customer says AI said wrong amount
- Payment discrepancy
- Customer confused

**Possible Causes:**
1. Recent payment not updated
2. Multiple invoices confused
3. Data sync delay

**Step-by-Step Solution:**

```
Step 1: Check customer's invoices
        - Go to customer → Invoices
        - List all outstanding invoices
        - Calculate correct total

Step 2: Check recent payments
        - Any payments made recently?
        - Was system updated?

Step 3: Verify AI data
        - Command Center: "What is [customer name]'s balance?"
        - Compare with your calculation

Step 4: Report error
        - Contact tech support
        - Include:
          - Customer name
          - Amount AI said
          - Correct amount
          - Screenshot if available

Step 5: Inform customer
        - Call customer
        - Give correct amount
        - Apologize for confusion
```

---

## Inventory Alert Problems

### Issue: Not Receiving Alert Notifications

**Symptoms:**
- Missing low stock alerts
- No expiry warnings
- Items missing from dashboard

**Possible Causes:**
1. Notifications disabled
2. Alert thresholds not set
3. Data not updated
4. Email/SMS not configured

**Step-by-Step Solution:**

```
Step 1: Check notification settings
        - Go to Settings → Notifications
        - Ensure alerts are enabled
        - Check alert preferences

Step 2: Verify thresholds
        - Go to Inventory → Settings
        - Check minimum stock levels
        - Set appropriate thresholds

Step 3: Check if items qualify
        - Go to Inventory → Alerts
        - See all alerts
        - Items must meet threshold

Step 4: Check communication settings
        - Email notifications enabled?
        - SMS notifications enabled?
        - Correct email/phone?

Step 5: Test alert
        - Add item with 0 stock
        - See if alert appears
        - Check email/SMS
```

---

### Issue: False Low Stock Alerts

**Symptoms:**
- Items showing low but have stock
- Stock count incorrect
- Frequent false alerts

**Possible Causes:**
1. Stock not updated after receipt
2. Physical count differs from system
3. Threshold too high
4. Damaged goods not recorded

**Step-by-Step Solution:**

```
Step 1: Verify physical stock
        - Go to Inventory → Products
        - Find the item
        - Check actual physical count

Step 2: Update stock if needed
        - Use Stock Adjustment
        - Enter actual count
        - Add note explaining difference

Step 3: Adjust threshold if needed
        - Admin: Inventory → Thresholds
        - Set appropriate minimum
        - Don't set too low or too high

Step 4: Record damaged goods
        - If stock damaged
        - Use "Stock Adjustment"
        - Mark as damaged/write-off
```

---

## Approval Queue Issues

### Issue: Approval Queue Empty (But Should Have Items)

**Symptoms:**
- No items showing
- You know there should be pending
- Filter shows "All" but nothing

**Possible Causes:**
1. Already approved/rejected
2. Wrong filter selected
3. Different user logged in
4. Browser cache issue

**Step-by-Step Solution:**

```
Step 1: Check filter
        - Ensure "Pending" is selected
        - Not "Approved" or "Rejected"

Step 2: Check your role
        - Are you authorized to see these?
        - Contact admin if access issue

Step 3: Clear browser cache
        - Ctrl + Shift + Delete
        - Clear cached data
        - Refresh page

Step 4: Check other devices
        - Try from phone or tablet
        - See if items appear

Step 5: Contact sender
        - Ask them to check approval status
        - They can resend if needed
```

---

### Issue: Can't Approve/Reject Button Not Working

**Symptoms:**
- Button grayed out
- Click does nothing
- Error when clicking

**Possible Causes:**
1. Session expired
2. Permission issue
3. Browser issue
4. System error

**Step-by-Step Solution:**

```
Step 1: Refresh page
        - F5 or Ctrl + R
        - Try again

Step 2: Log out and in
        - Click your profile
        - Select Logout
        - Log back in
        - Try again

Step 3: Try different browser
        - If Chrome, try Firefox
        - If Edge, try Chrome

Step 4: Check permissions
        - Contact admin
        - Verify you can approve

Step 5: Report to tech support
        - Include:
          - Screenshot
          - Error message
          - What you were trying to do
```

---

## Performance Issues

### Issue: Slow Page Loading

**Symptoms:**
- Pages take >10 seconds
- Spinners appearing often
- Actions take long

**Possible Causes:**
1. Slow internet
2. Too many browser tabs
3. Large data queries
4. Server load

**Step-by-Step Solution:**

```
Step 1: Check your internet
        - Speedtest.net
        - At least 5 Mbps needed

Step 2: Reduce browser load
        - Close unused tabs
        - Disable unnecessary extensions
        - Keep only Agorich open

Step 3: Use incognito mode
        - Opens without extensions
        - Test if faster

Step 4: Try at different time
        - Server may be busy
        - Try early morning or late evening

Step 5: Check computer
        - Restart your computer
        - Clear temp files
        - Check RAM usage
```

---

### Issue: Data Not Saving

**Symptoms:**
- Changes disappear
- "Save" doesn't work
- Error on save

**Step-by-Step Solution:**

```
Step 1: Check for errors
        - Red error messages?
        - Required fields missing?

Step 2: Check connection
        - Internet working?
        - Try refreshing

Step 3: Save in steps
        - Save one change at a time
        - Don't submit multiple forms

Step 4: Use keyboard shortcut
        - Try Ctrl + S to save
        - Or button near field

Step 5: Try again later
        - Server may be busy
        - Wait 5 minutes
        - Try again
```

---

## Mobile App Problems

### Issue: App Crashing

**Symptoms:**
- App closes unexpectedly
- Freezes on certain screens
- Force closes on login

**Step-by-Step Solution:**

```
Step 1: Force close app
        - iOS: Swipe up from home
        - Android: Tap square, swipe away

Step 2: Restart app
        - Open again
        - See if fixed

Step 3: Clear app cache
        - iOS: Delete and reinstall
        - Android: Settings → Apps → Agorich → Clear cache

Step 4: Update app
        - Check App Store / Play Store
        - Update to latest version

Step 5: Check phone storage
        - Free up space
        - At least 500 MB free needed

Step 6: Check phone compatibility
        - Old phones may not work well
        - Try web version instead
```

---

## Emergency & Security Issues

### Issue: See Someone Else's Data

**⚠️ STOP! This is serious.**

**Immediate Actions:**

```
Step 1: DO NOT share any information
        - Don't tell anyone what you saw
        - Don't take screenshots

Step 2: Log out immediately
        - Click logout now

Step 3: Contact tech support NOW
        - Call: [Regional Number]
        - Email: security@agorichpharma.com

Step 4: Change your password
        - When safe
        - Use strong, unique password

Step 5: Document what you saw
        - Write down:
          - What data was visible
          - When you noticed
          - What you did
        - Give to support team
```

**This is a CRITICAL security issue. Report immediately.**

---

### Issue: Suspected Unauthorized Access

**Signs:**
- Unknown devices in login history
- Password changed without your knowledge
- Unfamiliar changes in system

**Step-by-Step Solution:**

```
Step 1: Secure your account
        - Change password immediately
        - Enable two-factor auth

Step 2: Check login history
        - Go to Settings → Login History
        - Note unfamiliar locations/devices

Step 3: Sign out all devices
        - Settings → Sign Out All Devices
        - Then log in again only on your device

Step 4: Contact support
        - Report unauthorized access
        - Provide login history details

Step 5: Monitor account
        - Watch for unusual activity
        - Check reports frequently
```

---

## Contact Information

### For All Issues:

| Method | Details | Response Time |
|--------|---------|---------------|
| Email | tech@agorichpharma.com | < 24 hours |
| Phone | Regional number | Immediate |
| In-App | Help → Report Issue | < 24 hours |

### For Urgent Issues:
- **Security issues**: security@agorichpharma.com
- **System down**: Call directly
- **Data loss**: Call immediately

### Hours:
Mon-Sat, 9 AM - 6 PM (India Standard Time)

---

## Information to Ready Before Contacting Support

| Info | Why Needed |
|------|-----------|
| Your name and email | To identify your account |
| Organization name | To locate your data |
| Browser version | To reproduce issues |
| Screenshots | To see what you see |
| Steps to reproduce | To fix the issue |
| Error messages | To diagnose problem |
| When started | To understand timeline |

---

*Last Updated: May 2026*
*Version: 2.0*