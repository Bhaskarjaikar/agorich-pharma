# 📋 Inventory Management CSV Format Guide (हिंदी में)

## ✅ **CSV Format:**

### **Required Columns (ज़रूरी):**
```
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
```

### **Example CSV:**
```csv
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
Paracetamol 500mg,100,50,30,10 tablets,BATCH001,2025-12,Cipla
Amoxicillin 250mg,50,120,72,10 capsules,BATCH002,2026-06,Sun Pharma
```

---

## 📅 **Expiry Date Format (समाप्ति तिथि का प्रारूप):**

CSV में expiry date इन formats में हो सकती है:

1. **YYYY-MM** (सबसे आसान)
   - Example: `2025-12` (December 2025)
   - Example: `2026-06` (June 2026)

2. **MM-YYYY**
   - Example: `12-2025` (December 2025)
   - Example: `06-2026` (June 2026)

3. **DD-MM-YYYY**
   - Example: `31-12-2025` (31 December 2025)
   - Example: `15-06-2026` (15 June 2026)

4. **YYYY-MM-DD**
   - Example: `2025-12-31` (31 December 2025)
   - Example: `2026-06-15` (15 June 2026)

**💡 सबसे आसान Format:** `2025-12` या `12-2025` (Month-Year)

---

## 💾 **Data Storage (डेटा कहाँ सेव होता है):**

### ✅ **Supabase Database में Save होता है!**

जब आप CSV import करते हैं:

1. ✅ CSV file parse होती है
2. ✅ Products `/api/products/import` API पर जाते हैं
3. ✅ **Supabase Database के `products` table में save होते हैं**
4. ✅ Permanent storage - page refresh के बाद भी data रहेगा
5. ✅ सभी users को दिखाई देगा (अगर permission है)

**❌ Local Storage में नहीं जाता!**

---

## 📝 **Complete CSV Format Details:**

### **Required Fields (ज़रूरी):**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `name` | Text | Product name (ज़रूरी) | `Paracetamol 500mg` |
| `stock` | Number | Stock quantity (ज़रूरी) | `100` |
| `mrp` | Number | Maximum Retail Price (ज़रूरी) | `50` |
| `agorich_price` | Number | Agorich selling price (ज़रूरी) | `30` |

### **Optional Fields (वैकल्पिक):**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `pack_size` | Text | Package size | `10 tablets` |
| `batch_number` | Text | Batch/Lot number | `BATCH001` |
| `expiry_date` | Date | Expiry date | `2025-12` |
| `mfg` | Text | Manufacturer name | `Cipla` |

---

## ✅ **Validation Rules:**

1. ✅ Product name खाली नहीं हो सकता
2. ✅ Stock 0 या positive होना चाहिए
3. ✅ MRP > 0 होना चाहिए
4. ✅ Agorich Price > 0 और MRP से कम होना चाहिए
5. ✅ Expiry date valid format में होनी चाहिए

---

## 📊 **Full Example CSV:**

```csv
name,stock,mrp,agorich_price,pack_size,batch_number,expiry_date,mfg
Paracetamol 500mg,100,50,30,10 tablets,BATCH001,2025-12,Cipla
Amoxicillin 250mg,50,120,72,10 capsules,BATCH002,2026-06,Sun Pharma
Cetirizine 10mg,200,25,15,10 tablets,BATCH003,2025-09,Dr Reddys
Omeprazole 20mg,75,80,48,10 capsules,BATCH004,2026-03,Lupin
Azithromycin 500mg,40,180,108,3 tablets,BATCH005,2025-11,Abbott
```

---

## 🎯 **Important Points:**

1. **✅ Data Supabase में Save होता है** - Permanent storage
2. **✅ Expiry Date:** `YYYY-MM`, `MM-YYYY`, `DD-MM-YYYY`, या `YYYY-MM-DD` format में
3. **✅ CSV को comma (`,`) से separate करें** - semicolon नहीं
4. **✅ पहली row headers होनी चाहिए**
5. **✅ Price में ₹ symbol नहीं डालें** - सिर्फ numbers

---

## 📍 **Sample File Location:**

Sample CSV file यहाँ है: `public/sample-inventory.csv`

आप इस file को download करके अपने data के साथ modify कर सकते हैं।

---

**✅ सभी imported products Supabase Database में permanently save होते हैं!**



