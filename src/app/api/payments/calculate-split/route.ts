import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { grand_total, minimum_percentage = 50 } = body

    if (!grand_total || grand_total <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid grand total amount'
        },
        { status: 400 }
      )
    }

    // Calculate minimum online payment (default 50%)
    const minimumOnline = Math.ceil((grand_total * minimum_percentage) / 100)
    const codAmount = grand_total - minimumOnline

    return NextResponse.json({
      success: true,
      total: grand_total,
      minimum_online: minimumOnline,
      cod_amount: codAmount,
      minimum_percentage: minimum_percentage,
      message: `Minimum ${minimum_percentage}% (₹${minimumOnline}) must be paid online. Remaining ₹${codAmount} as COD.`
    })

  } catch (error) {
    console.error('Error calculating split payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate split payment'
      },
      { status: 500 }
    )
  }
}

// Also support GET with query params
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const grandTotal = parseFloat(searchParams.get('total') || '0')
    const minimumPercentage = parseInt(searchParams.get('min_percent') || '50')

    if (!grandTotal || grandTotal <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid grand total amount'
        },
        { status: 400 }
      )
    }

    // Calculate minimum online payment
    const minimumOnline = Math.ceil((grandTotal * minimumPercentage) / 100)
    const codAmount = grandTotal - minimumOnline

    return NextResponse.json({
      success: true,
      total: grandTotal,
      minimum_online: minimumOnline,
      cod_amount: codAmount,
      minimum_percentage: minimumPercentage,
      message: `Minimum ${minimumPercentage}% (₹${minimumOnline}) must be paid online. Remaining ₹${codAmount} as COD.`
    })

  } catch (error) {
    console.error('Error calculating split payment:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate split payment'
      },
      { status: 500 }
    )
  }
}
