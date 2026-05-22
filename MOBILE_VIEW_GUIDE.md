# 📱 Mobile View Check Karne Ka Guide

## Quick Method (Chrome/Edge):

### Step 1: Page Open Karo
```
http://localhost:3001/retailer/invoices
```

### Step 2: DevTools Kholo
**Option A:** Keyboard se:
- Press `F12` 
- Ya `Ctrl + Shift + I`

**Option B:** Mouse se:
- Page par **Right-click** karo
- **"Inspect"** click karo

### Step 3: Mobile View Enable Karo
**Option A:** Keyboard shortcut:
- Press `Ctrl + Shift + M` (Windows)
- Ya `Cmd + Shift + M` (Mac)

**Option B:** Icon click karo:
- DevTools ke top bar mein left side par **mobile icon** dikhega
- Usko click karo (toggle device toolbar)

### Step 4: Device Select Karo
- Top bar mein device dropdown dikhega
- Dropdown click karo
- Select karo: **iPhone 12 Pro** ya **Samsung Galaxy S21**
- Ya custom width set karo: **375px** (iPhone SE)

### Step 5: Test Karo
- Page refresh karo (`F5`)
- Scroll karo upar neeche
- Check karo:
  ✅ Buttons properly align ho rahe hain
  ✅ Text readable hai
  ✅ No horizontal scrolling
  ✅ Cards stack properly

## Agar DevTools Open Nahi Ho Raha:

1. **Browser restart karo**
2. **Another browser try karo:**
   - Chrome
   - Edge
   - Firefox
   
3. **Manual check:**
   - Browser window ko narrow karo (width kam karo)
   - Dekho layout kaise change ho raha hai

## Actual Phone Par Test:

### Step 1: IP Address Check Karo
Terminal mein:
```bash
ipconfig
```
Look for: **IPv4 Address** (e.g., 192.168.1.100)

### Step 2: Phone aur Computer Same WiFi Par Hon
- Dono same network par hon chahiye

### Step 3: Phone Browser Mein Open Karo
```
http://[YOUR_IP]:3001/retailer/invoices
```
Example: `http://192.168.1.100:3001/retailer/invoices`

### Step 4: Agar Access Nahi Mil Raha
- Firewall check karo
- Ya `npm run dev -- --hostname 0.0.0.0` use karo

## Troubleshooting:

❌ **DevTools nahi khul raha?**
→ Try `Ctrl + Shift + J` (Console directly)

❌ **Mobile icon nahi dikh raha?**
→ DevTools ke **3 dots menu** (⋮) mein **"Toggle device toolbar"** option

❌ **Page load nahi ho raha?**
→ Check karo server chal raha hai:
```bash
npm run dev
```

❌ **Port 3001 blocked?**
→ Try different port:
```bash
PORT=3002 npm run dev
```



















