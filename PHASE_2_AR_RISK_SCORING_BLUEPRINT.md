# PHASE 2 — AR RISK SCORING ENGINE (P1)
## Strictly Simulation-Only, Read-Only, No Live Writes!

---

## 🚨 SAFETY RULES FIRST
1. ✅ NO live credit limit changes
2. ✅ NO auto-credit rejection execution
3. ✅ All outputs advisory only
4. ✅ All decisions must be auditable
5. ✅ No black-box logic
6. ✅ Every recommendation includes reason codes
7. ✅ All simulation decisions logged

---

## 1. CANONICAL SCORING FORMULAS

### A. Payment Behavior Score
```
on_time_payments = count_of_on_time_payments_last_90_days
late_payments = count_of_late_payments_last_90_days
total_payments = on_time_payments + late_payments
payment_behavior_score = (on_time_payments / total_payments) * 100
(0-100, higher = better)
```

### B. Overdue Trend Analysis
```
overdue_invoices_30d = count_of_invoices_overdue_30+_days
average_days_overdue = average_of_days_overdue_for_overdue_invoices
overdue_trend_score = 100 - (average_days_overdue / 30) * 100
(0-100, higher = better)
```

### C. Retailer Risk Classification
```
Low Risk: payment_behavior_score >= 80 AND overdue_trend_score >= 80
Medium Risk: 50 <= payment_behavior_score < 80 OR 50 <= overdue_trend_score < 80
High Risk: payment_behavior_score < 50 OR overdue_trend_score < 50
```

### D. Credit Exposure Calculation
```
credit_exposure = credit_utilized + pending_orders_amount
credit_exposure_ratio = credit_exposure / credit_limit
```

### E. Rolling DSO (Days Sales Outstanding)
```
rolling_dso_30d = (average_accounts_receivable_30d / total_sales_30d) * 30
rolling_dso_90d = (average_accounts_receivable_90d / total_sales_90d) * 90
```

### F. Overall AR Risk Score
```
overall_ar_risk_score = (payment_behavior_score * 0.5) + (overdue_trend_score * 0.5)
(0-100, higher = lower risk)
```

---

## 2. DB SCHEMA ADDITIONS

### Table: `ar_risk_scores`
```sql
id UUID PRIMARY KEY
retailer_id UUID NOT NULL REFERENCES profiles(id)
score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
payment_behavior_score INTEGER
overdue_trend_score INTEGER
overall_ar_risk_score INTEGER
risk_classification TEXT CHECK (risk_classification IN ('LOW', 'MEDIUM', 'HIGH'))
credit_exposure DECIMAL(12,2)
credit_exposure_ratio DECIMAL(5,2)
rolling_dso_30d DECIMAL(5,2)
rolling_dso_90d DECIMAL(5,2)
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Table: `ar_risk_simulation_decisions`
```sql
id UUID PRIMARY KEY
retailer_id UUID NOT NULL REFERENCES profiles(id)
decision_type TEXT NOT NULL CHECK (decision_type IN ('RISK_ALERT', 'CREDIT_LIMIT_RECOMMENDATION', 'COLLECTION_RECOMMENDATION'))
score INTEGER NOT NULL
reason_codes TEXT[] NOT NULL
recommendation TEXT
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 3. ROLLBACK PLAN
1. Drop tables: `ar_risk_scores`, `ar_risk_simulation_decisions`
2. Remove utility layer: `src/lib/ar-risk-scoring/`
3. Remove API endpoints: `/api/ar-risk-scoring/*`

---

## 4. DRIFT/COMPARISON METRICS
- Risk classification accuracy: `number_of_correct_risk_classifications / total_classifications`
- False positive rate: `number_of_false_high_risk_alerts / total_high_risk_alerts`
- False negative rate: `number_of_missed_high_risk_retailers / total_high_risk_retailers`
- DSO forecast accuracy: `|actual_dso - predicted_dso| / actual_dso`
