# Supabase Email Configuration for Agorich Pharma

## Custom Email Templates Configuration

To make verification emails appear to come from Agorich instead of Supabase, you need to configure custom email templates in your Supabase dashboard.

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `cfthxtnwuhvhhnifshsr`
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Configure Email Templates

#### Confirm Signup Template
Replace the default template with this elevated design:

**Subject:** `Welcome to Agorich Pharma — Activate Your Business Account`

**Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Agorich Pharma</title>
  <style>
    :root {
      color-scheme: light;
    }
    body {
      margin: 0;
      font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
      background: #0f172a;
      color: #0f172a;
    }
    .outer {
      width: 100%;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 35%, #0f766e 100%);
      padding: 48px 0;
    }
    .container {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 40px 80px rgba(15, 23, 42, 0.28);
    }
    .hero {
      background: radial-gradient(circle at top left, rgba(255,255,255,0.24), rgba(15,23,42,0.05)),
                  linear-gradient(120deg, #1d4ed8, #0f766e);
      padding: 48px 40px 56px;
      text-align: left;
      color: #f8fafc;
      position: relative;
    }
    .logo-lockup {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }
    .logo-icon {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: rgba(15, 23, 42, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.18);
    }
    .logo-text {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.6px;
    }
    .hero h1 {
      margin: 0 0 12px;
      font-size: 32px;
      line-height: 1.2;
      font-weight: 700;
    }
    .hero p {
      margin: 0;
      font-size: 16px;
      line-height: 1.6;
      color: rgba(241,245,249,0.92);
    }
    .preview-card {
      margin-top: 32px;
      background: rgba(15,23,42,0.12);
      border: 1px solid rgba(148,163,184,0.24);
      border-radius: 18px;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
    }
    .preview-card .metric {
      background: rgba(15,23,42,0.45);
      border-radius: 14px;
      padding: 16px;
      text-align: left;
      backdrop-filter: blur(6px);
    }
    .metric span {
      display: block;
      font-size: 13px;
      color: rgba(226,232,240,0.72);
      margin-bottom: 6px;
    }
    .metric strong {
      font-size: 20px;
      color: #f8fafc;
    }
    .body {
      padding: 40px;
      background: #ffffff;
    }
    .body h2 {
      font-size: 22px;
      margin: 0 0 18px;
      color: #0f172a;
    }
    .accent {
      color: #0f766e;
      font-weight: 600;
    }
    .cta {
      text-align: center;
      margin: 32px 0 40px;
    }
    .cta a {
      display: inline-block;
      background: linear-gradient(120deg, #0f766e, #1d4ed8);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 36px;
      border-radius: 999px;
      font-weight: 600;
      letter-spacing: 0.3px;
      box-shadow: 0 18px 35px rgba(31, 64, 128, 0.25);
    }
    .cta small {
      display: block;
      margin-top: 10px;
      font-size: 12px;
      color: #64748b;
    }
    .benefits {
      background: #f1f5f9;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .benefits h3 {
      margin: 0 0 16px;
      font-size: 16px;
      color: #0f172a;
    }
    .benefits ul {
      margin: 0;
      padding-left: 20px;
      color: #334155;
      font-size: 14px;
      line-height: 1.7;
    }
    .footer {
      padding: 28px 38px 36px;
      background: #0f172a;
      color: rgba(226,232,240,0.72);
      font-size: 13px;
      text-align: center;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
    @media (max-width: 520px) {
      .hero, .body { padding: 32px 24px; }
      .preview-card { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="container">
      <section class="hero">
        <div class="logo-lockup">
          <div class="logo-icon">🏥</div>
          <div class="logo-text">Agorich Pharma</div>
        </div>
        <h1>Launch your wholesale journey with confidence.</h1>
        <p>
          Verify your email to unlock real-time inventory, 40% margins, and doorstep delivery tailored for Indian pharmacies.
        </p>
        <div class="preview-card">
          <div class="metric">
            <span>Live Inventory</span>
            <strong>500+ SKUs</strong>
          </div>
          <div class="metric">
            <span>Average Savings</span>
            <strong>40% Margin</strong>
          </div>
          <div class="metric">
            <span>Invoice Guarantee</span>
            <strong>100% Secure</strong>
          </div>
          <div class="metric">
            <span>Coverage</span>
            <strong>Pan India</strong>
          </div>
        </div>
      </section>

      <section class="body">
        <h2>Namaste, Partner 👋</h2>
        <p>
          You're one click away from accessing the <span class="accent">Agorich Retailer Control Centre</span>. Confirming your email instantly sets up your secure account and prepares the dashboard with tailored pricing, credit options, and curated product suggestions.
        </p>

        <div class="cta">
          <a href="{{ .ConfirmationURL }}&redirect_to=https://app.agorich.com/retailer">Activate &amp; Enter Dashboard</a>
          <small>
            This secure link signs you in automatically after verification. Expires in 24 hours.
          </small>
        </div>

        <div class="benefits">
          <h3>Your cockpit includes:</h3>
          <ul>
            <li>Personalised catalogue with stock, expiry and margin at a glance.</li>
            <li>Instant invoice downloads and WhatsApp-ready order sharing.</li>
            <li>Finance tracker with partial payments &amp; GST-compliant reports.</li>
          </ul>
        </div>

        <p>If you need help finishing onboarding, our success desk is on standby: <strong>automation@agorich.com</strong> • <strong>+91 8409725206</strong></p>
        <p>See you inside!<br/><strong>Team Agorich Pharma</strong></p>
      </section>

      <footer class="footer">
        © {{ now.Format "2006" }} Agorich Pharma • <a href="https://agorich.com">agorich.com</a><br/>
        2, Bhushan market, Baruraj thana chowk, Muzaffarpur, Bihar 843132
      </footer>
    </div>
  </div>
</body>
</html>
```

#### Magic Link Template
**Subject:** `Instant Access — Continue where you left off`

**Body:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agorich Pharma Magic Link</title>
  <style>
    body { margin: 0; font-family: 'Poppins', 'Segoe UI', Arial, sans-serif; background: #0f172a; }
    .outer { padding: 40px 0; background: linear-gradient(160deg, #0f172a 0%, #1d4ed8 60%, #0ea5e9 100%); }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 22px; overflow: hidden; box-shadow: 0 30px 60px rgba(15,23,42,0.24); }
    .hero { padding: 36px 32px 28px; background: linear-gradient(135deg, rgba(14,165,233,0.22), rgba(15,118,110,0.42)); color: #0f172a; }
    .hero h1 { margin: 0 0 8px; font-size: 26px; }
    .hero p { margin: 0; color: rgba(15,23,42,0.7); font-size: 15px; }
    .preview { margin-top: 22px; background: #0f172a; color: #f8fafc; border-radius: 16px; padding: 18px 24px; display: flex; gap: 18px; }
    .preview div { flex: 1; }
    .preview span { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: rgba(148,163,184,0.75); margin-bottom: 6px; }
    .preview strong { font-size: 18px; }
    .body { padding: 32px; color: #1e293b; }
    .cta { margin: 28px 0; text-align: center; }
    .cta a { display: inline-block; background: linear-gradient(120deg, #0f766e, #1d4ed8); padding: 14px 32px; border-radius: 999px; color: #ffffff; text-decoration: none; font-weight: 600; }
    .cta small { display: block; margin-top: 8px; font-size: 11px; color: #64748b; }
    .footer { padding: 24px 32px 32px; text-align: center; font-size: 12px; color: rgba(100,116,139,0.9); }
  </style>
</head>
<body>
  <div class="outer">
    <div class="container">
      <section class="hero">
        <h1>Welcome back to the Retailer Control Centre</h1>
        <p>Use this secure link to jump straight into your dashboard and pick up where you left off.</p>
        <div class="preview">
          <div>
            <span>Outstanding Balance</span>
            <strong>₹0.00</strong>
          </div>
          <div>
            <span>Open Orders</span>
            <strong>Track &amp; Fulfil</strong>
          </div>
          <div>
            <span>Support Hotline</span>
            <strong>+91 8409725206</strong>
          </div>
        </div>
      </section>

      <section class="body">
        <p>Click the button below to authenticate instantly. No password required — the session is created as soon as the link opens.</p>
        <div class="cta">
          <a href="{{ .ConfirmationURL }}&redirect_to=https://app.agorich.com/retailer">Reopen My Dashboard</a>
          <small>Link valid for 1 hour • Do not forward this email.</small>
        </div>
        <p>If you didn't request this link, simply ignore this message. Your account remains secure.</p>
      </section>

      <footer class="footer">
        Need help? Reply to this email or call <strong>+91 8409725206</strong>.<br/>
        © {{ now.Format "2006" }} Agorich Pharma
      </footer>
    </div>
  </div>
</body>
</html>
```

### Step 3: Configure Custom SMTP (Optional but Recommended)

For a more professional setup, you can configure custom SMTP:

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Configure with your email provider:
   - **Host:** `smtp.gmail.com` (if using Gmail)
   - **Port:** `587`
   - **Username:** `automation@agorich.com`
   - **Password:** Your app password
   - **Sender Name:** `Agorich Pharma`
   - **Sender Email:** `automation@agorich.com`

### Step 4: Update Site URL

1. Go to **Authentication** → **Settings** → **General**
2. Set **Site URL** to: `http://localhost:3000` (for development)
3. Set **Redirect URLs** to: `http://localhost:3000/dashboard`

### Step 5: Test the Configuration

1. Try registering a new account
2. Check the email - it should now show Agorich branding
3. Verify the confirmation link works properly

## Environment Variables

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://cfthxtnwuhvhhnifshsr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Custom Domain Setup (Advanced)

For production, you can set up a custom domain:

1. **Domain Setup:**
   - Purchase domain: `agorich.com`
   - Set up email: `automation@agorich.com`

2. **DNS Configuration:**
   - Add SPF record: `v=spf1 include:_spf.google.com ~all`
   - Add DKIM record (provided by your email provider)
   - Add DMARC record: `v=DMARC1; p=quarantine; rua=mailto:dmarc@agorich.com`

3. **Supabase Configuration:**
   - Update SMTP settings with your custom domain
   - Update email templates with your domain

This will make all emails appear to come from `automation@agorich.com` instead of Supabase.








