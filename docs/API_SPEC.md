# API Specification — Shipman O&M

Base URL: `/api/v1`
Auth: Bearer JWT (except `/auth` endpoints). Role-based access control (Admin, ChiefEngineer, Crew, Officer).

---

## Authentication

POST /auth/login
- Request: { "email":"...", "password":"..." }
- Response: { "token":"...", "user": { id, name, role } }

POST /auth/refresh
- Request: { "refreshToken":"..." }
- Response: { "token":"..." }

---

## Vessels

GET /vessels
- Query: ?q=&page=&limit=
- Response: list of vessels

POST /vessels
- Body: { name, imo, mmsi, metadata }
- Auth: Admin

GET /vessels/{vesselId}
- Response: vessel object

---

## Templates & Checklist

GET /templates
POST /templates
GET /templates/{id}
PUT /templates/{id}
- Template structure includes: id, title, system (engine/electrical/...), items: [{ id, label, inputType, threshold?, required, defaultCostItems?: [{ label, unitCost, defaultQty }], defaultLaborHours }]

---

## Tasks / ScheduledTask

POST /tasks
- Create task from template or manual
- Body sample:
  {
    "vesselId": "v1",
    "templateId": "t1",
    "dueDate": "2026-06-12T07:00:00Z",
    "recurrence": { "type":"weekly", "interval":1 },
    "assignedTo": "userId"
  }
- Response includes computed `estimatedCost` and `nextDue` when recurrence present

GET /tasks?vesselId=&status=&dueDate=
GET /tasks/{taskId}
PUT /tasks/{taskId} (update status, actualCost, attachments)

POST /tasks/{taskId}/complete
- Body: { responses: [ { itemId, value, notes } ], attachments: [...], actualCost?: { parts:[], labor: number }, location?: { lat, lng } }
- Behavior: marks done, stores LogEntry, updates aggregated costs

---

## Logs

GET /logs?vesselId=&from=&to=&system=
- Returns audit trail entries (LogEntry): id, taskId, templateId, userId, timestamp, responses[], attachments[], actualCost

---

## Costs

GET /vessels/{vesselId}/costs?period=YYYY-MM or period=YYYY
- Returns AggregatedCost: { vesselId, period, totalParts, totalLabor, totalMisc, grandTotal, breakdownBySystem }

GET /vessels/{vesselId}/costs/drivers?period=YYYY-MM
- Returns Top cost drivers (parts/components/tasks)

POST /costs/estimate (internal)
- Body: { templateId | taskDefinition, laborRateOverrides?, partCostOverrides? }
- Response: { perItem: [{ label, qty, unitCost, laborHours, itemTotal }], estimatedTotal }

POST /vessels/{vesselId}/costs/export?period=YYYY-MM
- Initiates CSV/PDF export; returns jobId or download URL

---

## Readiness

GET /vessels/{vesselId}/readiness
- Response: {
    vesselId,
    score: 0-100,
    perSystem: [ { system: "engine", score, criticalOpenItemsCount } ],
    criticalOpenItems: [ LogEntrySummary ],
    lastUpdated
  }

POST /vessels/{vesselId}/readiness/declare
- Body: { officerId, missionProfileId, notes }
- Auth: Officer/CO only
- Response: { declarationId, timestamp, scoreAtDeclaration }
- Creates immutable audit record with signature metadata

GET /mission-profiles
- Returns defined mission profiles and weightings

---

## Inventory & Parts

GET /vessels/{vesselId}/inventory
POST /vessels/{vesselId}/inventory
- Inventory item: { sku?, description, qtyOnHand, leadTimeDays, unitCost, currency }

POST /inventory/requisition
- Create requisition for parts; affects forecast and shows lead time impact

---

## Sync (Offline)

POST /sync/push
- Body: { clientId, events: [ { type: "logEntry", payload: {...} }, ... ] }
- Server validates, persists, returns mapping of temporary client IDs to server IDs and conflict results

GET /sync/pull?since=timestamp
- Returns changes since timestamp

---

## Exports & Reports

GET /reports/readiness-history?vesselId=&from=&to=
GET /reports/costs?vesselId=&period=

---

## Error handling
- Standard HTTP codes; error payload: { code, message, details? }

---

## Notes
- Currency: API assumes single currency per project; extend with conversion if needed.
- Security: all sensitive endpoints require TLS and role checks. Declaration endpoint requires officer role + 2FA when available.
- Recurring expansion rules: server expands recurrences into tasks for the forecast period when computing costs.

