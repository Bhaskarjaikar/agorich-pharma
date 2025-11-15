# 🔐 Google OAuth Setup Guide for Agorich Pharma

## ✅ **Google Authentication Added!**

Your login and signup pages now have **real Google OAuth integration** with Supabase!

## 🚀 **What's Already Working:**

### ✅ **Login Page (`/login`):**
- **Google Sign-In Button**: Real OAuth integration
- **Loading States**: Shows "Connecting..." when clicked
- **Error Handling**: Displays errors if Google auth fails
- **Auto Redirect**: Redirects to dashboard after successful login

### ✅ **Signup Page (`/register`):**
- **Google Sign-Up Button**: Real OAuth integration
- **Loading States**: Shows "Connecting..." when clicked
- **Error Handling**: Displays errors if Google auth fails
- **Auto Redirect**: Redirects to dashboard after successful signup

## ⚙️ **Supabase Dashboard Configuration Required:**

### **Step 1: Enable Google Provider**

1. **Go to your Supabase Dashboard**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Select your project**: `cfthxtnwuhvhhnifshsr`
3. **Go to Authentication** → **Providers**
4. **Find Google** and click **Enable**

### **Step 2: Configure Google OAuth**

You'll need to set up Google OAuth credentials:

#### **A. Create Google OAuth App:**

1. **Go to Google Cloud Console**: [console.cloud.google.com](https://console.cloud.google.com)
2. **Create a new project** or select existing one
3. **Enable Google+ API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" and enable it
4. **Create OAuth 2.0 Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Web application**
   - **IMPORTANT**: Add **Authorized redirect URIs** (must match exactly):
     ```
     https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback
     ```
   - ⚠️ **CRITICAL**: This URL must match EXACTLY (including `https://`, no trailing slash)
   - If you see "Error 400: redirect_uri_mismatch", check:
     - The redirect URI is exactly: `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback`
     - No extra spaces or characters
     - Protocol is `https://` (not `http://`)
     - No trailing slash at the end

#### **B. Get Your Google Credentials:**

After creating the OAuth app, you'll get:
- **Client ID**: `your-google-client-id.googleusercontent.com`
- **Client Secret**: `your-google-client-secret`

### **Step 3: Add Credentials to Supabase**

1. **In Supabase Dashboard** → **Authentication** → **Providers**
2. **Click on Google provider**
3. **Add your credentials**:
   - **Client ID**: Paste your Google Client ID
   - **Client Secret**: Paste your Google Client Secret
4. **Save the configuration**

### **Step 4: Configure Redirect URLs**

1. **In Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Add these URLs**:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: 
     ```
     http://localhost:3000/dashboard
     http://localhost:3000/auth/callback
     ```

## 🎯 **Testing Your Google Authentication:**

### **After Configuration:**

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Test Google Login**:
   - Go to `http://localhost:3000/login`
   - Click "Continue with Google"
   - You should be redirected to Google's OAuth page
   - After authorization, you'll be redirected back to your dashboard

3. **Test Google Signup**:
   - Go to `http://localhost:3000/register`
   - Click "Continue with Google"
   - Same flow as login

## 🔧 **Features Included:**

### ✅ **Real Google OAuth:**
- **Secure Authentication**: Uses Google's OAuth 2.0
- **User Profile Data**: Automatically gets name, email, profile picture
- **No Password Required**: Users can sign in with just their Google account
- **Trusted Provider**: Google handles security and verification

### ✅ **User Experience:**
- **One-Click Login**: Fast and convenient
- **Loading States**: Visual feedback during authentication
- **Error Handling**: Clear error messages if something goes wrong
- **Auto Redirect**: Seamless navigation to dashboard

### ✅ **Security Features:**
- **OAuth 2.0**: Industry-standard authentication
- **Secure Tokens**: JWT tokens managed by Supabase
- **Session Management**: Automatic session handling
- **Data Protection**: User data encrypted and secure

## 🚨 **Important Notes:**

### **Development vs Production:**

- **Development**: Use `http://localhost:3000` in redirect URLs
- **Production**: Update redirect URLs to your production domain

### **Google OAuth Limits:**

- **Free Tier**: 100 requests per 100 seconds per user
- **Rate Limits**: Google may limit requests if exceeded
- **Quota**: Monitor usage in Google Cloud Console

## 🎉 **What Happens After Setup:**

1. **User clicks "Continue with Google"**
2. **Redirected to Google OAuth page**
3. **User authorizes your app**
4. **Google redirects back to Supabase**
5. **Supabase creates/updates user account**
6. **User is redirected to your dashboard**
7. **User is logged in and ready to use your app**

## 🔍 **Troubleshooting:**

### **Common Issues:**

1. **"Error 400: redirect_uri_mismatch"** ⚠️ **MOST COMMON**:
   - **Problem**: The redirect URI in Google Cloud Console doesn't match what Supabase sends
   - **Solution**: 
     1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
     2. Click on your OAuth 2.0 Client ID
     3. Under **Authorized redirect URIs**, ensure you have EXACTLY:
        ```
        https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback
        ```
     4. Check for:
        - ✅ Must start with `https://` (not `http://`)
        - ✅ Must be exactly `https://cfthxtnwuhvhhnifshsr.supabase.co/auth/v1/callback`
        - ✅ No trailing slash
        - ✅ No extra spaces
        - ✅ Copy-paste the exact URL from above
     5. Click **Save**
     6. Wait 1-2 minutes for changes to propagate
     7. Try logging in again

2. **"Invalid redirect URI"**:
   - Check redirect URIs in Google Cloud Console
   - Ensure they match exactly (including http/https)
   - See issue #1 above for detailed steps

3. **"Client ID not found"**:
   - Verify Client ID in Supabase dashboard
   - Check for typos or extra spaces
   - Ensure you copied the full Client ID (ends with `.googleusercontent.com`)

4. **"Access denied"**:
   - Check if Google+ API is enabled
   - Verify OAuth consent screen is configured
   - Ensure your Google account has access to the OAuth consent screen

5. **"Redirect not working"**:
   - Check redirect URLs in Supabase Dashboard → Authentication → URL Configuration
   - Ensure they include: `http://localhost:3000/auth/callback` (development)
   - For production, add: `https://yourdomain.com/auth/callback`

---

**🎯 Your Google OAuth integration is ready! Just configure the credentials in Supabase and Google Cloud Console, and your users can sign in with their Google accounts! 🚀**


















