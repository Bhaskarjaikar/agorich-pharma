# 🚀 Server Manually Start Karne Ka Guide

## Problem
Automated server start nahi ho raha. Manually try karo.

---

## ✅ Solution - Step by Step

### Step 1: CMD/PowerShell Open Karo (NEW WINDOW)

```
Windows Key + R
Type: cmd
Press Enter
```

### Step 2: Project Directory Mein Jao

```bash
cd C:\Users\The Jaikar\agorich-pharma
```

### Step 3: Server Start Karo (3 Options - Koi Bhi Ek Try Karo)

#### Option A: Simple Next Dev (RECOMMENDED)
```bash
npx next dev
```

#### Option B: Without Turbopack
```bash
npx next@15.5.4 dev
```

#### Option C: With Port Specified
```bash
npx next dev -p 3000
```

### Step 4: Success Message Dekho

Agar successful ho gaya toh yeh dikhega:
```
✓ Starting...
✓ Ready in 2.5s
- Local:        http://localhost:3000
- Network:      http://192.168.31.112:3000
```

---

## 📱 Mobile Testing - Jab Server Start Ho Jaye

### URLs Mobile Par Open Karo:

**Main Test Page (Create Invoice):**
```
http://192.168.31.112:3000/retailer/create-invoice
```

**Invoices List:**
```
http://192.168.31.112:3000/retailer/invoices
```

**Login (agar logged out ho):**
```
http://192.168.31.112:3000/login
```

---

## 🧪 Mobile Testing Steps

1. **Phone par Chrome browser kholo**
2. **URL type karo (ya WhatsApp se copy karke paste karo)**
3. **Login karo agar required ho**
4. **Create Invoice page par:**
   - Products add karo (2-3 items)
   - Neeche scroll karo
   - **Purple "Pay ₹X with UPI" button dikhega**
   - Button tap karo
5. **UPI apps list aayegi:**
   - Google Pay
   - PhonePe
   - Paytm
   - Koi bhi select karo
6. **UPI app mein:**
   - Amount pre-filled hoga
   - Invoice number note mein hoga
   - Payment complete karo (ya cancel)
7. **Browser wapas aao:**
   - "✓ Payment Done" button tap karo
   - Success message dikhega! ✅

---

## 🔧 Agar Abhi Bhi Problem Aaye

### Problem 1: "EADDRINUSE: Port 3000 already in use"

**Fix:**
```bash
# Check karo kaun use kar raha hai
netstat -ano | findstr :3000

# Process kill karo (PID number lagao)
taskkill /F /PID <PID_NUMBER>
```

### Problem 2: "Module not found"

**Fix:**
```bash
# Node modules reinstall karo
npm install
```

### Problem 3: "Permission denied"

**Fix:**
```bash
# Admin mode mein CMD kholo
# Windows Key + X → "Windows Terminal (Admin)"
```

### Problem 4: Mobile se "Can't reach this page"

**Fix:**
1. **Same WiFi check:** Phone aur PC dono same WiFi par?
2. **Firewall disable:** Windows Firewall temporarily off karo
3. **IP confirm:** CMD mein `ipconfig` run karke IP confirm karo
4. **Alternative IP try karo:** `http://172.19.48.1:3000`

---

## ✅ Quick Checklist

Server Start Hone Ke Baad:

- [ ] CMD mein "Ready" message dikhai diya?
- [ ] `http://localhost:3000` PC browser mein open ho raha?
- [ ] Network URL dikhai de raha: `http://192.168.31.112:3000`?
- [ ] Mobile aur PC same WiFi par hain?
- [ ] Mobile se page load ho raha hai?

Agar sab YES hai toh **READY TO TEST!** 🚀

---

## 📞 Next Steps

Jab server successfully start ho jaye:

1. **PC browser mein test:** `http://localhost:3000/retailer/create-invoice`
2. **Mobile browser mein test:** `http://192.168.31.112:3000/retailer/create-invoice`
3. **UPI button tap karke test karo**
4. **Feedback do ki kya hua!**

---

## 💡 Pro Tips

1. **CMD window ko minimise mat karo** - server running rehna chahiye
2. **"Ctrl + C" press karke server stop kar sakte ho**
3. **Changes karne ke baad page refresh karo (F5)**
4. **Mobile par Chrome use karo** (best UPI deep-link support)
5. **First time pe actual payment mat karo** - cancel kar do test ke liye

---

## 🎯 Expected Result

**Desktop Preview:**
- Left: Product catalog
- Right: Live invoice preview
- Bottom right: Purple gradient "Pay with UPI" button

**Mobile Preview:**
- Top: Product search
- Middle: Selected items
- Bottom: Invoice preview + UPI button

**UPI Flow:**
- Tap button → UPI apps list → Select app → Pre-filled payment → Complete/Cancel → Return to browser → Tap "Payment Done" → Success! ✅

---

**Ab manually try karo aur batao kya ho raha hai!** 📱💜


