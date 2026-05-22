# ⚡ Quick Configuration Fix - Action Items

## ✅ What's Been Fixed in Code

1. ✅ **Updated `allowedRedirects` array** in `src/app/auth/callback/page.tsx`
   - Now includes: `/dashboard`, `/admin`, `/retailer`, `/sales`, `/logistic`, `/onboarding`, `/login`, `/`
   - Code is ready to handle all role-based redirects

2. ✅ **Created comprehensive documentation** (`SUPABASE_URL_CONFIGURATION.md`)
   - Complete step-by-step guide
   - All required URLs listed
   - Troubleshooting guide included

## 🔧 Manual Steps Required (Do in Supabase Dashboard)

### Step 1: Add Missing Redirect URLs in Supabase

**Location:** Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

**Action:** Click "Add URL" and add these URLs one by one:

```
http://localhost:3000/admin
http://localhost:3000/retailer
http://localhost:3000/sales
http://localhost:3000/logistic
http://localhost:3000/onboarding
```

**Current Status:** Only `/auth/callback` and `/dashboard` are listed
**Required:** Add the 5 URLs above

**How to do it:**
1. Go to https://supabase.com/dashboard
2. Select project: `cfthxtnwuhvhhnifshsr`
3. Navigate to: **Authentication** → **URL Configuration**
4. Scroll to **Redirect URLs** section
5. Click **"Add URL"** button
6. Enter each URL and click **"Save changes"**
7. Repeat for all 5 URLs

### Step 2: Update Site URL (If Needed)

**Location:** Supabase Dashboard → Authentication → URL Configuration → Site URL

**Current:** `http://localhost:3000` (fine for development)

**For Production:** If your app is deployed, update to:
```
https://yourdomain.com
```

### Step 3: Verify Google OAuth Configuration

**Location:** Google Cloud Console → OAuth 2.0 Client IDs → `Agorich_pharma`

**Current Status:**
- ✅ `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback` (already configured)
- ✅ `http://localhost:3000/auth/callback` (already configured)

**Action Required (if app is deployed):**
- Add production domain callback: `https://yourdomain.com/auth/callback`

**How to verify:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on OAuth 2.0 Client ID: `Agorich_pharma`
4. Check **Authorized redirect URIs** section
5. Verify both URLs above are listed
6. If deployed, add production callback URL

## 📋 Quick Checklist

### Supabase Dashboard
- [ ] Added: `http://localhost:3000/admin`
- [ ] Added: `http://localhost:3000/retailer`
- [ ] Added: `http://localhost:3000/sales`
- [ ] Added: `http://localhost:3000/logistic`
- [ ] Added: `http://localhost:3000/onboarding`
- [ ] Site URL updated (if production)

### Google Cloud Console
- [ ] Verified Supabase callback URL exists
- [ ] Verified local callback URL exists
- [ ] Added production callback URL (if deployed)

## 🧪 Test After Configuration

1. **Clear browser cache/cookies** (important!)
2. **Test Google login:**
   - Click "Continue with Google"
   - Should redirect to correct dashboard based on role
   - No "Invalid auth callback URL" errors

3. **Test all roles:**
   - SUPER_ADMIN → `/admin`
   - RETAILER → `/retailer`
   - SALES → `/sales`
   - LOGISTIC → `/logistic`
   - New user → `/onboarding`

## ⚠️ Important Notes

- **Changes take effect:** Supabase URL changes may take 1-5 minutes to propagate
- **Exact match required:** URLs must match EXACTLY (no trailing slashes, correct protocol)
- **Clear cache:** After changes, clear browser cache or use incognito mode to test

## 📚 Full Documentation

For detailed instructions, see: [SUPABASE_URL_CONFIGURATION.md](./SUPABASE_URL_CONFIGURATION.md)

---

**Time to complete:** ~5 minutes
**Difficulty:** Easy (just copy-paste URLs)

