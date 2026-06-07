import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { UserRole } from './supabase-client'

export interface AuthenticatedUser {
  id: string
  role: UserRole
  email?: string
}

interface SupabaseErrorLike {
  code?: string
  message?: string
}

/**
 * Middleware to verify user authentication and role using server-side session (cookies)
 * Returns the authenticated user or NextResponse if there's an error
 */
export async function verifyAuth(request: NextRequest, requiredRoles?: UserRole[]): Promise<AuthenticatedUser | NextResponse> {
  try {
    // Create server-side Supabase client (reads from cookies)
    const supabase = await createServerClient()
    
    // Get session from cookies
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    // Profile not found is OK - user might be new and needs onboarding
    // But we still return the user with default role
    let userRole: UserRole = 'RETAILER' // Default role
    
    if (!profileError && profile) {
      userRole = profile.role as UserRole
    } else if (profileError) {
      // Handle only meaningful errors; ignore empty or expected "not found"
      const error = profileError as SupabaseErrorLike
      const code = error.code
      const message = error.message
      const isEmpty = !code && !message
      const isNotFound =
        code === 'PGRST116' ||
        code === 'PGRST200' ||
        (typeof message === 'string' && (
          message.toLowerCase().includes('no rows') ||
          message.toLowerCase().includes('not found')
        ))

      if (!isEmpty && !isNotFound) {
        console.error('Error loading profile:', profileError)
      }
    }

    // Check if user has required role
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return {
      id: session.user.id,
      role: userRole,
      email: session.user.email
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Middleware to verify admin access (Admin + Internal teams)
 */
export async function verifyAdmin(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return verifyAuth(request, ['SUPER_ADMIN', 'ADMIN', 'SALES', 'SUPPORT'])
}

/**
 * Middleware to verify retailer or admin or distributor access
 */
export async function verifyRetailerOrAdmin(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return verifyAuth(request, ['RETAILER', 'SUPER_ADMIN', 'SUPPORT', 'DISTRIBUTOR'])
}

export async function verifyRetailer(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return verifyAuth(request, ['RETAILER'])
}

export async function verifyDistributor(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return verifyAuth(request, ['DISTRIBUTOR', 'SUPER_ADMIN'])
}

export async function verifyDistributorOrAdmin(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return verifyAuth(request, ['DISTRIBUTOR', 'SUPER_ADMIN', 'ADMIN'])
}

export async function verifyLogisticOrAdmin(request: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return verifyAuth(request, ['LOGISTIC', 'SUPER_ADMIN'])
}
