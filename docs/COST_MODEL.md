# Cost Forecast Model

## Overview
The cost forecast system estimates and aggregates maintenance expenses for a vessel over periods (monthly/yearly), supporting budget planning and decision-making.

## Cost Components

### 1. Parts & Materials
- **Definition:** Replacement components, consumables, spare parts
- **Input:** Unit cost × Quantity
- **Example:** Oil filter $25 × 2 = $50

### 2. Labor
- **Definition:** Technician time (hours × hourly rate)
- **Input:** Estimated hours × Labor rate
- **Default Rates (by role):**
  - Crew: $25/hour
  - Chief Engineer: $50/hour
  - Officer: $75/hour (for overrides)
- **Override:** Per-vessel or per-task labor rates supported

### 3. Miscellaneous
- **Definition:** Tools, transportation, permits, disposal
- **Input:** Flat cost per task or item
- **Default:** 10% of parts + labor (optional)

## Calculation Formula

```
ItemCost = (Parts UnitCost × Qty) + (LaborHours × LaborRate) + Misc

TaskCost = Σ ItemCost for all items in template

AggregatedCost[period] = Σ TaskCost for all tasks completed in period
                        + Σ EstimatedCost for recurring tasks (expanded)
```

## Recurring Task Expansion

**Example:** Weekly engine check in June 2026

- Due dates: June 1, 8, 15, 22, 29 (5 occurrences)
- Task cost: $150 each
- **Monthly total:** 5 × $150 = **$750**

Expansion rules:
- **Daily:** count calendar days (or operational days, configurable)
- **Weekly:** count full weeks; partial weeks round down
- **Monthly:** count calendar months; handle multi-month forecasts

## Aggregation

For a given period (e.g., "2026-06"):

1. **Completed tasks:** Sum actual costs from log entries
2. **Scheduled tasks:** Expand recurring, sum estimated costs
3. **Open/In-Progress:** Include estimated costs (optional flag)
4. **Total = Parts + Labor + Misc**

## Top Cost Drivers

Ranked by total cost contribution:

```
Top 3 for June 2026:
1. Engine overhaul: $2,500 (40%)
2. Electrical system inspection: $1,200 (19%)
3. Hull cleaning: $800 (13%)
```

Selection criteria:
- Include completed + estimated for period
- Filter by system if needed
- Limit to top 5–10 for clarity

## Example Cost Forecast

**Vessel:** KRI Hang Tuah
**Period:** June 2026
**Mission Profile:** Patrol

| Task | Frequency | Qty | Unit Cost | Labor Hrs | Labor Rate | Total |
|------|-----------|-----|-----------|-----------|------------|-------|
| Daily Engine Check | Daily (30) | 1 | $10 | 1 | $50 | $1,800 |
| Weekly Electrical | Weekly (4) | 1 | $50 | 2 | $50 | $600 |
| Monthly Overhaul | Monthly (1) | 1 | $500 | 8 | $50 | $900 |
| Parts & Repairs | As-needed | - | - | - | - | $500 |

**Total for June:** $3,800

**Breakdown:**
- Parts: $1,910 (50%)
- Labor: $1,890 (50%)
- Misc: $0 (0%)

## Forecasting for Budget

**Annual Estimate (12 × monthly):** $45,600

**Confidence:** Based on:
- Historical actuals ✓
- Recurring schedules ✓
- Spare parts availability ? (flag if parts delayed)
- Labor rate stability ? (subject to contracts)

## Export Formats

**CSV:**
```
Date,System,Task,Estimated,Actual,Status
2026-06-01,Engine,Daily Check,$150,$155,Done
2026-06-08,Electrical,Weekly Inspection,$300,$310,Done
```

**PDF Summary:**
- Header: Vessel, period, mission profile
- Tables: cost breakdown, top drivers
- Chart: monthly trend, category breakdown
- Signature line for approval

## Implementation Notes

- **Caching:** Aggregate costs cached; refreshed when new log entries sync
- **Sensitivity:** Flag cost forecasts if:
  - Spare parts lead time exceeds mission duration
  - Labor rate variance > 10%
  - Recurring tasks miss scheduled dates
- **Audit Trail:** All cost entries include user, timestamp, and justification
- **Rounding:** Round to nearest cent; aggregate at period level
