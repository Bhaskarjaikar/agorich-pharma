# Agorich Pharma - User Guide

## Table of Contents

1. [Introduction to AI Features](#introduction-to-ai-features)
2. [Command Center](#command-center)
   - [What is it?](#what-is-it)
   - [How to Access](#how-to-access)
   - [Example Queries](#example-queries)
   - [Understanding Responses](#understanding-responses)
3. [Voice AI Collections](#voice-ai-collections)
   - [How It Works](#how-it-works)
   - [Receiving a Call](#receiving-a-call)
   - [How to Respond](#how-to-respond)
   - [Payment Promise Tracking](#payment-promise-tracking)
4. [Inventory Alerts](#inventory-alerts)
   - [Alert Triggers](#alert-triggers)
   - [Low Stock Response](#low-stock-response)
   - [Expiry Management](#expiry-management)
5. [Approval System](#approval-system)
   - [What Needs Approval](#what-needs-approval)
   - [How to Approve/Reject](#how-to-approve-reject)
   - [Approval History](#approval-history)
6. [Emergency Controls](#emergency-controls)
   - [When to Use Emergency Stop](#when-to-use-emergency-stop)
   - [Pausing AI Temporarily](#pausing-ai-temporarily)
   - [Resuming Operations](#resuming-operations)
7. [Monitoring & Metrics](#monitoring--metrics)
   - [Performance Metrics](#performance-metrics)
   - [Cost Tracking](#cost-tracking)
   - [Agent Health Status](#agent-health-status)

---

## Introduction to AI Features

Agorich Pharma uses artificial intelligence (AI) to help you manage your pharmaceutical distribution business more efficiently. The AI system works 24/7, handling repetitive tasks like:

- **Collection Calls**: AI calls customers who have overdue payments
- **Inventory Monitoring**: Alerts you when stock is low or medicines are expiring
- **Data Analysis**: Answers your business questions instantly
- **Decision Support**: Helps you make better decisions with real-time insights

### Key Benefits

| Feature | Benefit |
|---------|---------|
| Voice AI | Automatic payment follow-ups |
| Command Center | Instant answers to business questions |
| Smart Alerts | Never miss low stock or expiring items |
| Approval Workflow | Control over AI decisions |

---

## Command Center

### What is it?

The Command Center is your AI-powered business assistant. It understands natural language questions and provides instant answers about your business data.

**Think of it as:** A knowledgeable assistant who's always ready to help you understand your business.

### How to Access

1. Log in to your Agorich account
2. Navigate to the **Dashboard**
3. Look for the **Command Center** widget (usually on the right side)
4. Type your question in the chat box

**Alternative Access:**
- Use the keyboard shortcut: `Ctrl + K`
- Click the chat icon in the bottom-right corner

### Example Queries

Here are some questions you can ask:

**Sales Analysis:**
```
"What were my sales last month?"
"Show me top 5 retailers by revenue"
"Compare this month's sales with last month"
```

**Accounts Receivable:**
```
"Who owes me the most money?"
"List all overdue payments above ₹50,000"
"How much AR do I have for Maharashtra region?"
```

**Inventory:**
```
"Which medicines are running low?"
"Show me items expiring next month"
"What should I reorder this week?"
```

### Understanding Responses

The Command Center provides responses in two formats:

**1. Text Response:**
Clear, conversational answers to your questions.

**2. Data Visualization:**
Charts, tables, and graphs for complex data.

**Understanding the AI Confidence:**

| Indicator | Meaning |
|-----------|---------|
| 🟢 High Confidence | AI is very sure about this answer |
| 🟡 Medium Confidence | Answer is likely correct, verify if important |
| 🔴 Low Confidence | AI is uncertain - please verify |

---

## Voice AI Collections

### How It Works

When a customer has an overdue payment, the Voice AI system automatically:

1. **Identifies** overdue invoices
2. **Calls** the customer at the right time
3. **Speaks** in a polite Hindi-English mix (Hinglish)
4. **Records** the conversation and promised payment date
5. **Updates** your system automatically

### Receiving a Call

**What to Expect:**

| Call Element | Description |
|-------------|-------------|
| Caller ID | Shows as Agorich Pharma |
| Language | Mix of Hindi and English (Hinglish) |
| Greeting | "Namaste! Main Agorich Pharma se bol raha hoon" |
| Purpose | Payment reminder for overdue amount |

**Sample Conversation:**

```
AI: Namaste! Main Agorich Pharma se bol raha hoon. Aapke paas ₹45,000 ka payment overdue hai.
    Kya aap batayein ki ye payment kab hoga?

Customer: Main Friday ko payment karunga.

AI: Dhanyavaad! Aapki baat note kar li gayi hai. Agar koi problem aaye to humein call kar lein.
     Shukriya!
```

### How to Respond

**If you CAN pay:**
- Tell the AI your expected payment date
- Be honest about when you can pay
- The AI will note your promise

**If you CANNOT pay:**
- Explain your situation clearly
- Ask for a callback to speak with someone
- Request a payment plan if needed

**Important:** The AI records all conversations. Your payment promises are tracked.

### Payment Promise Tracking

All promises made during AI calls are tracked in your system:

1. **Dashboard Updates**: See promised payments in real-time
2. **Follow-up Calls**: AI will call again if payment is not received
3. **Reports**: Payment promise accuracy reports available

---

## Inventory Alerts

### Alert Triggers

The system monitors your inventory and triggers alerts for:

| Alert Type | Trigger Condition |
|------------|------------------|
| 🔴 Low Stock | Stock falls below minimum threshold |
| 🟡 Expiry Warning | Items expiring within 30 days |
| 🔴 Out of Stock | Stock reaches zero |
| 🟡 Reorder Suggestion | Stock below reorder point |

### Low Stock Response

**Step 1: Review the Alert**
- Go to **Inventory** → **Alerts**
- See which items are low

**Step 2: Check Suggestions**
- AI suggests reorder quantities based on:
  - Past sales patterns
  - Seasonality
  - Current stock levels

**Step 3: Take Action**
- Create purchase order
- Contact your distributor
- Update expected delivery date

### Expiry Management

**30-Day Expiry Alert:**

```
Item: Crocin Advance 500mg
Stock: 200 strips
Expiry: 25th June 2025
Action: Prioritize selling or return to distributor
```

**Actions to Take:**

1. **Move older stock forward** in shelves
2. **Offer discounts** on soon-to-expire items
3. **Contact distributor** for exchange/return
4. **Update system** if items are disposed

---

## Approval System

### What Needs Approval

Some actions require human approval before execution:

| Action Type | Threshold | Example |
|-------------|-----------|---------|
| Discount | >15% | 20% discount on ₹1,00,000 order |
| Write-off | >₹5,000 | Bad debt write-off |
| Price Override | >10% | Changing MRP for special case |
| Emergency Stop | Always | Activating full system stop |

### How to Approve/Reject

**Approval Queue Location:**
1. Go to **Notifications** → **Approval Queue**
2. Or click the approval badge in the header

**Approving an Item:**

```
1. Review the request details
2. Check supporting documents (if any)
3. Click "Approve" button
4. Add notes (optional)
5. Submit
```

**Rejecting an Item:**

```
1. Click "Reject" button
2. Select a rejection reason:
   - Insufficient documentation
   - Exceeds authority
   - Policy violation
   - Other (specify)
3. Add explanation
4. Submit
```

### Approval History

View all past approvals at **Settings** → **Approval History**

Track:
- Who approved/rejected
- When
- Reason (if rejected)
- Comments

---

## Emergency Controls

### When to Use Emergency Stop

**Use Emergency Stop when:**

| Scenario | Recommended Level |
|----------|------------------|
| System error affecting customers | FULL_STOP |
| Suspected security breach | FULL_STOP |
| AI making wrong decisions | AGENT_PAUSE |
| Need manual approval for all actions | APPROVAL_MODE |
| Scheduled maintenance | AGENT_PAUSE |

### Pausing AI Temporarily

**AGENT_PAUSE** stops all AI calls and automation but keeps the system running.

**To Activate:**

1. Go to **Admin** → **Emergency Controls**
2. Select **AGENT_PAUSE**
3. Enter reason: "Scheduled maintenance"
4. Confirm

**What Stops:**
- ❌ Voice AI collection calls
- ❌ Automated reminders
- ❌ AI-triggered approvals

**What Continues:**
- ✅ Manual operations
- ✅ Dashboard access
- ✅ Report generation

### Resuming Operations

**To Resume:**

1. Go to **Admin** → **Emergency Controls**
2. Click **Resume Operations**
3. Confirm reason: "Maintenance complete"
4. System restarts AI automatically

---

## Monitoring & Metrics

### Performance Metrics

**Dashboard Metrics:**

| Metric | Description | Good Range |
|--------|-------------|------------|
| Collection Rate | % of overdue collected | >80% |
| Response Rate | % of calls answered | >60% |
| Promise Accuracy | % of promises kept | >90% |
| Avg Call Duration | Time per call | 2-5 minutes |

### Cost Tracking

**Understanding AI Costs:**

| Cost Type | Description |
|-----------|-------------|
| Voice AI | Per successful call |
| Command Center | Per query |
| Data Processing | Per report |

**View Costs:**
1. Go to **Admin** → **Spending Dashboard**
2. See daily/monthly AI costs
3. Set spending limits

### Agent Health Status

**Monitor AI System Health:**

Location: **Admin** → **Agent Status**

| Status | Meaning |
|--------|---------|
| 🟢 Online | AI fully operational |
| 🟡 Degraded | Some issues, working on fix |
| 🔴 Offline | AI disabled or emergency stop |
| ⚙️ Processing | Currently handling requests |

---

## Support & Help

### Getting Help

**In-App Help:**
- Click the **?** icon in any page
- Type your question in the search box
- Get context-sensitive help

**Contact Support:**
- Email: tech@agorichpharma.com
- Phone: Available in your region
- Hours: Mon-Sat, 9 AM - 6 PM

---

## Glossary

| Term | Meaning |
|------|---------|
| AR | Accounts Receivable - money owed to you |
| AI | Artificial Intelligence - computer systems that mimic human intelligence |
| Command Center | AI-powered query interface |
| Voice AI | AI that makes/receives phone calls |
| Low Stock | Inventory below minimum threshold |
| Overdue | Payment past its due date |
| Hinglish | Mix of Hindi and English |

---

*Last Updated: May 2026*
*Version: 2.0*
*For the latest version, visit: docs.agorichpharma.com*