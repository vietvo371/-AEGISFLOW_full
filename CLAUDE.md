# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AegisFlow AI** là nền tảng AI hỗ trợ chính quyền đô thị và cộng đồng dự báo ngập lụt sớm, đề xuất tuyến sơ tán an toàn, và tối ưu phân bổ cứu trợ theo thời gian thực. Dự án được thiết kế cho các đô thị Đông Nam Á (đặc biệt là Đà Nẵng).

## Tech Stack

| Component | Technology | Port | Notes |
|-----------|------------|------|-------|
| Backend | Laravel 13 (PHP 8.3+) | 8000 | API, WebSocket, Job Queue |
| Frontend | Next.js 16 (React 19) + TypeScript | 3000 | Dashboard, Citizen/Admin/Team UI |
| AI Service | Python FastAPI | 5005 | Flood prediction, route optimization, priority calculation |
| Database | MySQL 8.0 | 3306 | Main data storage |
| Cache/Session | Redis (Alpine) | 6379 | Cache, session, queue |
| WebSocket | Laravel Reverb | 8080 | Real-time communication |

## Architecture

### Monorepo Structure
```
/backend          - Laravel API (Core, DB, Events, Services, Jobs)
/frontend         - Next.js Dashboard (Web UI, Maps, Charts)
/ai-service       - FastAPI (ML models, algorithms)
/mobile           - Flutter/React Native (Optional mobile apps)
/scripts          - Utility scripts
```

### Key Components

**Backend (Laravel)**
- `app/Models/` - Eloquent models (User, Alert, Incident, RescueRequest, Sensor, etc.)
- `app/Http/Controllers/Api/` - API controllers organized by domain
- `app/Http/Controllers/Api/Admin/` - Admin-specific endpoints
- `app/Services/` - Business logic (FloodAutoDetector, RecommendationGenerator, etc.)
- `app/Services/AI/` - AI integration service
- `app/Events/` - Event broadcasting (AlertCreated, IncidentResolved, etc.)
- `app/Jobs/` - Queue jobs (CallAIPrediction, SendNotifications, etc.)
- `app/Http/Resources/` - API resource transformers
- `routes/api.php` - API routes with auth/permission guards
- `routes/channels.php` - WebSocket channel definitions

**Frontend (Next.js)**
- `src/app/` - App Router (main pages)
  - `(auth)/` - Login, register pages (public route group)
  - `(site)/` - Public site pages (landing, etc.)
  - `dashboard/` - Admin dashboard
  - `citizen/` - Citizen mobile/web interface
  - `team/` - Rescue team dispatch interface
  - `test-realtime/` - Development test page
- `src/components/` - React components
  - `map/` - Map visualization (OpenMapVN/Mapbox)
  - `realtime/` - Real-time updates (WebSocket listeners)
  - `layout/` - Page layouts
  - `ui/` - shadcn/ui components
  - `panels/` - Dashboard panels
- `src/lib/` - Utilities
  - `ai/` - AI SDK integration (OpenAI/Vercel AI SDK)
  - `zod/` - Validation schemas
- `src/i18n/` - Internationalization (next-intl)

**AI Service (Python)**
- `api/` - FastAPI endpoints
- `services/` - Core algorithms
  - `flood_calculator.py` - Flood risk prediction
  - `route_optimizer.py` - Route optimization for evacuation
  - `priority_calculator.py` - Rescue team prioritization
  - `shelter_calculator.py` - Shelter allocation
- `models/` - ML models (trained models, model loaders)
- `data/` - Dataset and data processing

### Real-Time Flow

1. **Sensors/Alerts** → Backend receives data
2. **Events dispatched** → Laravel broadcasts to WebSocket (Reverb)
3. **Frontend listens** → WebSocket updates UI in real-time
4. **AI predictions** → Backend calls AI service (scheduled or on-demand)
5. **Jobs processed** → Queue worker processes background tasks
6. **Notifications sent** → Users notified via broadcast channels

### Key Event Channels
- `user.{userId}.notifications` - Personal notifications
- `team.{teamId}.dispatch` - Team dispatch instructions
- `incident.{incidentId}` - Incident updates (public)
- `alert.{alertId}` - Alert broadcasts

## Development Setup

### Prerequisites
- PHP 8.3+, Composer 2.x (Backend)
- Node.js 18+, Yarn 1.22+ (Frontend)
- Python 3.9+, venv (AI Service)
- Docker & Docker Compose (Optional for services)

### Quick Start - All Services
```bash
# Start all services in separate Terminal windows
./run_all.sh

# Or start individual services
./run_all.sh backend      # Laravel on :8000
./run_all.sh frontend     # Next.js on :3000
./run_all.sh reverb       # WebSocket on :8080
./run_all.sh ai           # FastAPI on :5005
```

### Backend Commands

```bash
cd backend

# Setup
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate          # Run migrations
php artisan db:seed          # Seed sample data

# Development
php artisan serve --port=8000

# WebSocket (Real-time)
php artisan reverb:start --port=8080

# Queue worker (Background jobs)
php artisan queue:work --tries=3 --sleep=1

# Testing
php artisan test
./vendor/bin/phpunit

# Linting
./vendor/bin/pint              # Format PHP code
./vendor/bin/pint --check      # Check formatting
```

### Frontend Commands

```bash
cd frontend

# Setup
yarn install

# Development
yarn dev                        # Dev server on :3000

# Production
yarn build
yarn start

# Linting
yarn lint                       # ESLint check

# Code quality (if configured)
# yarn format
# yarn type-check
```

### AI Service Commands

```bash
cd ai-service

# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Development
python main.py                  # Runs on :5005

# Or with uvicorn directly
uvicorn api.main:app --host 0.0.0.0 --port 5005 --reload
```

### Docker Compose

```bash
# Start all services via Docker
docker-compose up

# Rebuild images
docker-compose up --build

# Stop all services
docker-compose down
```

## API Documentation

### Authentication
- **POST** `/api/auth/login` - Login with email/password
- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/logout` - Logout (requires token)

### Core Resources

**Incidents**
- **GET** `/api/incidents` - List all incidents
- **GET** `/api/public/incidents` - Public incidents (no auth)
- **POST** `/api/incidents` - Create incident
- **GET** `/api/incidents/{id}` - Get incident detail

**Alerts**
- **GET** `/api/alerts` - List alerts
- **GET** `/api/public/alerts/geojson` - GeoJSON for map
- **POST** `/api/alerts` - Create alert

**Flood Zones**
- **GET** `/api/flood-zones/geojson` - GeoJSON for map layers

**Rescue Requests**
- **GET** `/api/rescue-requests` - List rescue requests
- **POST** `/api/rescue-requests` - Create rescue request
- **PATCH** `/api/rescue-requests/{id}` - Update status

**Predictions**
- **GET** `/api/predictions` - List AI predictions
- **POST** `/api/predictions/run` - Trigger AI prediction

### Authentication Guard
Most endpoints require `sanctum` token:
```
Authorization: Bearer {token}
```

## Frontend Routes & Pages

| Path | Purpose | User Type |
|------|---------|-----------|
| `/` | Landing page | Public |
| `/login` | Login | Public |
| `/register` | Sign up | Public |
| `/dashboard` | Admin dashboard | Admin |
| `/dashboard/incidents` | Manage incidents | Admin |
| `/dashboard/alerts` | View/manage alerts | Admin |
| `/citizen` | Citizen alerts + evacuation routes | Citizen |
| `/team/dispatch` | Team dispatch interface | Rescue Team |
| `/test-realtime` | WebSocket test page | Dev |

## Database Schema Highlights

### Core Models
- **User** - Authentication, roles (admin, citizen, team)
- **Incident** - Flood event
- **Alert** - Real-time warnings
- **Sensor** - IoT data sources
- **Prediction** - AI model outputs
- **RescueRequest** - Help requests from citizens
- **RescueTeam** - Emergency response teams
- **FloodZone** - Pre-mapped flood-prone areas
- **Recommendation** - AI-generated actions

### Enums
- `AlertTypeEnum` - Prediction, Warning, Critical, etc.
- `RecommendationTypeEnum` - Evacuation, Shelter, Relief, etc.

## Scheduled Tasks (Laravel)

Defined in `routes/console.php`:
- **Every 15 minutes** - `CallAIPrediction` job (trigger flood predictions)
- **Every 10 minutes** - Sensor health check (mark offline sensors)
- **Daily** - Clean up expired predictions

## Testing

### Backend (PHPUnit)
```bash
cd backend
php artisan test

# Single test file
php artisan test tests/Feature/IncidentTest.php

# With coverage
php artisan test --coverage
```

### Frontend (if Jest configured)
```bash
cd frontend
# yarn test (if available)
```

### Manual Testing - Real-time Flow
```bash
./test_realtime_flow.sh
# Tests WebSocket connection and event broadcasting
```

## Important Notes

### Frontend - Next.js Version
`next.config.ts` includes `next-intl` plugin for i18n support. **Read `/frontend/node_modules/next/dist/docs/` before writing new code** — Next.js 16 may have breaking changes from your training data.

### Backend - Event Broadcasting
- Events in `app/Events/` are automatically broadcast to WebSocket channels
- Listeners defined in `routes/channels.php` control access
- Frontend uses `laravel-echo` + `pusher-js` to subscribe to channels

### AI Integration
- Backend calls AI service via HTTP (async or via queue job)
- Predictions stored in DB and broadcasted to frontend
- Models located in `ai-service/models/`

### Internationalization (i18n)
- Frontend uses `next-intl` for translations
- Message files in `src/messages/` (Vietnamese, English, etc.)
- Backend API returns Vietnamese labels (check Enums)

### Real-Time WebSocket
- Laravel Reverb on port 8080
- Frontend connects via `laravel-echo` in `src/components/realtime/`
- Channels are private/presence — check auth in `routes/channels.php`

## Git Workflow

**Main branch**: `main`  
Current branch: Check with `git status`

Modify files as needed and commit with:
```bash
git add <files>
git commit -m "feat/fix: description"
```

## Common Development Patterns

### Adding a New Feature (end-to-end)

1. **Backend**: Create Model → Migration → Controller → Route
2. **Backend**: Add Event (if needs real-time update)
3. **Backend**: Add Service if complex logic
4. **Frontend**: Create API hook/utility
5. **Frontend**: Build component/page
6. **Frontend**: Subscribe to WebSocket channel if real-time
7. **Test**: Both backend & frontend manually

### Real-Time Update Pattern
```php
// Backend (Event)
event(new IncidentCreated($incident));

// Frontend (Component)
useEffect(() => {
  echo.channel('incident.all').listen('IncidentCreated', (data) => {
    setIncidents([...incidents, data.incident]);
  });
}, []);
```

### AI Service Integration
```php
// Backend (Service/Job)
$predictions = $this->aiService->callFloodPrediction($data);
// Store and broadcast
event(new PredictionReceived($predictions));
```

## Useful Commands Reference

| Task | Command | Location |
|------|---------|----------|
| Run all | `./run_all.sh` | Root |
| Test real-time | `./test_realtime_flow.sh` | Root |
| Format backend code | `./vendor/bin/pint` | backend/ |
| Lint frontend | `yarn lint` | frontend/ |
| Create DB migration | `php artisan make:migration` | backend/ |
| Create Laravel event | `php artisan make:event` | backend/ |
| Create Next.js page | Create in `src/app/...` | frontend/ |

## Troubleshooting

### Backend won't start
- Check if port 8000 is in use: `lsof -i :8000`
- Ensure `.env` is set with correct DB credentials
- Run `php artisan migrate` to ensure schema

### Frontend dev server slow
- Clear `.next/`: `rm -rf frontend/.next`
- Restart: `yarn dev`

### WebSocket not connecting
- Ensure Reverb is running: `php artisan reverb:start`
- Check channels auth in `routes/channels.php`
- Frontend WebSocket URL must match: `ws://localhost:8080`

### AI service returns errors
- Ensure `venv` is activated
- Check Python dependencies: `pip install -r requirements.txt`
- Verify port 5005 is free
