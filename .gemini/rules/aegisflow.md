# AegisFlowAI — Agent Rules

## Language
- Always think & respond in Vietnamese (for user communication)
- Code comments in Vietnamese where applicable

## Architecture
- Backend: Laravel 13 (PHP 8.3) + PostgreSQL/PostGIS + Sanctum + Reverb + Spatie Permission
- Frontend: Next.js 16 + TailwindCSS 4 + Shadcn/ui + OpenMapVN
- AI Service: Python FastAPI on port 5005
- Real-time: Laravel Reverb (WebSocket)
- Database: PostgreSQL 16 + PostGIS 3.4

## Project Structure
```
/backend      → Laravel API (port 8000)
/frontend     → Next.js (port 3000)
/ai-service   → Python FastAPI (port 5005)
/docs         → Database schema & business logic docs
/docker       → Dockerfiles
```

## Coding Standards

### Backend (Laravel)
- Use `ApiResponse` helper for all API responses: `ApiResponse::success()`, `ApiResponse::error()`, `ApiResponse::created()`
- All responses follow format: `{ success: bool, message: string, data: any }`
- Use PHP Enums in `App\Enums` namespace (22 enums defined)
- Use Spatie Permission for RBAC: 5 roles (city_admin, rescue_operator, rescue_team, citizen, ai_operator)
- Use Sanctum for API authentication (Bearer tokens)
- Route structure: Public → Auth → Authenticated → Operator → Admin
- Key config file: `backend/.env`

### Frontend (Next.js)
- Use `next-intl` for i18n (vi/en) — translations in `src/messages/`
- Use `useAuth()` hook from `@/lib/auth-context.tsx` for auth state
- Use `api` instance from `@/lib/api.ts` for API calls (auto-injects Bearer token)
- Use `echo` from `@/lib/echo.ts` for WebSocket connections
- Map component uses OpenMapVN: `@/components/map/MapComponent.tsx`
- Token stored in localStorage as `aegisflow_token`
- Auth pages at `/signin`, `/signup`, `/reset-password`
- Dashboard at `/dashboard` with sidebar layout

### AI Service (Python)
- FastAPI app in `main.py`
- Virtual env at `./venv`
- Run with: `./venv/bin/python main.py`

## Database
- PostgreSQL with PostGIS extension
- Use `bigserial` for IDs
- Use `TIMESTAMPTZ` for dates (timezone: Asia/Ho_Chi_Minh)
- Spatial data uses SRID 4326
- Full schema in `docs/DATABASE/schemas.sql`
- Business logic in `docs/DATABASE/business-logic.md`
- DBML schema in `docs/DATABASE/database.dbml`

## Key Files Reference
- **API Routes:** `backend/routes/api.php`
- **Models:** `backend/app/Models/` (27 models)
- **Controllers:** `backend/app/Http/Controllers/Api/` (14 controllers + 2 admin)
- **Enums:** `backend/app/Enums/` (22 enums)
- **Services:** `backend/app/Services/` (FloodAutoDetector, RecommendationGenerator)
- **Seeders:** `backend/database/seeders/` (6 seeders)
- **Frontend API:** `frontend/src/lib/api.ts`
- **Auth Context:** `frontend/src/lib/auth-context.tsx`
- **Map:** `frontend/src/components/map/MapComponent.tsx`
- **Dashboard Panels:** `frontend/src/components/panels/`

## Roles & Permissions
| Role | Description |
|------|-------------|
| city_admin | Full system access |
| rescue_operator | Coordinate rescue, verify incidents |
| rescue_team | Field operations |
| citizen | Report incidents, receive alerts |
| ai_operator | Manage AI models and predictions |

## Important Notes
- Logo file: `frontend/public/images/logo.png` (512x512)
- The project targets flood monitoring in Đà Nẵng, Vietnam
- 4 AI core features: Flood Prediction, Evacuation Routing, Relief Prioritization, Alert Broadcasting
