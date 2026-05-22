# PHASE 2 — DISTRIBUTOR PERFORMANCE SCORING (P2)
## Strictly Simulation-Only, Read-Only, No Live Writes!

---

## 🚨 SAFETY RULES FIRST
1. ✅ NO live distributor ranking changes
2. ✅ NO auto-routing changes based on performance
3. ✅ All outputs advisory only
4. ✅ All decisions must be auditable
5. ✅ No black-box logic
6. ✅ Every recommendation includes reason codes
7. ✅ All simulation decisions logged

---

## 1. CANONICAL SCORING FORMULAS

### A. Fulfillment Latency Score
```
average_fulfillment_latency_hours = average_time_from_order_to_dispatch_last_30_days
fulfillment_latency_score = 100 - (average_fulfillment_latency_hours / 48) * 100
(0-100, higher = better)
```

### B. Stock Reliability Score
```
stock_available_rate = (number_of_orders_stock_available / total_orders) * 100
stock_reliability_score = stock_available_rate
(0-100, higher = better)
```

### C. Rejection Rate Score
```
rejection_rate = (number_of_rejected_orders / total_orders) * 100
rejection_rate_score = 100 - rejection_rate
(0-100, higher = better)
```

### D. Delivery SLA Score
```
on_time_delivery_rate = (number_of_on_time_deliveries / total_deliveries) * 100
delivery_sla_score = on_time_delivery_rate
(0-100, higher = better)
```

### E. Margin Efficiency Score
```
actual_margin = average_margin_per_order_last_30_days
target_margin = 15 -- example target
margin_efficiency_score = (actual_margin / target_margin) * 100
(0-100, higher = better)
```

### F. Overall Distributor Performance Score
```
overall_performance_score = 
  (fulfillment_latency_score * 0.25) +
  (stock_reliability_score * 0.25) +
  (rejection_rate_score * 0.2) +
  (delivery_sla_score * 0.2) +
  (margin_efficiency_score * 0.1)
(0-100, higher = better)
```

---

## 2. DB SCHEMA ADDITIONS

### Table: `distributor_performance_scores`
```sql
id UUID PRIMARY KEY
distributor_id UUID NOT NULL REFERENCES profiles(id)
score_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
fulfillment_latency_score INTEGER
stock_reliability_score INTEGER
rejection_rate_score INTEGER
delivery_sla_score INTEGER
margin_efficiency_score INTEGER
overall_performance_score INTEGER
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Table: `distributor_performance_simulation_decisions`
```sql
id UUID PRIMARY KEY
distributor_id UUID NOT NULL REFERENCES profiles(id)
decision_type TEXT NOT NULL CHECK (decision_type IN ('PERFORMANCE_ALERT', 'RANKING_RECOMMENDATION', 'INCENTIVE_RECOMMENDATION', 'IMPROVEMENT_RECOMMENDATION'))
score INTEGER NOT NULL
reason_codes TEXT[] NOT NULL
recommendation TEXT
metadata JSONB
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

---

## 3. ROLLBACK PLAN
1. Drop tables: `distributor_performance_scores`, `distributor_performance_simulation_decisions`
2. Remove utility layer: `src/lib/distributor-performance/`
3. Remove API endpoints: `/api/distributor-performance/*`

---

## 4. DRIFT/COMPARISON METRICS
- Performance score accuracy: `|actual_performance - predicted_performance| / actual_performance`
- Ranking consistency: `number_of_times_ranking_matches_human / total_rankings`
- Alert accuracy: `number_of_correct_performance_alerts / total_alerts`
