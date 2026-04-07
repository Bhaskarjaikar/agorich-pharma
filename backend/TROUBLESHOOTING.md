# 🔧 MedusaJS Backend Troubleshooting

## Problem: Port 7001 Can't Be Reached

Backend server start nahi ho raha hai. Follow these steps:

---

## ✅ Step 1: Manual Start (Errors Dikhenge)

### PowerShell/CMD Open Karo:
```powershell
cd "C:\Users\The Jaikar\agorich-pharma\backend"
npm run dev
```

**Expected Output (Success):**
```
✓ Medusa server is running
✓ Admin panel building...
✓ Ready at http://localhost:9000
✓ Admin at http://localhost:7001
```

**Agar Error Aaye:**
- Error message ko **full screen shot** lo
- Ya **error text** copy kar ke share karo

---

## ✅ Step 2: Common Issues & Fixes

### Issue 1: "Cannot connect to Redis"
**Fix:** Redis nahi chahiye. Ye error ignore karo ya Redis URL remove karo from `.env`

### Issue 2: "Database connection failed"
**Fix:** Check `.env` file:
```
DB_USERNAME=postgres
DB_PASSWORD="your_password"  (quotes me rakho)
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=medusa_agorich
```

### Issue 3: "Port 9000/7001 already in use"
**Fix:**
```powershell
# Port check karo
netstat -ano | findstr ":9000"
netstat -ano | findstr ":7001"

# Agar koi process hai, uska PID note karo aur kill karo
taskkill /F /PID <PID_NUMBER>
```

### Issue 4: "Module not found"
**Fix:**
```powershell
cd "C:\Users\The Jaikar\agorich-pharma\backend"
npm install
```

---

## ✅ Step 3: Quick Test Script

Run this to check everything:
```powershell
cd "C:\Users\The Jaikar\agorich-pharma\backend"
node check-backend.js
```

**Expected Output:**
```
✅ medusa-config.js loaded successfully
✅ Database connection successful
```

---

## ✅ Step 4: Start Backend (After Fixes)

### Option A: Batch File
```powershell
cd "C:\Users\The Jaikar\agorich-pharma\backend"
.\START_BACKEND.bat
```

### Option B: Direct Command
```powershell
cd "C:\Users\The Jaikar\agorich-pharma\backend"
npm run dev
```

---

## ✅ Step 5: Verify It's Running

### Check Ports:
```powershell
netstat -ano | findstr ":9000"
netstat -ano | findstr ":7001"
```

**Expected:** Should show `LISTENING`

### Test Endpoints:
1. Open: http://localhost:9000/health
   - Should show: `{"message":"medusa is healthy"}`
   
2. Open: http://localhost:7001
   - Should show: MedusaJS Admin login page

---

## 🎯 Admin User Credentials

- **Email:** `admin@agorich.com`
- **Password:** `admin123`

---

## 📝 Next Steps

1. Backend successfully start hone ke baad
2. http://localhost:7001 open karo
3. Login karo with credentials above
4. Admin panel use karo!

---

## 🆘 Still Having Issues?

**Error message** ya **screenshot** share karo, main fix kar dunga!
















