export type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED';
export type PODStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

export interface DeliveryOTP {
  orderId: string;
  otpHash: string;
  generatedAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  status: PODStatus;
}

export interface ProofOfDelivery {
  id: string;
  orderId: string;
  recipientName: string;
  recipientPhone?: string;
  otpVerified: boolean;
  signatureUrl?: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  deliveredAt?: Date;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  notes?: string;
}

export interface DeliveryAssignment {
  orderId: string;
  distributorId: string;
  deliveryPartner?: 'SELF' | 'DELHIVERY' | 'SHIPROCKET' | 'OTHER';
  estimatedDeliveryDate?: Date;
  assignedAt: Date;
}

export interface DeliveryUpdate {
  orderId: string;
  status: DeliveryStatus;
  location?: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  notes?: string;
}

export function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < 4; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
}

export function hashOTP(otp: string, salt?: string): string {
  const crypto = require('crypto');
  const key = salt || process.env.OTP_SECRET || 'agorich-default-secret';
  return crypto.createHmac('sha256', key).update(otp).digest('hex');
}

export function verifyOTPHash(plainOTP: string, hashedOTP: string, salt?: string): boolean {
  const hash = hashOTP(plainOTP, salt);
  return hash === hashedOTP;
}

export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

export function shouldResendOTP(lastAttempt: Date | null, attempts: number, maxAttempts: number): boolean {
  if (attempts >= maxAttempts) return false;
  if (!lastAttempt) return true;

  const now = new Date();
  const cooldown = new Date(lastAttempt.getTime() + 30 * 1000);
  return now >= cooldown;
}
