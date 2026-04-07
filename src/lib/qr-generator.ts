// Generate QR code for referral link
export async function generateQRCode(referralLink: string): Promise<string> {
  try {
    // For now, return a placeholder QR code URL
    // In production, you would use a QR code service or library
    const qrCodeDataURL = `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="#1e3a8a">
          QR Code
        </text>
        <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="8" fill="#666">
          ${referralLink}
        </text>
      </svg>
    `)}`
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

// Generate QR code as SVG
export async function generateQRCodeSVG(referralLink: string): Promise<string> {
  try {
    // For now, return a placeholder SVG QR code
    const qrCodeSVG = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="#1e3a8a">
          QR Code
        </text>
        <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="8" fill="#666">
          ${referralLink}
        </text>
      </svg>
    `
    return qrCodeSVG
  } catch (error) {
    console.error('Error generating QR code SVG:', error)
    throw new Error('Failed to generate QR code SVG')
  }
}

// Download QR code as image
export function downloadQRCode(qrCodeDataURL: string, filename: string = 'referral-qr-code.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = qrCodeDataURL
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Generate QR code with custom styling for different use cases
export async function generateStyledQRCode(
  referralLink: string,
  options: {
    size?: number
    color?: string
    backgroundColor?: string
    logo?: string
  } = {}
): Promise<string> {
  const {
    size = 200,
    color = '#1e3a8a',
    backgroundColor = '#ffffff',
    logo: _logo,
  } = options

  try {
    // _logo is reserved for future use (embedding logos in QR codes)
    void _logo
    // For now, return a placeholder styled QR code
    const qrCodeDataURL = `data:image/svg+xml;base64,${btoa(`
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="${backgroundColor}"/>
        <text x="${size/2}" y="${size/2}" text-anchor="middle" font-family="Arial" font-size="12" fill="${color}">
          QR Code
        </text>
        <text x="${size/2}" y="${size/2 + 20}" text-anchor="middle" font-family="Arial" font-size="8" fill="#666">
          ${referralLink}
        </text>
      </svg>
    `)}`
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating styled QR code:', error)
    throw new Error('Failed to generate styled QR code')
  }
}
