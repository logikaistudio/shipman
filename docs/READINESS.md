# Readiness Scoring Model

## Overview
The readiness score (0–100) represents how prepared a vessel is for its assigned mission, considering system status, criticality levels, and resource availability.

## Formula

```
Base Score = Σ (SystemScore[i] × Weight[i]) for all systems

where:
  SystemScore[i] = (CompletedItems[i] / TotalItems[i]) × 100

Adjustments:
  - Each critical open item: -15 points
  - Each high-priority open item: -5 points
  - Below 0 → clamp to 0
  - Above 100 → clamp to 100

Final Score = Clamp(Base Score + Adjustments, 0, 100)
```

## System Weights (by Mission Profile)

### Patrol (default)
- Engine: 40%
- Electrical: 30%
- Interior: 15%
- Exterior: 15%

### Combat
- Engine: 35%
- Electrical: 35%
- Interior: 15%
- Exterior: 15%

### Escort
- Engine: 40%
- Electrical: 25%
- Interior: 20%
- Exterior: 15%

### Transit
- Engine: 45%
- Electrical: 25%
- Interior: 15%
- Exterior: 15%

## Readiness States

| Score Range | Status | Recommendation |
|-------------|--------|-----------------|
| 90–100 | **Ready** | Approved for mission |
| 80–89 | **Conditional** | Approve with caveats; monitor critical items |
| 60–79 | **Caution** | Complete maintenance before mission |
| 0–59 | **Not Ready** | Major work required; do not deploy |

## Critical Blockers
A vessel is **NOT READY** for any mission if:
1. Any **Critical** checklist item is open
2. Score < 80% AND any **High** priority item is open
3. Key spare parts are not available (lead time > mission duration)

## Example Calculation

**Scenario:** Patrol mission for KRI Hang Tuah

| System | Completed | Total | Score | Weight | Contribution |
|--------|-----------|-------|-------|--------|--------------|
| Engine | 18 | 20 | 90% | 40% | 36.0 |
| Electrical | 15 | 16 | 94% | 30% | 28.2 |
| Interior | 10 | 10 | 100% | 15% | 15.0 |
| Exterior | 8 | 10 | 80% | 15% | 12.0 |

**Base Score:** 36.0 + 28.2 + 15.0 + 12.0 = **91.2%**

**Open Items:** 2 Medium-priority items (no penalty)

**Final Score:** **91** → **READY ✓**

## Implementation Notes

- Readiness is recalculated automatically when:
  - A checklist item is completed
  - A task status changes
  - A spare part is marked unavailable
- Scores are cached and updated every 5 minutes for performance
- Historic scores are logged for audit trails
- Readiness declarations (by Officer) are immutable audit records
