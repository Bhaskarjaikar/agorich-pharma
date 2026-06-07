import crypto from 'crypto';

export function validateWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const payloadBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (payloadBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(payloadBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function generateRazorpaySignature(
  orderId: string,
  paymentId: string,
  keySecret: string
): string {
  const payload = `${orderId}|${paymentId}`;
  return crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');
}

export function validatePaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const expectedSignature = generateRazorpaySignature(orderId, paymentId, keySecret);

  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}