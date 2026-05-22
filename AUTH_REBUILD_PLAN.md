# 🔄 Authentication System Rebuild Plan

## 🎯 Goal
Rebuild authentication system from scratch with **simple, clean architecture**

## 📋 Current Issues
- Too many components handling same thing (ClockSkewHandler, auth callback, middleware)
- Complex clock skew handling scattered everywhere
- Race conditions between components
- Confusing redirect logic
- Over-engineered solutions

## ✨ New Clean Architecture

### 1. **Supabase Client** (`src/lib/supabase-client.ts`)
- **Simple**: Let Supabase handle sessions automatically
- **No manual URL handling**: Use `detectSessionInUrl: true`
- **Trust Supabase**: They handle clock skew internally

### 2. **Auth Hook** (`src/hooks/useSupabaseAuth.ts`)
- **Simple state management**: Just user, session, profile, role
- **No complex error handling**: Let Supabase handle it
- **Clean loading states**: Simple loading/ready states

### 3. **Auth Callback** (`src/app/auth/callback/page.tsx`)
- **Minimal logic**: Just handle OAuth redirect
- **Trust Supabase**: Use `exchangeCodeForSession` or `setSession`
- **Simple redirect**: Redirect to dashboard after success

### 4. **Middleware** (`src/middleware.ts`)
- **Simple protection**: Check session, redirect if not authenticated
- **No complex verification**: Just check session exists

### 5. **Remove ClockSkewHandler**
- **Delete component**: Not needed if we trust Supabase
- **Remove from layout**: Clean up

### 6. **Login Page** (`src/app/(auth)/login/page.tsx`)
- **Clean redirect handling**: Simple redirect after login
- **No complex logic**: Just handle login forms

## 🔧 Implementation Steps

1. ✅ Simplify Supabase client config
2. ✅ Rebuild auth hook (simple version)
3. ✅ Rebuild auth callback (minimal logic)
4. ✅ Simplify middleware
5. ✅ Remove ClockSkewHandler
6. ✅ Clean up login page
7. ✅ Test complete flow

## 📝 Principles

- **KISS (Keep It Simple, Stupid)**: Simple is better than complex
- **Trust Supabase**: They handle edge cases better than we can
- **Single Responsibility**: Each component does ONE thing
- **No Race Conditions**: One source of truth (Supabase)
- **Clear Flow**: Easy to understand and debug

