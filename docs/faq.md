# Frequently Asked Questions (FAQ)

## Table of Contents

1. [General Questions](#general-questions)
2. [AI & Voice Calls](#ai--voice-calls)
3. [Command Center](#command-center)
4. [Approvals & Authorization](#approvals--authorization)
5. [Data & Security](#data--security)
6. [Costs & Billing](#costs--billing)
7. [Troubleshooting](#troubleshooting)

---

## General Questions

### Q1: What is Agorich Pharma?

Agorich Pharma is a **pharmaceutical distribution management system** that uses AI to help you:
- Track inventory and sales
- Manage customer payments
- Automate collection calls
- Get instant business insights

**In simple terms:** It's like having a smart assistant that never sleeps, helping you run your pharma business better.

---

### Q2: Who can use Agorich Pharma?

| Role | Who | Access Level |
|------|-----|--------------|
| Super Admin | Owner/Manager | Full system access |
| Admin | Department Head | Most features, no sensitive settings |
| Distributor | Business Partner | Own data, orders, inventory |
| Retailer | Shop Owner | Products, own orders |
| Sales Team | Field Staff | Assigned customers, visits |

---

### Q3: Do I need internet to use Agorich?

**Yes**, Agorich is a cloud-based system. You need:
- **Internet**: Always required for web app
- **Mobile App**: Works offline, syncs when online

---

### Q4: Can I access Agorich on my phone?

**Yes!** We have mobile apps for:
- **iOS**: Download from App Store
- **Android**: Download from Play Store

Mobile app features:
- Dashboard access
- Inventory checking
- Approval workflows
- Notifications

---

### Q5: How do I reset my password?

1. Go to login page
2. Click **"Forgot Password"**
3. Enter your email
4. Check email for reset link
5. Create new password

**Still can't login?** Contact tech@agorichpharma.com

---

## AI & Voice Calls

### Q6: What is Voice AI?

Voice AI is an **automated calling system** that:
- Calls customers with overdue payments
- Speaks in Hinglish (Hindi + English)
- Records conversations
- Tracks payment promises

**Think of it:** An AI receptionist that follows up on payments 24/7.

---

### Q7: How do I know if AI made a mistake?

**AI can make mistakes. Here's how to check:**

| Red Flag | What to Do |
|----------|------------|
| Customer says AI said wrong amount | Check invoice in system |
| Customer says no message was left | Verify phone number |
| Wrong person was called | Check customer contact details |
| Promise not recorded | Add manual note in system |

**To report an error:**
1. Go to the customer's profile
2. Add a note explaining the issue
3. Contact support if it keeps happening

---

### Q8: Can I override AI decisions?

**Yes!** You can:

| AI Action | How to Override |
|-----------|----------------|
| Discount applied | Approve/reject in Approval Queue |
| Collection call made | Cancel in call logs |
| Payment reminder sent | Disable for specific customer |
| Order auto-created | Cancel order before confirmation |

**Important:** Some AI actions require approval before execution. Check your Approval Queue regularly.

---

### Q9: Can I turn off Voice AI?

**Yes, you can disable Voice AI:**

1. Go to **Admin** → **Settings**
2. Find **Voice AI Settings**
3. Toggle **OFF**

**What happens when disabled:**
- No automatic collection calls
- No payment reminders
- Manual follow-up required

---

### Q10: What if a customer receives too many calls?

**Customer can:**
1. Request callback from AI
2. Ask to be added to "Do Not Call" list
3. Contact you directly

**You can:**
1. Pause calls for specific customer
2. Adjust call frequency in settings
3. Set "Do Not Call" flag in customer profile

---

### Q11: How does AI decide when to call?

AI uses smart scheduling based on:

| Factor | Description |
|--------|-------------|
| Due date | Closer = higher priority |
| Amount | Higher = more frequent |
| Past response | Answered before = fewer calls |
| Time of day | Best time: 10 AM - 7 PM |

---

### Q12: Can AI leave messages?

**Yes!** Voice AI can:
- Speak the payment amount
- Leave callback number
- Record promised payment date
- Take "call me back" request

---

## Command Center

### Q13: What is the Command Center?

Command Center is your **AI-powered query tool**. Ask questions in plain language and get instant answers.

**Examples:**
- "Show my sales this month"
- "Who owes me more than ₹10,000?"
- "What inventory is low?"

---

### Q14: How do I access Command Center?

**Three ways:**

| Method | How |
|--------|-----|
| Dashboard widget | Right side of main dashboard |
| Keyboard shortcut | Press `Ctrl + K` |
| Mobile app | Tap chat icon |

---

### Q15: What can I ask Command Center?

**You can ask about:**

| Category | Examples |
|----------|----------|
| Sales | "Monthly sales", "Top customers" |
| Inventory | "Low stock items", "Expiring soon" |
| Payments | "Overdue amounts", "Payment history" |
| Reports | "Generate report", "Compare periods" |

---

### Q16: Why is Command Center not answering my question?

**Possible reasons:**

| Issue | Solution |
|-------|----------|
| Question too vague | Be more specific |
| Data not in system | Check if data is entered |
| System busy | Try again in a minute |
| Wrong format | Use simple sentences |

**If still not working:** See [Command Center Errors](#command-center-errors)

---

### Q17: Can Command Center generate reports?

**Yes!** Ask:
- "Generate monthly sales report"
- "Show AR aging report"
- "Create inventory summary"

Reports can be downloaded as **PDF** or **Excel**.

---

### Q18: Is my data safe with Command Center?

**Yes!**
- Only your organization data is shown
- No cross-organization data access
- All queries are logged for security
- No personal data stored

---

## Approvals & Authorization

### Q19: What needs approval?

| Action | Threshold |
|--------|-----------|
| Discount | >15% |
| Write-off | >₹5,000 |
| Price change | >10% of MRP |
| Emergency stop | Always |
| User role change | Always |

---

### Q20: How do I approve something?

1. Go to **Notifications** → **Approval Queue**
2. Find the pending request
3. Click **Approve** or **Reject**
4. Add notes (optional)
5. Submit

---

### Q21: What happens if I don't approve/reject?

**Default actions:**

| Request Type | After 48 hours |
|--------------|----------------|
| Discount | Auto-rejected |
| Write-off | Auto-rejected |
| Emergency stop | Stays pending |

**Important:** Don't let requests pile up. Check daily!

---

### Q22: Can I see past approvals?

**Yes!**

Go to: **Settings** → **Approval History**

See:
- Who approved/rejected
- When
- Reason (if rejected)
- Original request details

---

### Q23: What is APPROVAL_MODE?

APPROVAL_MODE is an **emergency setting** where:

- ALL actions require manual approval
- No automatic execution
- Used when AI is giving wrong results

**To activate:**
1. Go to **Admin** → **Emergency Controls**
2. Select **APPROVAL_MODE**
3. Provide reason
4. Confirm

---

### Q24: Who can approve what?

| Role | Can Approve |
|------|-------------|
| Super Admin | Everything |
| Admin | Up to ₹50,000 |
| Manager | Up to ₹25,000 |
| Staff | Up to ₹10,000 |

---

## Data & Security

### Q25: Is my data safe?

**Yes!** We take security seriously:

| Security Measure | What It Does |
|------------------|--------------|
| Encryption | Data encrypted in transit and at rest |
| Access Control | Only authorized users see data |
| Audit Logs | All actions are logged |
| Regular Backups | Data backed up daily |

---

### Q26: Who can see my business data?

| Party | Access |
|-------|--------|
| Your organization | Full access to your data |
| Agorich support | Only when you grant permission |
| Other organizations | **NO ACCESS** |
| Government | Only if legally required |

---

### Q27: What if I find incorrect data?

**Steps to correct:**

1. **Invoice error** → Edit invoice (if not finalized)
2. **Customer info wrong** → Update in customer profile
3. **Stock count wrong** → Do stock adjustment
4. **Payment recorded wrong** → Add correction entry

**For major errors:** Contact tech support

---

### Q28: Can I export my data?

**Yes!** You can export:

| Data Type | Format |
|-----------|--------|
| Sales reports | PDF, Excel |
| AR statements | PDF, Excel |
| Inventory | Excel |
| Customer list | Excel |

Go to **Reports** → **Export**

---

### Q29: How long is data stored?

| Data Type | Retention |
|-----------|-----------|
| Transactions | 7 years |
| Customer data | Until deleted |
| Logs | 2 years |
| Backups | 90 days |

---

### Q30: What happens if I delete my account?

**When you delete your account:**
- Your login is deactivated
- Your data is retained per retention policy
- No new data can be created
- Contact support for complete data deletion

---

## Costs & Billing

### Q31: How much does AI cost?

**AI costs depend on usage:**

| AI Feature | Cost Model |
|------------|------------|
| Voice AI calls | Per successful call |
| Command Center | Per query |
| Data processing | Per report |

**Current rates:** Available in Admin → Spending Dashboard

---

### Q32: Can I set spending limits?

**Yes!** Admins can set:

| Limit Type | How to Set |
|------------|------------|
| Monthly AI budget | Admin → Spending → Limits |
| Per-call limit | Voice AI settings |
| Report limit | Report settings |

**When limit is reached:** AI features pause until next billing cycle

---

### Q33: How do I see AI costs?

Go to **Admin** → **Spending Dashboard**

View:
- Daily costs
- Monthly trends
- Cost by feature
- Budget vs actual

---

### Q34: Is there a free trial?

**Yes!** Contact sales@agorichpharma.com for:
- Free demo account
- Trial period
- Custom pricing

---

### Q35: How do I upgrade my plan?

1. Contact sales team
2. Discuss requirements
3. Get custom quote
4. Sign agreement
5. Plan activated

---

## Troubleshooting

### Q36: System is slow. What to do?

**Quick fixes:**

| Step | Action |
|------|--------|
| 1 | Clear browser cache |
| 2 | Try different browser |
| 3 | Check internet speed |
| 4 | Log out and log back in |

**Still slow?** Contact support with:
- Browser version
- Error messages (if any)
- Screenshot of issue

---

### Q37: Voice AI is not calling. Why?

**Checklist:**

- [ ] AI feature enabled in settings?
- [ ] Phone numbers are correct?
- [ ] Emergency stop NOT active?
- [ ] Sufficient calling credits?
- [ ] Network connectivity OK?

**If all check:** Contact tech support

---

### Q38: Command Center shows error. How to fix?

**Error types and solutions:**

| Error | Solution |
|-------|----------|
| "Unable to process" | Rephrase question |
| "No data found" | Check if data exists |
| "Timeout" | Try again with simpler query |
| "Login required" | Log out and log back in |

---

### Q39: Approval queue not showing items?

**Possible reasons:**

1. No pending approvals
2. Wrong role (check your access)
3. Filter set incorrectly
4. Browser cache issue

**Solutions:**
- Refresh page
- Check "All" filter
- Clear browser cache
- Contact admin if access issue

---

### Q40: Mobile app not working?

**Troubleshoot:**

| Issue | Solution |
|-------|----------|
| Won't load | Check internet, update app |
| Crashes | Clear app cache, reinstall |
| Can't login | Reset password |
| Features missing | Update to latest version |

---

### Q41: I see someone else's data?

**STOP IMMEDIATELY!**

1. **Don't share** any information
2. **Log out** immediately
3. **Contact support** now
4. **Change password** when safe

This is a serious security issue. Report immediately.

---

### Q42: How to contact support?

| Method | Details |
|--------|---------|
| Email | tech@agorichpharma.com |
| Phone | Regional number |
| In-app | Help → Report Issue |
| Hours | Mon-Sat, 9 AM - 6 PM |

**For urgent issues:** Call directly

---

### Q43: What information should I provide when reporting?

**Include:**
1. Your name and organization
2. Issue description
3. Steps to reproduce
4. Screenshots (if possible)
5. When it started
6. Impact on work

---

### Q44: Where can I learn more?

| Resource | Link |
|----------|------|
| Full User Guide | docs/user-guide-en.md |
| Hindi Guide | docs/user-guide-hi.md |
| Quick Start | docs/quick-start.md |
| API Docs | docs/openapi.yaml |
| Video Tutorials | YouTube (coming soon) |

---

## Still Have Questions?

**Contact us:**
- 📧 Email: tech@agorichpharma.com
- 📞 Phone: Available in your region
- 💬 In-app: Use the Help widget

*Last Updated: May 2026*