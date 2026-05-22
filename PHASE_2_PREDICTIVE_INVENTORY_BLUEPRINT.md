# PHASE 2 — PREDICTIVE INVENTORY ENGINE (P1)
## Strictly Simulation-Only, Read-Only, No Live Writes!

---

## 🚨 SAFETY RULES FIRST
1. ✅ NO live inventory writes
2. ✅ NO auto-reorder execution
3. ✅ All outputs advisory only
4. ✅ All decisions must be auditable
5. ✅ No black-box logic
6. ✅ Every recommendation includes reason codes
7. ✅ All simulation decisions logged

---

## 1. CANONICAL SCORING FORMULAS

### A. Demand Velocity
```
demand_velocity_7d = total_units_sold_last_7_days / 7
demand_velocity_30d = total_units_sold_last_30_days / 30
demand_trend = (demand_velocity_7d - demand_velocity_30d) / demand_velocity_30d
```

### B. FEFO Pressure Score
```
days_to_expiry = expiry_date - current_date
fefo_pressure_score = 100 - (days_to_expiry / 90) * 100
(0-100, higher = more urgent)
```

### C. Reorder Prediction
```
reorder_point = (demand_velocity_30d * lead_time_days) + safety_stock
reorder_recommended = current_stock <= reorder_point
reorder_quantity = (demand_velocity_30d * (lead_time_days + review_period_days)) + safety_stock - current_stock
```

### D. Expiry Risk Forecast
```
expiry_risk_score = MIN(100, (expiry_risk_30d_qty / total_stock_qty) * 100)
expiry_risk_30d_qty = qty expiring in next 30 days
```

### E. Distributor Stock Imbalance Score
```
imbalance_score = (MAX(distributor_stock) - MIN(distributor_stock)) / AVG(distributor_stock)
(0-100, higher = more imbalanced)
```

---

## 2. DB SCHEMA ADDITIONS

### Table: `inventory_demand_forecasts`
```sql
id UUID PRIMARY KEY
product_id UUID NOT NULL REFERENCES products(id)
forecast_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
forecast_period_days INTEGER NOT NULL
demand_velocity_7d DECIMAL(10,2)
demand_velocity_30d DECIMAL(10,2)
demand_trend DECIMAL(5,2)
reorder_point INTEGER
reorder_recommended BOOLEAN
reorder_quantity INTEGER
fefo_pressure_score INTEGER
expiry_risk_score INTEGER
expiry_risk_30d_qty INTEGER
distributor_imbalance_score INTEGER
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Table: `inventory_simulation_decisions`
```sql
id UUID PRIMARY KEY
product_id UUID NOT NULL REFERENCES products(id)
decision_type TEXT NOT NULL CHECK (decision_type IN ('REORDER_RECOMMENDED', 'FEFO_ALERT', 'EXPIRY_ALERT', 'STOCK_IMBALANCE_ALERT'))
score INTEGER NOT NULL
reason_codes TEXT[] NOT NULL
recommendation TEXT
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 3. ROLLBACK PLAN
1. Drop tables: `inventory_demand_forecasts`, `inventory_simulation_decisions`
2. Remove utility layer: `src/lib/predictive-inventory/`
3. Remove API endpoints: `/api/predictive-inventory/*`

---

## 4. DRIFT/COMPARISON METRICS
- Forecast accuracy: `|actual_demand - predicted_demand| / actual_demand`
- FEFO alert accuracy: `number_of_correct_fefo_alerts / total_fefo_alerts`
- Reorder recommendation accuracy: `number_of_accepted_reorders / total_recommendations`
- Expiry risk prediction accuracy: `number_of_products_actually_expired / predicted_expiry_risk_products`
