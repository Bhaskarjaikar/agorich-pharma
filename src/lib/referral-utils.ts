// Referral utility functions for Agorich Pharma

export interface Referral {
  id: string
  referrer_id: string
  referred_id?: string
  referred_email?: string
  referral_code: string
  qr_code_url?: string
  referral_type: 'pharmacy_to_pharmacy' | 'mr_to_mr' | 'cross_type'
  status: 'pending' | 'approved' | 'active' | 'completed' | 'expired'
  created_at: string
  expiry_date?: string
  first_order_date?: string
  approval_date?: string
  bonus_activation_date?: string
  bonus_expiry_date?: string
  referrer_bonus_amount?: number
  referrer_bonus_type?: string
  referred_bonus_amount?: number
  referred_bonus_type?: string
  updated_at: string
}

export interface ReferralEarning {
  id: string
  referral_id: string
  user_id: string
  earning_date: string
  amount: number
  bonus_type: string
  description: string
  is_paid: boolean
  payment_date?: string
  payment_reference?: string
  created_at: string
}

export interface LoyaltyPoints {
  id: string
  user_id: string
  points_balance: number
  tier_level: 'bronze' | 'silver' | 'gold' | 'platinum'
  tier_since_date?: string
  total_points_earned: number
  points_redeemed: number
  created_at: string
  updated_at: string
}

export interface Achievement {
  id: string
  user_id: string
  badge_id: string
  badge_name: string
  description: string
  icon_url?: string
  unlocked_date: string
  created_at: string
}

// Generate unique referral code
export function generateReferralCode(): string {
  const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
  const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `AGR-${part1}-${part2}`
}

// Calculate bonus based on referral type
export function calculateBonus(type: string, amount?: number): { referrer: number; referred: number } {
	// amount is reserved for future advanced bonus logic (tiered based on order value)
	void amount
  switch (type) {
    case 'pharmacy_to_pharmacy':
      return {
        referrer: 0, // 3% margin for 30 days (calculated separately)
        referred: 1000 // ₹1,000 credit on first order
      }
    case 'mr_to_mr':
      return {
        referrer: 5000, // ₹5,000 cash incentive
        referred: 2000 // ₹2,000 cash incentive + ₹5,000 advance
      }
    case 'cross_type':
      return {
        referrer: 2000, // ₹2,000 cash incentive
        referred: 1000 // ₹1,000 cash incentive
      }
    default:
      return { referrer: 0, referred: 0 }
  }
}

// Check referral status based on dates and conditions
export function checkReferralStatus(referral: Referral): string {
  const now = new Date()
  const expiry = referral.expiry_date ? new Date(referral.expiry_date) : null
  const firstOrder = referral.first_order_date ? new Date(referral.first_order_date) : null
  const bonusExpiry = referral.bonus_expiry_date ? new Date(referral.bonus_expiry_date) : null

  // Check if expired
  if (expiry && now > expiry) {
    return 'expired'
  }

  // Check if completed (bonus period ended)
  if (bonusExpiry && now > bonusExpiry) {
    return 'completed'
  }

  // Check if active (first order placed and bonus period active)
  if (firstOrder && bonusExpiry && now <= bonusExpiry) {
    return 'active'
  }

  // Check if approved (referred person signed up)
  if (referral.approval_date) {
    return 'approved'
  }

  // Default to pending
  return 'pending'
}

// Calculate days remaining for active referrals
export function calculateDaysRemaining(referral: Referral): number {
  if (referral.status !== 'active' || !referral.bonus_expiry_date) {
    return 0
  }
  
  const now = new Date()
  const expiry = new Date(referral.bonus_expiry_date)
  const diffTime = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

// Calculate progress percentage for active referrals
export function calculateProgress(referral: Referral): number {
  if (referral.status !== 'active' || !referral.bonus_activation_date || !referral.bonus_expiry_date) {
    return 0
  }
  
  const activation = new Date(referral.bonus_activation_date)
  const expiry = new Date(referral.bonus_expiry_date)
  const now = new Date()
  
  const totalDuration = expiry.getTime() - activation.getTime()
  const elapsed = now.getTime() - activation.getTime()
  
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// Get tier information
export function getTierInfo(points: number): {
  current: string
  next: string
  progress: number
  pointsToNext: number
} {
  if (points < 1000) {
    return {
      current: 'bronze',
      next: 'silver',
      progress: (points / 1000) * 100,
      pointsToNext: 1000 - points
    }
  } else if (points < 5000) {
    return {
      current: 'silver',
      next: 'gold',
      progress: ((points - 1000) / 4000) * 100,
      pointsToNext: 5000 - points
    }
  } else if (points < 15000) {
    return {
      current: 'gold',
      next: 'platinum',
      progress: ((points - 5000) / 10000) * 100,
      pointsToNext: 15000 - points
    }
  } else {
    return {
      current: 'platinum',
      next: 'platinum',
      progress: 100,
      pointsToNext: 0
    }
  }
}

// Get tier benefits
export function getTierBenefits(tier: string) {
  const benefits = {
    bronze: {
      name: 'Bronze',
      icon: '🥉',
      color: 'from-amber-500 to-orange-500',
      pointsPerRupee: 1,
      benefits: [
        '1 point = ₹1 spent',
        'Basic support',
        'Monthly newsletter'
      ]
    },
    silver: {
      name: 'Silver',
      icon: '🥈',
      color: 'from-gray-400 to-gray-600',
      pointsPerRupee: 1.5,
      benefits: [
        '1 point = ₹1.5 spent',
        'Priority support',
        'Exclusive offers (10% off)',
        'Birthday bonus (500 points)',
        'Referral bonus: +10% extra'
      ]
    },
    gold: {
      name: 'Gold',
      icon: '🥇',
      color: 'from-yellow-400 to-yellow-600',
      pointsPerRupee: 2,
      benefits: [
        '1 point = ₹2 spent',
        'VIP support 24/7',
        'Exclusive offers (15% off)',
        'Free shipping',
        'Birthday bonus (1,000 points)',
        'Referral bonus: +20% extra',
        'Quarterly review with account manager'
      ]
    },
    platinum: {
      name: 'Platinum',
      icon: '💎',
      color: 'from-purple-400 to-purple-600',
      pointsPerRupee: 2.5,
      benefits: [
        '1 point = ₹2.5 spent',
        'Dedicated account manager',
        'White-glove support',
        'Exclusive offers (25% off)',
        'Free delivery everywhere',
        'Birthday bonus (2,000 points)',
        'Referral bonus: +30% extra',
        'Annual recognition & awards'
      ]
    }
  }
  
  return benefits[tier as keyof typeof benefits] || benefits.bronze
}

// Generate referral link
export function generateReferralLink(code: string): string {
  return `${window.location.origin}/join?ref=${code}`
}

// Validate referral code format
export function isValidReferralCode(code: string): boolean {
  const pattern = /^AGR-[A-Z0-9]{4}-[A-Z0-9]{4}$/
  return pattern.test(code)
}

// Calculate estimated earnings for pharmacy referrals
export function calculateEstimatedEarnings(
  dailyOrderValue: number,
  marginPercentage: number,
  daysRemaining: number
): number {
  const dailyMargin = (dailyOrderValue * marginPercentage) / 100
  const bonusMargin = dailyMargin * 0.03 // 3% extra margin
  return bonusMargin * daysRemaining
}












