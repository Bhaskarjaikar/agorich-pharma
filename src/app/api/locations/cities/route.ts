import { NextRequest, NextResponse } from 'next/server'

// Simple proxy API to fetch Indian cities for a given state
// Uses countriesnow.space public API (no key required)
// POST /api/locations/cities { state: string }

export async function POST(req: NextRequest) {
  try {
    const { state } = await req.json()
    if (!state || typeof state !== 'string') {
      return NextResponse.json({ error: 'state is required' }, { status: 400 })
    }

    const upstream = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'India', state })
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json({ error: data?.msg || 'Failed to fetch cities' }, { status: 502 })
    }

    // Response format: { error: boolean, msg: string, data: string[] }
    const cities: string[] = Array.isArray(data?.data) ? data.data : []

    // Normalize unique, sorted list
    const normalized = [...new Set(cities.filter(Boolean))].sort((a, b) => a.localeCompare(b))

    return NextResponse.json({ state, cities: normalized }, { status: 200 })
  } catch (error: unknown) {
    console.error('Error fetching cities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
