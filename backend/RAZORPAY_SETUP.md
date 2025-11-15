# Razorpay Integration for MedusaJS

## Overview

MedusaJS backend is now configured with Razorpay payment provider. This allows you to accept payments through Razorpay's payment gateway with automatic order creation and status updates.

## Setup Instructions

### 1. Get Razorpay Credentials

1. Sign up at https://razorpay.com
2. Go to Dashboard → Settings → API Keys
3. Generate API Keys:
   - **Key ID** (starts with `rzp_test_` for test mode)
   - **Key Secret**

### 2. Configure Environment Variables

Update `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
RAZORPAY_ACCOUNT_ID=acc_xxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Restart MedusaJS Backend

```bash
cd backend
npm run dev
```

## How It Works

### Payment Flow

1. **Customer adds items to cart** in your Next.js app
2. **Cart is created in MedusaJS** via API
3. **Customer proceeds to checkout**
4. **Razorpay payment is initiated** using MedusaJS payment API
5. **Customer completes payment** in Razorpay interface
6. **Webhook notification** is sent to MedusaJS
7. **Order status is updated** automatically
8. **Order confirmation** is sent to customer

### Integration with Your App

The payment flow is already integrated into your Next.js API routes:

```typescript
// Create a cart
POST /api/medusa/cart

// Add items to cart
POST /api/medusa/cart/{cart_id}/items

// Complete cart (creates order with payment)
POST /api/medusa/cart/{cart_id}/complete
```

## Testing Payments

### Test Mode

Razorpay provides test cards for development:

**Test Card Numbers:**
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`

**Test Details:**
- CVV: Any 3 digits (e.g., 123)
- Expiry: Any future date
- Cardholder Name: Any name

### Test Flow

1. Login to your app
2. Create an invoice with products
3. Proceed to payment
4. Use test card details
5. Verify order creation in MedusaJS admin panel

## Webhook Configuration

### Set Up Webhook

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add new webhook:
   - **URL**: `https://your-medusa-backend.com/hooks/payment/razorpay_razorpay`
   - **Events**: Select all payment-related events
3. Copy the webhook secret and add to `.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxx
   ```

### Local Testing with ngrok

For local development, use ngrok to expose your backend:

```bash
ngrok http 9000
```

Then use the ngrok URL for webhook:
```
https://your-ngrok-url.ngrok.io/hooks/payment/razorpay_razorpay
```

## API Endpoints

### Payment Initiation

```bash
# Create payment session
POST /store/carts/{cart_id}/payment-sessions
Content-Type: application/json

{
  "provider_id": "razorpay"
}
```

### Payment Confirmation

```bash
# Complete cart after payment
POST /store/carts/{cart_id}/complete
Content-Type: application/json
```

## Order Status Flow

1. **Cart Created** → `pending`
2. **Payment Initiated** → `payment_authorized`
3. **Payment Successful** → `payment_captured`
4. **Order Complete** → `completed`

## Frontend Integration

Update your checkout page to use Razorpay:

```typescript
// Example: Create payment session
const initiatePayment = async (cartId: string) => {
  const response = await fetch(
    `/api/medusa/cart/${cartId}/payment-sessions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: 'razorpay' })
    }
  )
  return response.json()
}

// Complete payment
const completePayment = async (cartId: string) => {
  const response = await fetch(
    `/api/medusa/cart/${cartId}/complete`,
    {
      method: 'POST',
    }
  )
  return response.json()
}
```

## Error Handling

### Common Errors

**Invalid API Keys:**
```
Error: Authentication failed. Check your key_id and key_secret
```
Solution: Verify credentials in `.env`

**Webhook Signature Mismatch:**
```
Error: Invalid webhook signature
```
Solution: Ensure `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard

**Payment Failed:**
```
Error: Payment authorization failed
```
Solution: Check test card details or customer's actual card

## Production Checklist

Before going live with Razorpay:

- [ ] Switch from test keys to live keys
- [ ] Update webhook URL to production backend
- [ ] Enable required payment methods in Razorpay dashboard
- [ ] Configure currency (INR)
- [ ] Set up email notifications
- [ ] Test complete payment flow
- [ ] Enable 3D Secure authentication
- [ ] Configure automatic settlements

## Security Best Practices

1. **Never expose Key Secret** in frontend code
2. **Always verify webhook signatures** (handled by MedusaJS)
3. **Use HTTPS** in production
4. **Validate payment amounts** server-side
5. **Log all transactions** for audit trail

## Additional Features

### Refunds

MedusaJS supports automatic refunds through Razorpay:

```bash
POST /admin/orders/{order_id}/refund
Content-Type: application/json

{
  "amount": 10000,  # Amount in smallest currency unit (paise)
  "reason": "Customer requested",
  "note": "Refund for order #123"
}
```

### Subscriptions

For recurring payments, Razorpay subscriptions can be integrated:

1. Create subscription plans in Razorpay dashboard
2. Use subscription API endpoints
3. Handle webhook events for renewals

## Support

- **Razorpay Docs**: https://razorpay.com/docs
- **MedusaJS Payment Docs**: https://docs.medusajs.com/modules/carts-and-checkout/payment
- **Integration Issues**: Check MedusaJS Discord or GitHub

## Summary

✅ Razorpay payment provider configured
✅ Ready for test transactions
✅ Webhook support enabled
✅ Automatic order creation
✅ Production-ready architecture

Your app now has professional payment processing capabilities!
















