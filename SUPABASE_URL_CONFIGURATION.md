# 🔗 Supabase URL Configuration Guide

## 🎯 Overview

This guide explains how to properly configure redirect URLs in Supabase for OAuth authentication and role-based redirects. Incorrect configuration leads to "Invalid auth callback URL" errors and redirect failures.

## ⚠️ Critical Issues Identified

### 1. Missing Redirect URLs in Supabase Dashboard

**Problem:** Supabase Redirect URLs list me sirf `/auth/callback` aur `/dashboard` hain, but application me multiple redirects ho sakte hain based on user roles.

**Solution:** Supabase Dashboard me saare possible redirect URLs add karni hongi.

### 2. Production vs Development URLs

**Problem:** Production environment me `http://localhost:3000` URLs configured hain, jo production me fail hoga.

**Solution:** Production domain URLs separately add karni hongi.

## 📋 Required Redirect URLs

### For Local Development (localhost:3000)

Supabase Dashboard → Authentication → URL Configuration → Redirect URLs me ye URLs add karo:

```
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/admin
http://localhost:3000/retailer
http://localhost:3000/sales
http://localhost:3000/logistic
http://localhost:3000/onboarding
```

### For Production (Your Domain)

Agar aapki app deployed hai, production domain ke liye ye URLs add karo:

```
https://yourdomain.com/auth/callback
https://yourdomain.com/dashboard
https://yourdomain.com/admin
https://yourdomain.com/retailer
https://yourdomain.com/sales
https://yourdomain.com/logistic
https://yourdomain.com/onboarding
```

**Note:** `yourdomain.com` ko replace karo apne actual production domain se.

## 🔧 Step-by-Step Configuration

### Step 1: Supabase Dashboard Configuration

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `cfthxtnwuhvhhnifshsr`

2. **Navigate to URL Configuration**
   - Go to **Authentication** → **URL Configuration**

3. **Update Site URL**
   - **For Development:** `http://localhost:3000`
   - **For Production:** `https://yourdomain.com` (replace with actual domain)

4. **Add Redirect URLs**
   - Click **"Add URL"** button
   - Add each URL one by one:
     - Start with development URLs (localhost)
     - Then add production URLs (if deployed)
   - **Important:** URLs must match EXACTLY (including http/https, no trailing slashes)

### Step 2: Google Cloud Console Configuration

**Current Status:**
- ✅ Supabase callback: `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback` (already configured)
- ✅ Local dev callback: `http://localhost:3000/auth/callback` (already configured)

**Action Required (if app is deployed):**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID: `Agorich_pharma`
4. Under **Authorized redirect URIs**, add production domain callback:
   ```
   https://yourdomain.com/auth/callback
   ```
5. Click **Save**

**Note:** Google Cloud Console me sirf callback URLs add karni hain, not all dashboard URLs. Supabase handles the internal redirects.

### Step 3: Verify Configuration

1. **Check Supabase Redirect URLs:**
   - All required URLs listed hain
   - No typos or extra spaces
   - Correct protocol (http for localhost, https for production)

2. **Check Google OAuth:**
   - Supabase callback URL exactly matches: `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback`
   - Local callback URL matches: `http://localhost:3000/auth/callback`
   - Production callback URL added (if deployed)

3. **Test Authentication Flow:**
   - Login with Google
   - Verify redirect works for all roles
   - Check no "Invalid auth callback URL" errors

## 🎯 Role-Based Redirects

Application me users ko unke role ke basis pe redirect hota hai:

| Role | Redirect URL |
|------|--------------|
| `SUPER_ADMIN` | `/admin` |
| `RETAILER` | `/retailer` |
| `SALES` | `/sales` |
| `SUPPORT` | `/retailer` |
| `LOGISTIC` | `/logistic` |
| Incomplete Profile | `/onboarding` |
| Default | `/retailer` |

**Important:** Supabase Redirect URLs me in saare paths add hone chahiye, otherwise Supabase redirect allow nahi karega.

## 🔍 Code Implementation

### allowedRedirects Array

`src/app/auth/callback/page.tsx` me `allowedRedirects` array updated hai:

```typescript
const allowedRedirects = [
  '/dashboard',
  '/admin',
  '/retailer',
  '/sales',
  '/logistic',
  '/onboarding',
  '/login',
  '/'
]
```

Ye array security ke liye use hoti hai - sirf allowed paths pe redirect ho sakta hai.

## 🚨 Common Errors and Solutions

### Error: "Invalid auth callback URL"

**Cause:** Redirect URL Supabase ke allowed list me nahi hai.

**Solution:**
1. Supabase Dashboard → Authentication → URL Configuration me check karo
2. Missing URL add karo
3. Exact match ensure karo (no trailing slashes, correct protocol)

### Error: "redirect_uri_mismatch" (Google OAuth)

**Cause:** Google Cloud Console me callback URL properly configured nahi hai.

**Solution:**
1. Google Cloud Console → OAuth 2.0 Client IDs
2. Check **Authorized redirect URIs**
3. Ensure exact match with Supabase callback: `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback`

### Error: Redirect loop after login

**Cause:** Redirect URL Supabase me allowed nahi hai, ya code me wrong redirect ho raha hai.

**Solution:**
1. Check Supabase Redirect URLs list
2. Verify `allowedRedirects` array in code
3. Check browser console for errors

## ✅ Configuration Checklist

### Supabase Dashboard
- [ ] Site URL configured (development: `http://localhost:3000`, production: `https://yourdomain.com`)
- [ ] Redirect URL: `http://localhost:3000/auth/callback` (development)
- [ ] Redirect URL: `http://localhost:3000/dashboard` (development)
- [ ] Redirect URL: `http://localhost:3000/admin` (development)
- [ ] Redirect URL: `http://localhost:3000/retailer` (development)
- [ ] Redirect URL: `http://localhost:3000/sales` (development)
- [ ] Redirect URL: `http://localhost:3000/logistic` (development)
- [ ] Redirect URL: `http://localhost:3000/onboarding` (development)
- [ ] Production URLs added (if deployed)

### Google Cloud Console
- [ ] Supabase callback: `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback`
- [ ] Local callback: `http://localhost:3000/auth/callback`
- [ ] Production callback: `https://yourdomain.com/auth/callback` (if deployed)

### Code Verification
- [ ] `allowedRedirects` array includes all paths
- [ ] Role-based redirect logic working
- [ ] No hardcoded redirects to unlisted URLs

## 📝 Important Notes

1. **Exact Match Required:** Supabase redirect URLs must EXACTLY match what the application requests. Even a trailing slash difference will cause errors.

2. **Protocol Matters:** 
   - Development: Use `http://` for localhost
   - Production: Use `https://` for deployed domains

3. **Timing:** Supabase URL changes may take 1-5 minutes to propagate. Test after a short delay.

4. **Security:** Only add necessary redirect URLs. Don't use wildcards unless absolutely required.

5. **Environment Separation:** 
   - Development URLs: `http://localhost:3000/*`
   - Production URLs: `https://yourdomain.com/*`
   - Keep both if working in both environments

## 🔄 Testing After Configuration

1. **Test Google Login:**
   - Click "Continue with Google"
   - Verify redirect to correct dashboard based on role
   - Check no "Invalid auth callback URL" errors

2. **Test All Roles:**
   - Login as SUPER_ADMIN → should redirect to `/admin`
   - Login as RETAILER → should redirect to `/retailer`
   - Login as SALES → should redirect to `/sales`
   - Login as LOGISTIC → should redirect to `/logistic`
   - New user → should redirect to `/onboarding`

3. **Test Production (if deployed):**
   - Verify production URLs work
   - Check HTTPS redirects
   - Confirm no mixed content warnings

## 📚 Related Documentation

- [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
- [Complete Supabase Setup](./SUPABASE_COMPLETE_SETUP.md)
- [Troubleshooting Google Auth](./TROUBLESHOOTING_GOOGLE_AUTH.md)

## 🆘 Need Help?

Agar koi issue aaye:
1. Check browser console for errors
2. Verify Supabase logs (Dashboard → Logs & Analytics)
3. Check Google Cloud Console OAuth settings
4. Ensure all URLs match exactly (no typos)

---

**Last Updated:** November 2025
**Project:** Agorich Pharma
**Supabase Project ID:** `cfthxtnwuhvhhnifshsr`

