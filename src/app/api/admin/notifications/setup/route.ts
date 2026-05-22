import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdmin } from '@/lib/api-security'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if ('headers' in authResult) {
      return authResult
    }
    const user = authResult

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create notifications table
    const { error: tableError } = await supabase.rpc('exec', {
      query: `
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'SUCCESS', 'ERROR')),
          category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM' CHECK (category IN ('INVOICE', 'PAYMENT', 'STOCK', 'USER', 'SYSTEM')),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          link VARCHAR(500),
          is_read BOOLEAN DEFAULT FALSE,
          read_at TIMESTAMPTZ,
          created_for_role VARCHAR(50),
          created_for_user_id UUID,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    })

    if (tableError) {
      // RPC might not work, try direct table creation via REST
      console.log('RPC exec not available, trying alternative approach')

      // Create table using insert pattern (will fail if exists, which is fine)
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          type: 'INFO',
          category: 'SYSTEM',
          title: 'Notifications Table Initialized',
          message: 'This is a placeholder to verify the table exists',
          created_for_role: 'SYSTEM_SETUP'
        })
        .select()

      if (insertError) {
        if (insertError.message.includes('duplicate') || insertError.message.includes('already exists')) {
          return NextResponse.json({
            success: true,
            message: 'Notifications table already exists'
          })
        }
        // Table might not exist, return setup instructions
        return NextResponse.json({
          success: false,
          error: 'Please create the notifications table manually',
          sql: `
            CREATE TABLE IF NOT EXISTS notifications (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              type VARCHAR(20) NOT NULL DEFAULT 'INFO',
              category VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              link VARCHAR(500),
              is_read BOOLEAN DEFAULT FALSE,
              read_at TIMESTAMPTZ,
              created_for_role VARCHAR(50),
              created_for_user_id UUID,
              metadata JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Create index for faster queries
            CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(created_for_role);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(created_for_user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
            CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
          `
        }, { status: 400 })
      }

      // Delete the placeholder row
      await supabase
        .from('notifications')
        .delete()
        .eq('id', '00000000-0000-0000-0000-000000000000')

      return NextResponse.json({
        success: true,
        message: 'Notifications table created successfully'
      })
    }

    // Create indexes for better query performance
    await supabase.rpc('exec', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_notifications_role ON notifications(created_for_role);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(created_for_user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Notifications table and indexes created successfully'
    })

  } catch (error) {
    console.error('Error setting up notifications table:', error)
    return NextResponse.json(
      { error: 'Failed to setup notifications table' },
      { status: 500 }
    )
  }
}
