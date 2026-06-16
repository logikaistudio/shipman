# Shipman - Ship Operation & Maintenance Readiness System

Mobile-first React + TypeScript application for managing ship maintenance, cost forecasting, and operational readiness assessment.

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Setup

```bash
# Install dependencies for both backend and frontend
npm install

# Start both backend and frontend (from root directory)
npm run dev
```

Backend runs on `http://localhost:5000`
Frontend runs on `http://localhost:3000`

### Individual Start

```bash
# Backend only
cd backend
npm run dev

# Frontend only (in another terminal)
cd frontend
npm run dev
```

## Project Structure

```
shipman/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── types.ts      # Shared TypeScript types
│   │   ├── index.ts      # Express server & routes
│   │   └── services/
│   │       ├── costService.ts        # Cost calculations & aggregation
│   │       └── readinessService.ts   # Readiness scoring
│   └── package.json
├── frontend/             # React + Tailwind
│   ├── src/
│   │   ├── App.tsx       # Main app component
│   │   ├── main.tsx      # Entry point
│   │   ├── index.css     # Tailwind styles
│   │   └── components/
│   │       ├── ReadinessDashboard.tsx  # Readiness UI
│   │       └── CostsScreen.tsx         # Cost forecast UI
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── PRD.md               # Product requirements document
├── docs/
│   └── API_SPEC.md      # API specification
└── package.json         # Root package with workspaces
```

## Features Implemented (MVP)

### ✅ Backend Core
- Express API server with CORS
- Shared TypeScript types & enums
- Cost service: per-task calculation, aggregation, recurring expansion
- Readiness service: mission-profile-based scoring (0-100)
- Sample endpoints for vessels, tasks, costs, readiness

### ✅ Frontend
- Mobile-first UI with Tailwind CSS
- ReadinessDashboard: vessel readiness score, system status, mission profile selector
- CostsScreen: cost breakdown (parts/labor/misc), top drivers, export button
- Tab-based navigation (Readiness / Costs)

## API Endpoints

See `docs/API_SPEC.md` for complete endpoint documentation.

### Key Endpoints
- `GET /api/v1/vessels` - List vessels
- `POST /api/v1/vessels` - Create vessel
- `GET /api/v1/vessels/{id}/readiness?missionProfile=patrol` - Get readiness score
- `GET /api/v1/vessels/{id}/costs?period=2026-06` - Get cost forecast
- `GET /api/v1/mission-profiles` - List mission profiles
- `POST /api/v1/tasks` - Create maintenance task
- `POST /api/v1/tasks/{id}/complete` - Complete task and log entry

## Calculations & Business Logic

### Readiness Scoring
- Base formula: weighted sum of per-system scores (0-100)
- Default weights: Engine 40%, Electrical 30%, Interior 15%, Exterior 15%
- Mission profiles adjust weights (e.g., Combat increases Electrical weight)
- Critical items flag or reduce score if unresolved
- Ready threshold: score ≥ 80% AND no critical open items

### Cost Forecast
- Per-item cost = (unit cost × qty) + (labor hours × labor rate)
- Task cost = sum of per-item costs
- Recurring tasks expanded to period (daily/weekly/monthly)
- Aggregation by month or year
- Top drivers: ranked by total cost contribution

## Development Notes

### Technology Stack
- **Backend:** Node.js, Express, TypeScript
- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Styling:** Tailwind CSS (mobile-first, dark-mode ready)

### Next Steps for Completeness
1. Add offline-first sync (local DB with conflict resolution)
2. Implement authentication & JWT
3. Add checklist form component & task submission
4. Inventory management integration
5. CSV/PDF export functionality
6. Push notifications
7. Unit & E2E tests
8. Deployment (Docker, CI/CD)

### Styling Classes
- `.card` - Box with shadow and border
- `.btn-primary`, `.btn-secondary` - Button styles
- `.score-badge` - Readiness score display (color-coded)
- `.score-high` (green), `.score-medium` (yellow), `.score-low` (red)

## Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## Build for Production

```bash
npm run build
```

Outputs:
- `backend/dist/` - Compiled backend
- `frontend/dist/` - Built React app

## Troubleshooting

**Port already in use:**
```bash
# Change port in backend/src/index.ts or set env var
PORT=5001 npm run dev
```

**CORS errors:**
Check `backend/src/index.ts` CORS config and frontend proxy in `vite.config.ts`.

**Tailwind styles not applying:**
Ensure `src/index.css` is imported in `main.tsx`.

## License

Proprietary — Ship O&M System

## Contact

For questions or issues, contact the development team.
