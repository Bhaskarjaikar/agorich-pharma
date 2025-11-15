# UPI Payment - Quick Setup Guide

## 🚀 Setup in 3 Easy Steps

### Step 1: Add Environment Variables

Create or edit `.env.local` file in your project root and add:

```env
# UPI Payment Configuration
NEXT_PUBLIC_UPI_ID=your-upi-id@paytm
NEXT_PUBLIC_UPI_RECIPIENT_NAME=Your Business Name
```

**Examples of UPI IDs:**
- `yourbusiness@paytm`
- `yourname@ybl` (Google Pay)
- `yourname@oksbi` (SBI)
- `yourname@axl` (Axis Bank)

### Step 2: Restart Server

```bash
npm run dev
```

### Step 3: Test on Mobile

1. Open your app on mobile browser
2. Go to Invoices page
3. Click "Record Payment" on any DELIVERED invoice
4. You'll see the new "Pay with UPI" button! 🎉

---

## ✅ Quick Test Checklist

- [ ] Added UPI credentials to `.env.local`
- [ ] Restarted development server
- [ ] Opened on mobile device
- [ ] UPI app installed (Google Pay/PhonePe/Paytm)
- [ ] Tested payment flow
- [ ] Invoice marked as PAID

---

## 📱 How It Looks

### Before (Old Way)
```
Record Payment → Fill form manually → Submit
```

### After (UPI Way)
```
Record Payment → Tap "Pay with UPI" → 
Confirm in Google Pay → Tap "Payment Done" → Done! ✅
```

---

## 🎯 Key Features

✅ No QR code needed
✅ Works on single phone
✅ Payment details pre-filled
✅ Takes < 30 seconds
✅ Manual entry still available as fallback

---

## 📞 Need Help?

Check `UPI_PAYMENT_GUIDE.md` for:
- Detailed documentation
- Troubleshooting guide
- Code architecture
- API integration details
- Security considerations

---

**That's it! You're ready to accept UPI payments! 🎊**



