# Supabase Redirect URLs Configuration (REQUIRED)

## 🚨 IMMEDIATE ACTION REQUIRED

You MUST add these URLs to your Supabase Dashboard or OAuth will fail!

---

## Step 1: Add Redirect URLs in Supabase

**Go to:** https://supabase.com/dashboard → Select your project → Authentication → URL Configuration → Redirect URLs

### Add ALL of these URLs (one by one):

```
https://www.agorich.com/auth/callback
https://agorich.com/auth/callback
https://www.agorich.com/admin
https://agorich.com/admin
https://www.agorich.com/retailer
https://agorich.com/retailer
https://www.agorich.com/sales
https://agorich.com/sales
https://www.agorich.com/logistic
https://agorich.com/logistic
```

### For Local Development (also add these):

```
http://localhost:3000/auth/callback
http://localhost:3000/admin
http://localhost:3000/retailer
http://localhost:3000/sales
http://localhost:3000/logistic
```

---

## Step 2: Update Site URL

**Location:** Supabase Dashboard → Authentication → URL Configuration → Site URL

**Set to:** `https://www.agorich.com`

(or your main domain with www)

---

## Step 3: Verify Google Cloud Console

**Go to:** https://console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0 Client IDs

### Authorized Redirect URIs must include:

```
https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback
https://www.agorich.com/auth/callback
https://agorich.com/auth/callback
http://localhost:3000/auth/callback
```

---

## Why This Fixes the Issue

When you click "Continue with Google":

1. **Before:** Code sent redirect URL without www → Supabase rejected it → fell back to root URL
2. **After:** Code uses exact hostname (with www if present) → Supabase accepts it → proper callback

---

## Testing After Configuration

1. Clear browser cookies/cache
2. Go to https://www.agorich.com/login
3. Click "Continue with Google"
4. You should redirect to: `https://www.agorich.com/auth/callback?code=...`
5. Then to your dashboard (admin/retailer/sales/logistic)

---

## Troubleshooting

If still failing, check browser console for exact redirect URL being sent:
```
[signInWithGoogle] Redirect URL: https://XXX.com/auth/callback
```

Make sure that EXACT URL is in Supabase redirect URLs list.
