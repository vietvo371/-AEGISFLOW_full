# Pitch Deck Outline - AegisFlow AI

## 1. Title

AegisFlow AI - Real-time flood warning, evacuation, and rescue coordination for Southeast Asian cities.

## 2. Problem

Urban flooding in coastal cities creates fragmented response: sensor data, citizen reports, rescue teams, and public alerts often live in separate systems.

## 3. Solution

AegisFlow connects live monitoring, AI risk scoring, human-approved alerts, citizen evacuation guidance, and rescue dispatch in one operational platform.

## 4. Product Demo Flow

Sensor -> AI prediction -> alert -> citizen evacuation -> team dispatch -> analytics.

## 5. Users

- City admin: situational awareness and analytics
- Rescue operator: approve recommendations and dispatch teams
- Rescue team: field assignments and map
- Citizen: alerts, shelters, SOS/request flow

## 6. AI Model

- RandomForest flood-risk classifier
- Accuracy: 98.83%
- Weighted F1: 98.86%
- 5-fold CV F1: 98.86% +/- 0.38%
- Fallback: rule-based threshold scoring when the model file is unavailable

## 7. Feature Importance

- Water level: 36.34%
- Rainfall: 32.02%
- Historical score: 15.55%
- Tide level: 8.09%
- Rain duration: 8.00%

## 8. Architecture

Laravel API + PostgreSQL/PostGIS + Redis queue + Laravel Reverb WebSocket + Next.js dashboard/citizen/team UI + FastAPI AI service.

## 9. Real-Time Workflow

Sensors and reports update backend models, events broadcast through Reverb, frontend listeners update maps and panels, and AI predictions feed alerts/recommendations.

## 10. Ethics and Safety

- Human-in-the-loop approval for alerts and dispatch
- Transparent confidence and reasoning
- No PII needed for flood-risk prediction
- Manual fallback if AI is unavailable

## 11. Impact

Potential impact comes from earlier warnings, prioritized rescue for vulnerable groups, and better use of limited rescue teams during peak flooding.

## 12. Scalability

The architecture is modular: city-specific GIS layers, sensor adapters, thresholds, shelters, and rescue units can be configured per deployment.

## 13. Demo Evidence

Local demo includes seeded Da Nang scenario:

- 93 sensor stations and 82 rain stations
- 392 historical flood reports
- 5 live demo sensors
- 3 flood zones, 3 incidents, 3 predictions, 3 rescue requests, 3 alerts, 3 recommendations

## 14. Roadmap

- Validate model with official long-term sensor archives
- Add production deployment and monitoring
- Add mobile push notifications
- Pilot with district-level emergency teams

## 15. Ask

Access to official hydrology feeds, pilot coordination with city disaster-response teams, and support for real-world validation.
