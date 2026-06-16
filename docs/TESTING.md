# Testing & Data Guide

## 🎯 Cara Menggunakan Aplikasi Shipman

### 1. **Lihat Dashboard Readiness**
Klik tab **📊 Readiness** untuk melihat:
- **Skor Kesiapan Kapal** (0-100) berdasarkan mission profile
- **Per-system breakdown**: Engine, Electrical, Interior, Exterior
- **Mission profiles**: Patrol, Combat, Escort, Transit
- Sistem scoring berdasarkan persentase task yang completed

**Data saat ini (June 2026):**
- KRI Hang Tuah: Engine 90%, Electrical 100%, Interior 50%, Exterior 60%
- Estimated score (Patrol): ~75-80% (Conditional readiness)

---

### 2. **Lihat Cost Forecast**
Klik tab **💰 Costs** untuk melihat:
- **Total biaya perawatan per bulan**: Parts + Labor + Misc
- **Cost breakdown**: grafik bagian parts, labor, misc
- **Top 5 cost drivers**: task mana yang paling mahal
- **Export button**: ready untuk CSV export

**Data saat ini:**
- Bulan Juni 2026: ~$525 dalam log entries
- Top driver: Monthly Engine Overhaul ($400)
- Breakdown: Parts 48%, Labor 48%, Misc 4%

---

### 3. **Lihat Maintenance Tasks**
Klik tab **📋 Tasks** (default) untuk melihat:
- **All tasks (5 total)**:
  - 3 task **Open** (due today/overdue)
  - 2 task **Done** (selesai)
- **Filter tabs**: All / Open / Done
- **Overdue alert**: menunjukkan berapa banyak task yang sudah lewat deadline
- **Task detail**: klik task untuk membuka checklist form

**Data saat ini:**
- **Open:**
  - Daily Engine Temperature Check (due Jun 10 - TODAY)
  - Weekly Electrical System Inspection (due Jun 9 - OVERDUE 1 hari)
  - Hull Cleaning (due Jun 15)
  - Deck Maintenance (due Jun 8 - OVERDUE 2 hari)
- **Done:**
  - Monthly Engine Overhaul (completed Jun 5)
  - Weekly Electrical System Inspection (completed Jun 3)

---

### 4. **Isi Checklist (Submit Task)**
1. Klik tab **Tasks**
2. Filter ke **Open**
3. Klik task (misalnya "Daily Engine Temperature Check")
4. Isi form:
   - **Engine Temperature**: numeric 0-150°C (expected 70-90)
   - **Fuel Level**: numeric 0-100%
   - **Main Power Voltage**: numeric 0-500V (expected 440±10%)
   - **All systems operational**: checkbox
   - **Actual cost**: parts (USD) + labor (USD)
   - **Notes**: text area untuk catatan
   - **Attachments**: upload foto/file (optional)
5. Klik **Submit Checklist**
6. Jika online → langsung submit
7. Jika offline → auto-queue, klik "Sync Now" saat online

---

## 🔌 Testing via API (cURL atau Postman)

### Backend API: `http://localhost:5000`

#### 1. List All Vessels
```bash
curl http://localhost:5000/api/v1/vessels
```
**Response:**
```json
[
  {
    "id": "vessel-001",
    "name": "KRI Hang Tuah",
    "imo": "1234567",
    "mmsi": "5120140",
    "metadata": { "commissioned": 2015, "homeport": "Jakarta" }
  },
  {
    "id": "vessel-002",
    "name": "KRI Teluk Peleng",
    "imo": "1234568",
    "mmsi": "5120141",
    "metadata": { "commissioned": 2018, "homeport": "Surabaya" }
  }
]
```

#### 2. Get Readiness Score
```bash
curl "http://localhost:5000/api/v1/vessels/vessel-001/readiness?missionProfile=patrol"
```
**Response:**
```json
{
  "vesselId": "vessel-001",
  "missionProfile": "patrol",
  "score": 78,
  "perSystem": [
    { "system": "engine", "score": 90, "completedItems": 18, "totalItems": 20 },
    { "system": "electrical", "score": 100, "completedItems": 16, "totalItems": 16 },
    { "system": "interior", "score": 50, "completedItems": 5, "totalItems": 10 },
    { "system": "exterior", "score": 60, "completedItems": 6, "totalItems": 10 }
  ],
  "criticalOpenItems": [
    { "id": "task-002", "name": "Weekly Electrical System Inspection", "criticality": "high", "overdueBy": 1 }
  ],
  "isReadyForMission": false,
  "reason": "Score 78% is below 80% threshold"
}
```

#### 3. Get Cost Forecast
```bash
curl "http://localhost:5000/api/v1/vessels/vessel-001/costs?period=2026-06"
```
**Response:**
```json
{
  "vesselId": "vessel-001",
  "period": "2026-06",
  "totalCost": 525,
  "breakdown": {
    "parts": 250,
    "labor": 250,
    "misc": 25
  },
  "breakdown_pct": {
    "parts": 47.6,
    "labor": 47.6,
    "misc": 4.8
  },
  "itemCount": 3
}
```

#### 4. Get Top Cost Drivers
```bash
curl "http://localhost:5000/api/v1/vessels/vessel-001/costs/drivers?period=2026-06"
```
**Response:**
```json
[
  {
    "id": "task-003",
    "taskName": "Monthly Engine Overhaul",
    "totalCost": 400,
    "partsCount": 1,
    "laborCount": 1,
    "pct": 76.2
  },
  {
    "id": "task-001",
    "taskName": "Daily Engine Temperature Check",
    "totalCost": 75,
    "partsCount": 0,
    "laborCount": 1,
    "pct": 14.3
  }
]
```

#### 5. List Tasks
```bash
curl "http://localhost:5000/api/v1/tasks?vesselId=vessel-001&status=open"
```
**Response:**
```json
[
  {
    "id": "task-001",
    "vesselId": "vessel-001",
    "systemType": "engine",
    "name": "Daily Engine Temperature Check",
    "description": "Check engine temperature, oil pressure, coolant level",
    "dueDate": "2026-06-10T00:00:00.000Z",
    "recurrence": "daily",
    "status": "open"
  },
  {
    "id": "task-002",
    "vesselId": "vessel-001",
    "systemType": "electrical",
    "name": "Weekly Electrical System Inspection",
    "description": "Check main power voltage, distribution panel, circuit breakers",
    "dueDate": "2026-06-09T00:00:00.000Z",
    "recurrence": "weekly",
    "status": "open"
  }
]
```

#### 6. Create New Task
```bash
curl -X POST http://localhost:5000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "vesselId": "vessel-001",
    "systemType": "engine",
    "name": "Emergency Engine Inspection",
    "description": "Quick check for critical issues",
    "dueDate": "2026-06-11",
    "recurrence": "once"
  }'
```

#### 7. Complete Task (Submit Checklist)
```bash
curl -X POST http://localhost:5000/api/v1/tasks/task-001/complete \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [
      { "itemId": "temp", "value": 82 },
      { "itemId": "pressure", "value": 44 },
      { "itemId": "notes", "value": "All normal, no issues detected" }
    ],
    "attachments": [],
    "actualCost": {
      "parts": 50,
      "labor": 25,
      "misc": 0
    }
  }'
```
**Response:**
```json
{
  "id": "log-003",
  "taskId": "task-001",
  "userId": "user-001",
  "timestamp": "2026-06-10T12:30:45.123Z",
  "responses": [
    { "itemId": "temp", "value": 82 },
    { "itemId": "pressure", "value": 44 },
    { "itemId": "notes", "value": "All normal, no issues detected" }
  ],
  "actualCost": { "parts": 50, "labor": 25, "misc": 0 }
}
```

#### 8. Get Mission Profiles
```bash
curl http://localhost:5000/api/v1/mission-profiles
```
**Response:**
```json
[
  {
    "id": "patrol",
    "name": "Patrol",
    "systemWeights": {
      "engine": 0.40,
      "electrical": 0.30,
      "interior": 0.15,
      "exterior": 0.15
    },
    "criticalSystems": ["engine", "electrical"]
  },
  {
    "id": "combat",
    "name": "Combat",
    "systemWeights": {
      "engine": 0.35,
      "electrical": 0.35,
      "interior": 0.15,
      "exterior": 0.15
    },
    "criticalSystems": ["engine", "electrical"]
  },
  {
    "id": "escort",
    "name": "Escort",
    "systemWeights": {
      "engine": 0.40,
      "electrical": 0.25,
      "interior": 0.20,
      "exterior": 0.15
    },
    "criticalSystems": ["engine", "electrical"]
  },
  {
    "id": "transit",
    "name": "Transit",
    "systemWeights": {
      "engine": 0.45,
      "electrical": 0.25,
      "interior": 0.15,
      "exterior": 0.15
    },
    "criticalSystems": ["engine"]
  }
]
```

---

## 📱 Frontend Features Demo

### Offline-First Sync
1. **Open DevTools** (F12) → Network
2. Klik **Online/Offline** toggle (Chromium) atau check "Disable Network"
3. Submit checklist → browser akan show **sync banner** di atas
4. Pesan: `⚠️ 1 unsync'd change(s)` + "Sync Now" button
5. Aktifkan network → click "Sync Now" → data otomatis tersinkronisasi

### Mobile Responsiveness
1. Open DevTools → Device Toolbar (Ctrl+Shift+M)
2. Select "iPhone 12/13" atau "Pixel 6"
3. Verifikasi:
   - Single-column layout
   - Large tap targets (≥44px)
   - Readable font sizes
   - Sync banner visible

---

## 🧪 Test Scenarios

### Scenario 1: Complete Daily Checklist
1. Go to **Tasks** tab
2. Filter to **Open**
3. Klik "Daily Engine Temperature Check"
4. Isi form:
   - Engine Temp: 85°C (dalam normal range 70-90)
   - Fuel: 75%
   - Voltage: 440V (exact spec)
   - All systems: checked
   - Cost: parts $25, labor $50
5. Submit → verifikasi log entry dibuat + readiness score berubah

### Scenario 2: Check Readiness Change
1. Go to **Readiness** tab
2. Awal: score mungkin 78% (below ready threshold)
3. Complete 2-3 open tasks
4. Return to Readiness → verifikasi score naik
5. Try different mission profiles → weightings berubah

### Scenario 3: Offline Sync
1. Open DevTools → Disable Network
2. Submit checklist → should queue
3. Verifikasi banner shows "⚠️ 1 unsync'd"
4. Enable Network → click "Sync Now"
5. Verifikasi data di backend (curl logs)

---

## 📊 Current Test Data Summary

| Vessel | Tasks | Open | Done | Readiness (Patrol) | Status |
|--------|-------|------|------|---------------------|--------|
| KRI Hang Tuah (001) | 5 | 4 | 1 | ~78% | Conditional ⚠️ |
| KRI Teluk Peleng (002) | 1 | 1 | 0 | ~50% | Not Ready ❌ |

| Task | System | Due | Status | Overdue? |
|------|--------|-----|--------|----------|
| Daily Engine Check | Engine | Jun 10 | Open | No (today) |
| Weekly Electrical | Electrical | Jun 9 | Open | ✓ 1 day |
| Hull Cleaning | Interior | Jun 15 | Open | No |
| Deck Maintenance | Exterior | Jun 8 | Open | ✓ 2 days |
| Engine Overhaul | Engine | Jun 1 | Done | - |

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| White screen | Check browser console (F12) for errors; restart dev servers |
| Tasks not loading | Verify backend running on port 5000; check network tab |
| Readiness score doesn't change | Complete task → should auto-calculate; refresh page |
| Offline sync not working | Check localStorage (DevTools → Application); verify network toggle |
| Cost forecast showing 0 | Verify tasks have actualCost; check period query param format |

---

## 📚 Next Steps to Populate Data

### Option A: Use API (curl/Postman)
```bash
# Create new vessel
curl -X POST http://localhost:5000/api/v1/vessels \
  -H "Content-Type: application/json" \
  -d '{"name": "KRI Sumatran", "imo": "9876543", "mmsi": "5120142"}'

# Create new task
curl -X POST http://localhost:5000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "vesselId": "vessel-001",
    "systemType": "engine",
    "name": "Custom Task",
    "dueDate": "2026-06-15",
    "recurrence": "once"
  }'

# Complete task to generate cost + readiness data
curl -X POST http://localhost:5000/api/v1/tasks/{taskId}/complete \
  -H "Content-Type: application/json" \
  -d '{
    "responses": [],
    "actualCost": {"parts": 100, "labor": 75, "misc": 0}
  }'
```

### Option B: Edit Backend Code
Edit `/backend/src/index.ts` `initializeSampleData()` function to add more mock data directly.

---

**Status: ✅ MVP dengan mock data siap untuk testing!**

Gunakan panduan di atas untuk explore fitur-fitur aplikasi. Semua endpoint sudah berfungsi dan ready untuk dikembangkan lebih lanjut.
