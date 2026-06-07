import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-security';

/**
 * DELETE /api/admin/delete-user
 * Headers: { "Authorization": "Bearer <jwt_token>" }
 * Body (JSON): { "userId": "<uuid>" }
 *
 * This endpoint must only run on the server. It uses the SUPABASE_SERVICE_ROLE_KEY
 * to call the Supabase Admin API for deleting an Auth user.
 * Requires SUPER_ADMIN role.
 */

const SUPABASE_URL = process.env.SUPABASE_URL; // e.g. https://cfthxtnwuhvhhnifshsr.supabase.co
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  // It's safe to throw early during cold start so missing envs are caught immediately.
  // In production, Vercel/Railway will show the build/runtime logs.
  // We don't expose these env values to the client.
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
}

/**
 * Helper: derive project slug from SUPABASE_URL
 * e.g. https://cfthxtnwuhvhhnifshsr.supabase.co -> cfthxtnwuhvhhnifshsr
 */
function getProjectSlug(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return null;
  try {
    const host = new URL(supabaseUrl).host; // cfthxtnwuhvhhnifshsr.supabase.co
    return host.split('.')[0];
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Verify SUPER_ADMIN authentication (destructive operation)
    const authResult = await verifyAuth(req, ['SUPER_ADMIN'])
    if ('headers' in authResult) {
      return authResult
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' 
      }, { 
        status: 500 
      });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ 
        error: 'Content-Type must be application/json' 
      }, { 
        status: 400 
      });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ 
        error: 'userId (string) is required in body' 
      }, { 
        status: 400 
      });
    }

    const project = getProjectSlug(SUPABASE_URL);
    if (!project) {
      return NextResponse.json({ 
        error: 'Unable to determine project slug from SUPABASE_URL' 
      }, { 
        status: 500 
      });
    }

    // Admin API endpoint (platform endpoint) — this is the supported admin route to manage users
    const adminUrl = `https://api.supabase.com/platform/auth/${project}/users/${encodeURIComponent(userId)}`;

    const res = await fetch(adminUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Try to capture JSON response body if present, otherwise text
    let respBody: unknown = null;
    try {
      respBody = await res.json();
    } catch {
      respBody = await res.text().catch(() => null);
    }

    if (!res.ok) {
      // Return the status and body from the admin API to help debugging.
      return NextResponse.json({ 
        error: 'Supabase admin API error', 
        status: res.status, 
        body: respBody 
      }, { 
        status: 502 
      });
    }

    // Successful deletion — Supabase admin API usually returns 200 or 204 with details.
    return NextResponse.json({ 
      success: true, 
      result: respBody 
    }, { 
      status: 200 
    });
  } catch (err: unknown) {
    // Always log the full server-side error to your server logs (Vercel/Railway/AWS).
    console.error('delete-user route error:', err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(err) 
    }, { 
      status: 500 
    });
  }
}
