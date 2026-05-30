# Demo Video Script - 3 Minutes

## Goal

Show one complete emergency workflow:

Sensor reading -> AI prediction -> public alert -> citizen evacuation -> team dispatch -> analytics.

## Recording Setup

- Run local stack: `./run_all.sh`
- Open frontend: `http://localhost:3000`
- Login for dashboard: `admin@aegisflow.ai` / `password`
- Keep AI health ready: `http://localhost:5005`
- Use routes: `/dashboard`, `/citizen`, `/team`, `/dashboard/analytics`

## Timeline

### 0:00-0:20 - Opening

Voiceover:

"AegisFlow AI helps coastal cities respond to floods faster. In this demo, Da Nang receives live sensor readings, predicts flood risk, alerts citizens, and dispatches rescue teams in one workflow."

Visuals:

- Landing page or dashboard title
- Quick cut to Da Nang map

### 0:20-0:45 - Sensor Monitoring

Voiceover:

"The dashboard aggregates water-level sensors, rainfall stations, active flood zones, and citizen reports. Operators can see which areas are moving from monitoring to alert status."

Visuals:

- `/dashboard`
- `/dashboard/sensors`
- Flood-zone map layer

### 0:45-1:10 - AI Prediction

Voiceover:

"The AI service scores risk from water level, rainfall, tide, rain duration, and historical flood patterns. The model is transparent: water level and rainfall are the strongest factors."

Visuals:

- `/dashboard/predictions`
- Show `F1 weighted: 98.86%`, `accuracy: 98.83%`, `latency target: 45ms`
- Optional terminal/curl result from `/api/predict-risk`

### 1:10-1:35 - Alert

Voiceover:

"When the risk crosses the threshold, AegisFlow creates an alert for affected districts. Operators keep final approval, so AI supports decisions instead of replacing human authority."

Visuals:

- `/dashboard/alerts`
- Public/citizen alert list
- Highlight Hoa Khanh and An Khe alerts

### 1:35-2:00 - Citizen Evacuation

Voiceover:

"Citizens receive clear warning information, nearby shelters, and evacuation guidance. The mobile-first interface is designed for quick action under stress."

Visuals:

- `/citizen`
- `/citizen/alerts`
- `/citizen/shelters`
- `/citizen/map`

### 2:00-2:25 - Team Dispatch

Voiceover:

"Rescue teams see assigned requests, urgency, vulnerable groups, and location context. Critical requests are prioritized when children, elderly people, or medical needs are involved."

Visuals:

- `/team`
- `/team/map`
- `/dashboard/rescue-requests`
- `/dashboard/recommendations`

### 2:25-2:50 - Analytics and Impact

Voiceover:

"For city leaders, analytics connect operational data to impact: faster alerts, safer evacuation, and better allocation of rescue capacity."

Visuals:

- `/dashboard/analytics`
- Metrics: active alerts, predictions, rescue requests, teams

### 2:50-3:00 - Closing

Voiceover:

"AegisFlow AI turns fragmented flood response into a coordinated, explainable, real-time system for climate-resilient cities."

Visuals:

- Dashboard overview
- GitHub or project title slide

## Capture Checklist

- Frontend returns 200 on `/`, `/citizen`, `/team`
- `/dashboard` redirects to `/signin` until logged in
- AI CORS preflight returns 200
- Backend public alerts return seeded GeoJSON
- Demo data seeded with `php artisan migrate --seed`
