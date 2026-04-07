import { NextRequest, NextResponse } from 'next/server'

interface PostalOffice {
  State?: string
  District?: string
  Block?: string
  Division?: string
  Name?: string
}

// Validate Indian PIN code and return state and places using public Postal Pincode API
// POST /api/locations/pincode { pincode: string }
export async function POST(req: NextRequest) {
  try {
    const { pincode } = await req.json()
    const pin = String(pincode || '').trim()
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid pincode format' }, { status: 400 })
    }

    const upstream = await fetch(`https://api.postalpincode.in/pincode/${pin}`)
    const data = await upstream.json()

    // API returns [{ Status: 'Success'|'Error', PostOffice: [...] }]
    const item = Array.isArray(data) ? data[0] : null
    if (!item || item.Status !== 'Success' || !Array.isArray(item.PostOffice) || item.PostOffice.length === 0) {
      return NextResponse.json({ error: 'Pincode not found' }, { status: 404 })
    }

    const offices = item.PostOffice as PostalOffice[]
    const state = offices[0]?.State || ''
    const district = offices[0]?.District || ''
    const cities: string[] = offices
      .map((po) => po.District || po.Block || po.Division || po.Name)
      .filter((name): name is string => Boolean(name))

    const uniqueCities = [...new Set(cities)]

    return NextResponse.json({ pincode: pin, state, district, cities: uniqueCities })
  } catch (error: unknown) {
    console.error('Error fetching pincode info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
