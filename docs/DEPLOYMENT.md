# Deployment Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 12+ (for future phases; MVP uses in-memory storage)
- Docker (optional, for containerization)

## Development Setup

```bash
# Clone and install
git clone <repo-url>
cd Shipman
npm install

# Start dev servers
npm run dev

# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

## Building for Production

```bash
# Build both backend and frontend
npm run build

# Outputs:
# - backend/dist/
# - frontend/dist/
```

## Docker Deployment

### Build Images

```bash
# Backend image
cd backend
docker build -t shipman-backend:0.1.0 .

# Frontend image
cd ../frontend
docker build -t shipman-frontend:0.1.0 .
```

### Docker Compose (local/staging)

```yaml
version: '3.8'
services:
  backend:
    image: shipman-backend:0.1.0
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET=your-secret-here
      - NODE_ENV=production

  frontend:
    image: shipman-frontend:0.1.0
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Run:
```bash
docker-compose up
```

## Environment Variables

### Backend (`.env`)
```
PORT=5000
JWT_SECRET=your-production-secret-here
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/shipman (future)
CORS_ORIGIN=https://app.shipman.com
```

### Frontend (`.env.local`)
```
REACT_APP_API_URL=https://api.shipman.com
REACT_APP_VERSION=0.1.0
```

## Database Setup (when PostgreSQL integration is added)

```bash
# Run migrations
npm run migrate

# Seed sample data
npm run seed
```

## CI/CD Pipeline (GitHub Actions example)

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run build
      - name: Push to Registry
        run: |
          docker build -t shipman-backend:${{ github.sha }} backend/
          docker push ...
```

## Rollout Strategy

### Phase 1: Staging
- Deploy to staging environment
- Run smoke tests and E2E tests
- Gather feedback from test users

### Phase 2: Pilot
- Deploy to 1 vessel for 2 weeks
- Monitor for errors, performance issues
- Collect user feedback

### Phase 3: Fleet-wide
- Gradual rollout to all vessels (blue-green or canary)
- Monitor metrics and logs
- Support hotline for issues

## Monitoring & Logging

### Key Metrics
- API response times (target < 500ms)
- Sync success rate (target > 99%)
- Cost calculation accuracy (validate against manual)
- Readiness score stability (flag sudden changes)

### Logging
```typescript
// Backend logs to stdout (captured by Docker/K8s)
console.log('[INFO]', message);
console.error('[ERROR]', error);

// Frontend logs to browser console + optional error tracking service
// Example: Sentry integration for production
```

### Alerts
- API errors > 5% → page on-call
- Sync failures > 10 per hour → investigate
- DB connection pool exhausted → scale up

## Backup & Recovery

- **Daily backups:** Database snapshots to S3
- **Point-in-time restore:** up to 30 days
- **Disaster recovery:** documented runbook

## Maintenance Windows

- **Best practices:**
  - Schedule during low-traffic hours (e.g., 2–4 AM UTC)
  - Announce 48 hours in advance
  - Estimated duration: 15–30 minutes
  - Blue-green deployment minimizes downtime

## Scaling Considerations

- **Horizontal:** Load balancer in front of backend API
- **Vertical:** Increase CPU/memory for high-concurrent tasks
- **Database:** Sharding by vessel ID for large deployments
- **Cache:** Redis for readiness scores and cost aggregations

## Security Checklist

- [ ] JWT secret rotated
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection tests passed
- [ ] XSS protections in place
- [ ] CSRF tokens validated
- [ ] Audit logs encrypted
- [ ] Passwords hashed (bcrypt)
- [ ] Dependencies audited (npm audit)

## Support & Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -i :5000  # find process
kill -9 <PID>   # kill it
```

**CORS errors:**
Check `backend/src/index.ts` CORS config and ensure frontend URL is whitelisted.

**Sync failures:**
- Check network connectivity
- Verify server is running
- Check browser console for errors

### Logs
```bash
# Docker logs
docker logs <container-id>

# File logs (if configured)
tail -f logs/app.log
```

## Future Enhancements

- PostgreSQL database integration
- Redis caching layer
- Kubernetes deployment
- Prometheus metrics
- ELK stack for centralized logging
- Feature flags / A/B testing
