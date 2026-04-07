// Share utility functions for referral system

interface WindowWithGtag extends Window {
  gtag?: (...args: unknown[]) => void
}

export interface ShareOptions {
  code: string
  link: string
  message?: string
  subject?: string
  userName?: string
}

// Generate pre-filled messages for different platforms
export function generateShareMessages(options: ShareOptions) {
  const { code, link } = options
  
  return {
    whatsapp: `Hey! I'm using Agorich Pharma for my pharmacy/business and earning amazing margins! 💰 Join using my code: ${code} and get ₹1,000 welcome credit! Get started: ${link} 🚀`,
    
    sms: `Join Agorich Pharma using my code ${code} and get ₹1,000 welcome credit! Link: ${link}`,
    
    email: {
      subject: 'Join Agorich - Exclusive Referral Offer',
      body: `Hi there!

I wanted to share an amazing opportunity with you. I'm using Agorich Pharma for my business and it's been fantastic - great margins, quality products, and excellent service.

I have an exclusive referral code for you: ${code}

When you join using this code, you'll get:
• ₹1,000 welcome credit on your first order
• Access to our premium product catalog
• Special onboarding support
• Priority customer service

Join now: ${link}

Best regards,
[Your Name]`
    },
    
    facebook: `🚀 Exciting news! I'm earning great margins with Agorich Pharma! 

Join using my code ${code} and get ₹1,000 welcome credit on your first order! 

Perfect for pharmacy owners and medical representatives. 

Get started: ${link}

#AgorichPharma #PharmacyBusiness #MedicalSupplies`,
    
    twitter: `I'm using Agorich Pharma to grow my business! Join with my code ${code} and get ₹1,000 welcome credit. Start here: ${link} #AgorichPharma #PharmacyBusiness`,
    
    linkedin: `I'm excited to share that I'm now working with Agorich Pharma, and it's been an excellent experience for my business.

They're offering a special referral program where you can get ₹1,000 welcome credit when you join using my code: ${code}

Benefits include:
• Premium product catalog
• Competitive margins
• Professional support
• Quality assurance

Join here: ${link}

#Pharmaceuticals #BusinessGrowth #MedicalSupplies`
  }
}

// Share via WhatsApp
export function shareViaWhatsApp(message: string) {
  const encodedMessage = encodeURIComponent(message)
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
  window.open(whatsappUrl, '_blank')
}

// Share via SMS
export function shareViaSMS(message: string) {
  const encodedMessage = encodeURIComponent(message)
  const smsUrl = `sms:?body=${encodedMessage}`
  window.open(smsUrl)
}

// Share via Email
export function shareViaEmail(subject: string, body: string) {
  const encodedSubject = encodeURIComponent(subject)
  const encodedBody = encodeURIComponent(body)
  const emailUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`
  window.open(emailUrl)
}

// Share via Facebook
export function shareViaFacebook(url: string, quote?: string) {
  const encodedUrl = encodeURIComponent(url)
  const encodedQuote = quote ? encodeURIComponent(quote) : ''
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}${encodedQuote ? `&quote=${encodedQuote}` : ''}`
  window.open(facebookUrl, '_blank', 'width=600,height=400')
}

// Share via LinkedIn
export function shareViaLinkedIn(url: string, title?: string, summary?: string) {
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = title ? encodeURIComponent(title) : ''
  const encodedSummary = summary ? encodeURIComponent(summary) : ''
  
  let linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  if (encodedTitle) linkedinUrl += `&title=${encodedTitle}`
  if (encodedSummary) linkedinUrl += `&summary=${encodedSummary}`
  
  window.open(linkedinUrl, '_blank', 'width=600,height=400')
}

// Share via Twitter
export function shareViaTwitter(text: string, url?: string) {
  const encodedText = encodeURIComponent(text)
  const encodedUrl = url ? encodeURIComponent(url) : ''
  
  let twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`
  if (encodedUrl) twitterUrl += `&url=${encodedUrl}`
  
  window.open(twitterUrl, '_blank', 'width=600,height=400')
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Copy referral code to clipboard
export async function copyReferralCode(code: string): Promise<boolean> {
  return await copyToClipboard(code)
}

// Copy referral link to clipboard
export async function copyReferralLink(link: string): Promise<boolean> {
  return await copyToClipboard(link)
}

// Use Web Share API if available
export async function shareViaWebAPI(shareData: {
  title?: string
  text?: string
  url?: string
}): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share(shareData)
      return true
    } catch (error) {
      console.error('Web Share API failed:', error)
      return false
    }
  }
  return false
}

// Check if Web Share API is supported
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator
}

// Generate shortened URL (placeholder - would integrate with URL shortener service)
export function generateShortUrl(longUrl: string): string {
  // In a real implementation, this would call a URL shortening service
  // For now, return the original URL
  return longUrl
}

// Track share events (placeholder for analytics)
export function trackShareEvent(platform: string, code: string) {
  // In a real implementation, this would send analytics data
  console.log(`Share event: ${platform} - Code: ${code}`)
  
  // Example analytics tracking
  if (typeof window !== 'undefined') {
    const win = window as WindowWithGtag
    if (typeof win.gtag === 'function') {
      win.gtag('event', 'share', {
        method: platform,
        content_type: 'referral_code',
        item_id: code,
      })
    }
  }
}












