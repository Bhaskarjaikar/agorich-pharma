# PIOS Intelligence Layer - Phase 1 Implementation

## Overview

Successfully extended Agorich Pharma from a basic ERP to a **Closed-Loop Pharma Intelligence Operating System** with Intelligence Layers, while preserving existing working modules (Invoicing, GST, Razorpay).

## What's Been Built

### 1. Database Migration (`intelligence_phase1_migration.sql`)

**New Tables:**
- `analytics_snapshots` - Daily demand, inventory, sales snapshots with depletion rate calculations
- `stockout_risk_alerts` - Stockout risk tracking with nearest hub suggestions
- `credit_score_history` - Credit score change audit trail
- `manufacturing_recommendations` - Manufacturing batch recommendations
- `seasonal_spike_alerts` - Seasonal demand spike detection

**New Columns Added to Existing Tables:**
- `profiles.credit_score` - Default 750
- `profiles.credit_score_updated_at`
- `profiles.credit_limit` - Default ₹100,000

**New PostgreSQL Functions:**
- `calculate_depletion_rate(p_product_id, p_retailer_id, p_days)` - Calculates average daily depletion

---

### 2. Intelligence API Endpoints

All endpoints created in `src/app/api/intelligence/`:

#### A. `/api/intelligence/analytics-snapshots`
- **GET** - Retrieve analytics snapshots with filters (date range, product, retailer, territory)
- **POST** - Generate daily analytics snapshots with depletion rate calculations

**Depletion Rate Calculation:**
- Depletion Rate = Total Units Ordered in Period / Number of Days
- 7-day and 30-day moving averages
- Updates automatically on every retailer order

#### B. `/api/intelligence/stockout-risk`
- **GET** - Retrieve open stockout risk alerts
- **POST** - Run stockout risk detection

**Smart Fulfillment Features:**
- Checks distributor stock levels
- Calculates days-to-stockout based on depletion rate
- Auto-finds nearest available distributor hub with stock
- Generates stock transfer suggestions
- Alerts categorized by severity: LOW → MEDIUM → HIGH → CRITICAL

#### C. `/api/intelligence/credit-score`
- **GET** - Retrieve credit scores and history
- **POST** - Run credit score checks and adjustments

**Financial Intelligence Features:**
- Calculates % of balance in "Red Zone" (over 90 days past due)
- If ≥40% in Red Zone → automatically lowers credit score
- Reduces credit limit by 30%
- Creates audit trail in `credit_score_history`
- Alerts Admin to stop further supply

#### D. `/api/intelligence/manufacturing-recommendation`
- **GET** - Retrieve manufacturing recommendations
- **POST** - Generate and save manufacturing recommendations

**Manufacturing Intelligence Logic:**
```
IF Total_Stock < (Total_Demand × Safety_Multiplier)
  → Generate Manufacturing Recommendation
```
- Safety multiplier configurable (default: 1.5)
- Priority scoring: LOW → MEDIUM → HIGH → CRITICAL
- Recommendations include: territory, demand, stock, suggested production quantity

#### E. `/api/intelligence/seasonal-spikes`
- **GET** - Retrieve active seasonal spike alerts
- **POST** - Detect seasonal demand spikes

**Seasonal Spike Detection:**
- Monitors North Bihar districts (Sitamarhi, Madhubani, Darbhanga, Muzaffarpur, etc.)
- Compares current week demand vs 4-week baseline
- If spike ≥20% → generates alert
- Includes recommended actions

#### F. `/api/intelligence/admin-dashboard`
- **GET** - Complete Admin Command Center data

**Admin Command Center Features:**
- **Live Heatmap** - Demand intensity by North Bihar district
- **Seasonal Spike Alerts** - Real-time spike notifications
- **Stockout Risk Alerts** - Priority-ordered risk list
- **Manufacturing Recommendations** - Production suggestions
- **Credit Score Changes** - Recent credit score drops
- **Key Intelligence Metrics** - Summary dashboard

---

## Setup Instructions

### Step 1: Run Database Migration
Execute the migration script in your Supabase SQL Editor:
```sql
-- Run intelligence_phase1_migration.sql
```

### Step 2: Verify Tables
After migration, you should see these new tables:
- analytics_snapshots
- stockout_risk_alerts
- credit_score_history
- manufacturing_recommendations
- seasonal_spike_alerts

### Step 3: Test the Endpoints

#### Generate Initial Analytics Snapshots:
```bash
POST /api/intelligence/analytics-snapshots
{
  "generateForDate": "2026-05-12",
  "snapshotTypes": ["COMBINED"]
}
```

#### Check Stockout Risks:
```bash
POST /api/intelligence/stockout-risk
```

#### Check Credit Scores:
```bash
POST /api/intelligence/credit-score
{
  "checkAll": true
}
```

#### Generate Manufacturing Recommendations:
```bash
POST /api/intelligence/manufacturing-recommendation
{
  "territory": "North Bihar",
  "days": 30,
  "safetyMultiplier": 1.5
}
```

#### Detect Seasonal Spikes:
```bash
POST /api/intelligence/seasonal-spikes
{
  "checkNorthBihar": true
}
```

#### Get Admin Command Center:
```bash
GET /api/intelligence/admin-dashboard
```

---

## Architecture Overview

### Data Flow
```
Retailer Places Order
    ↓
Analytics Snapshot Created (with Depletion Rate)
    ↓
Stockout Risk Check Triggered
    ↓
If Low Stock → Find Nearest Hub + Flag Admin
    ↓
Credit Score Monitored (if Red Zone ≥40% → Lower Score)
    ↓
Manufacturing Recommendations Generated Daily
    ↓
Admin Sees Live Heatmap + Alerts in Command Center
```

### Key Intelligence Loops

1. **Demand → Depletion Rate Loop**: Every order updates depletion rate
2. **Inventory → Stockout Risk Loop**: Daily stock checks with nearest hub routing
3. **Payments → Credit Score Loop**: Aging tracker feeds into credit scoring
4. **Demand + Inventory → Manufacturing Loop**: Daily recommendation generation

---

## Files Created/Modified

### New Files:
- `intelligence_phase1_migration.sql` - Complete database migration
- `src/app/api/intelligence/manufacturing-recommendation/route.ts`
- `src/app/api/intelligence/analytics-snapshots/route.ts`
- `src/app/api/intelligence/stockout-risk/route.ts`
- `src/app/api/intelligence/credit-score/route.ts`
- `src/app/api/intelligence/seasonal-spikes/route.ts`
- `src/app/api/intelligence/admin-dashboard/route.ts`
- `INTELLIGENCE_LAYER_README.md` - This file

### Existing Modules Preserved:
- ✅ Invoicing System
- ✅ GST Calculation
- ✅ Razorpay Integration
- ✅ Order Management
- ✅ Inventory Management
- ✅ User/Profile Management

---

## Next Steps (Phase 2 Intelligence)

- ML-based demand forecasting (Prophet/ARIMA)
- Predictive stockout prevention
- Automated territory optimization
- AI-powered substitute product recommendations
- Real-time WebSocket alerts

---

## Support

For questions about the Intelligence Layer implementation, refer to:
1. This README
2. Individual API route files
3. Database migration script
