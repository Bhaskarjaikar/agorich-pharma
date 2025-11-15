# Environment Variables Setup

## Required Environment Variables

Add these to your `.env.local` file (for local development) or your hosting platform's environment variables:

### 1. SUPABASE_URL
```
SUPABASE_URL=https://cfthxtnwuhvhhnifshsr.supabase.co
```
- Get this from your Supabase Dashboard → Settings → API → Project URL

### 2. SUPABASE_SERVICE_ROLE_KEY
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInRcCI6IkpXVCJ9...
```
- Get this from your Supabase Dashboard → Settings → API → Service Role Key
- **IMPORTANT**: Keep this secret! Never commit to git or expose to client-side code

### 3. NEXT_PUBLIC_SUPABASE_URL (for client-side)
```
NEXT_PUBLIC_SUPABASE_URL=https://cfthxtnwuhvhhnifshsr.supabase.co
```
- Same as SUPABASE_URL but with NEXT_PUBLIC_ prefix for client access

### 4. NEXT_PUBLIC_SUPABASE_ANON_KEY (for client-side)
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInRcCI6IkpXVCJ9...
```
- Get this from your Supabase Dashboard → Settings → API → anon/public key

## Complete .env.local Example

```env
# Server-side (API routes)
SUPABASE_URL=https://cfthxtnwuhvhhnifshsr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInRcCI6IkpXVCJ9...

# Client-side (browser)
NEXT_PUBLIC_SUPABASE_URL=https://cfthxtnwuhvhhnifshsr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInRcCI6IkpXVCJ9...
```

## Deployment Platforms

### Vercel
1. Go to Project → Settings → Environment Variables
2. Add all 4 variables above
3. Redeploy your project

### Railway
1. Go to Project → Variables
2. Add all 4 variables above
3. Redeploy your project

### AWS/Other
1. Use your platform's environment variable configuration
2. Add all 4 variables above
3. Redeploy your project

## Security Notes

- ✅ **SUPABASE_SERVICE_ROLE_KEY** - Server-only, never expose to client
- ✅ **NEXT_PUBLIC_*** variables - Safe to expose to client (browser)
- ❌ **Never commit** `.env.local` to git
- ❌ **Never log** service role key in console
- ❌ **Never use** service role key in client-side code

## Testing

After setting up environment variables:

1. **Restart your development server**: `npm run dev`
2. **Test user deletion** with the admin management page
3. **Check console** for any environment variable errors
4. **Verify** user is deleted in Supabase Dashboard → Authentication → Users







