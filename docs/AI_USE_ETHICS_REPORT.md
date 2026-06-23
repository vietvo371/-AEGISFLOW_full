# AI-USE & ETHICS REPORT

**TEAM INFORMATION**
- **Team Name:** [insert details]
- **Institution:** Duy Tan University
- **Country:** Vietnam
- **Track:** Climate Change
- **Project Title:** AegisFlow AI — AI-Powered Flood Prediction & Rescue Coordination Platform

---

## SECTION 1: INTRODUCTION

Southeast Asian cities lose an estimated US$4.5 billion every year to flooding, and in Vietnam emergency response still takes 90–180 minutes — long after the water has risen. Da Nang alone has flooded twelve times in the past decade. AegisFlow AI addresses this response gap with a unified platform that forecasts flood risk one to six hours ahead, ranks rescue requests by urgency and vulnerability, and routes evacuees around flooded zones. AI is necessary here because the decisions are multi-variable, time-critical, and must scale across a city faster than human coordinators can manually triage — turning fragmented warnings into coordinated action in under 90 seconds.

## SECTION 2: PROBLEM CONTEXT & SOLUTION OVERVIEW

In the ASEAN context, 250 million people live in flood-prone areas and 74% of Vietnam's population is exposed. The stakeholders are city emergency managers, rescue teams, and at-risk citizens — groups that today operate in disconnected silos using phone calls and static maps. Our data spans IoT water-level, rainfall and tide sensors, live weather (Open-Meteo, Da Nang), and historical flood events. AegisFlow AI ingests this through a Laravel backend with PostGIS geospatial storage, triggers a Python FastAPI AI service for prediction and optimisation, and pushes results in real time to a Next.js command dashboard and a React Native citizen app with Firebase push notifications. Four AI capabilities work together: ensemble flood-risk classification, temporal multi-step forecasting, rescue-priority scoring, and evacuation-route optimisation — each surfaced to a human operator for approval before any action is dispatched.

## SECTION 3: AI TOOLS & METHODS USED

The core flood-risk classifier is a **stacking ensemble** built with scikit-learn 1.6: five base learners — Random Forest, Extra Trees, Gradient Boosting, LightGBM and XGBoost — feed a Logistic Regression meta-learner, trained on 18 engineered features (water level, rainfall, tide, soil saturation, cyclical seasonality, and interaction terms). A separate temporal forecaster predicts risk 1/3/6 hours ahead from a sequence of recent readings, with an XGBoost fallback. Evacuation routing uses **NetworkX** graph search with Haversine distance and flood-polygon avoidance. Rescue prioritisation is a transparent multi-factor weighted-scoring algorithm. The dashboard also embeds an LLM operator assistant (Vercel AI SDK + OpenAI gpt-4o-mini) driven by a domain-specific system prompt covering Da Nang flood zones, water-level thresholds, and shelters. Serving is via FastAPI; PostgreSQL/PostGIS and Redis handle storage and caching.

## SECTION 4: ASSESSMENT OF AI OUTPUT

**Accuracy.** The stacking ensemble reaches 98.81% accuracy (weighted F1 = 0.9881) on a held-out split, with the strongest single model (XGBoost) scoring AUC-ROC 0.9984. We treat these figures with caution: they were measured on a **balanced 8,000-row dataset (2,000 per risk class)** whose labels were derived from VNMHA physics-based thresholds and historical events. High scores therefore reflect strong fit to a curated distribution, not yet validated real-world hydrology — the explicit goal of our Phase-1 pilot.

**Technical bias.** Balancing classes prevents the model from ignoring rare "critical" events, but synthetic generation risks encoding the very threshold rules we want the model to generalise beyond. We mitigate this with feature-importance inspection, a `quality_score` that flags unreliable sensor readings upstream, and a rule-based fallback that keeps the system safe when inputs drift out of distribution.

**Cultural and regional sensitivity.** The priority algorithm intentionally up-weights elderly, disabled, and children — reflecting community values rather than purely actuarial logic — and avoids any socioeconomic input that could bias rescue order. Flood thresholds are configurable per city, so the model is not hard-coded to Da Nang.

**Linguistic nuance.** Emergencies demand the citizen's own language. The AegisFlow interface, alerts and route guidance ship natively in six ASEAN languages — Vietnamese, English, Indonesian, Malay, Thai and Filipino — rather than relying on lossy machine translation, and the operator assistant replies in the user's own language.

## SECTION 5: HUMAN INTERVENTION & JUSTIFICATION

AegisFlow is human-in-the-loop by design: the AI proposes, a human authorises. Every recommendation enters an explicit Approve/Reject workflow, and no rescue team is dispatched autonomously. During development we found the AI insufficient in three areas and intervened accordingly. First, the model's confidence on synthetic data overstated real-world certainty, so we added confidence display, feature-importance explanations, and a rule-based fallback so operators can override. Second, the temporal forecaster degraded on noisy or dropped sensor feeds, so we engineered it to consume sequences and fall back to XGBoost. Third, automated route choices occasionally ignored local knowledge (closed bridges, gatherings), so final dispatch always rests with the operator. We reserve AI for scale and speed, and human expertise for accountability and context.

## SECTION 6: REFLECTION ON AI-HUMAN CO-CREATION

The clear advantage of co-creation was speed at scale: AI triaged hundreds of simulated requests in priority order far faster than manual coordination, while humans retained judgement on edge cases. The main risk was automation bias — operators trusting a confident-looking score. We countered it with transparency (confidence, contributing factors) and a mandatory approval step. The hardest challenge was honest evaluation: resisting the temptation to present 98.81% as field-ready rather than dataset-ready. The lesson: in disaster AI, trustworthy fallbacks and clear human ownership matter as much as headline accuracy.

## SECTION 7: CONCLUSION

AegisFlow AI shows that an ensemble-driven, human-supervised platform can compress flood response from hours to minutes while remaining transparent and fair. Its regional contribution is a replicable, six-language, ASEAN-ready architecture that any coastal city can self-configure. Our central ethical finding is that responsible AI for emergencies is defined less by accuracy alone and more by the guardrails around it — human-in-the-loop authorisation, vulnerable-first fairness, honest reporting of data limitations, and graceful failure. We commit to validating these claims on real sensor data before any operational deployment.

---

## SECTION 8: APPENDICES

**A. Screenshots** *(attach in final PDF)*
- A1 — Command dashboard: live flood map (OpenMapVN/Leaflet), sensor status, active alerts, analytics KPIs
- A2 — AI forecast panel: CRITICAL risk with 1h/3h/6h horizon, confidence and contributing factors
- A3 — Rescue coordination: priority queue, auto team assignment, GPS/ETA tracking
- A4 — React Native citizen app: SOS button, evacuation route, FCM flood alert, nearest shelter

**B. Prompt Samples (LLM operator assistant)**
- Model: OpenAI gpt-4o-mini via Vercel AI SDK. The system prompt encodes Da Nang domain knowledge (flood-prone wards; water-level thresholds 2.5 / 3.5 / 4.5 m on the Cẩm Lệ river; key shelters) and hard safety rules: respond in the user's language, always state confidence, flag CRITICAL cases, recommend hotlines 114/115, *"never speculate beyond available data — say 'insufficient data' if unsure,"* and *"human operators make final decisions — you recommend, they approve."*
- Example: *"Explain the current flood risk level for Cẩm Lệ and what a citizen there should do now."*

**C. Data Sources & Licenses**
| Data | Source | License |
|---|---|---|
| Water level / rainfall / tide | IoT sensors (thresholds from VNMHA) | Internal |
| Live weather | Open-Meteo API (Da Nang) | Free, attribution |
| Historical flood events | Global Flood Database (DFO, Dartmouth) | Public domain |
| Flood-zone boundaries | Da Nang City GIS Portal | Open government data |
| Training dataset | 8,000 rows, balanced, physics-threshold labels | Project-generated |

**D. Model & Stack Summary**
- Flood model: stacking ensemble (RF + ExtraTrees + GradientBoosting + LightGBM + XGBoost → LogisticRegression), 18 features, 98.81% accuracy / F1 0.9881
- Forecast: temporal multi-step (1/3/6h), XGBoost fallback
- Routing: NetworkX graph + flood-polygon avoidance
- Stack: FastAPI · Laravel 13 · Next.js 16 / React 19 · React Native 0.81 · PostgreSQL 16 + PostGIS · Redis · Firebase FCM

---

*Word count (Sections 1–7): ~960 words. Format: submit as PDF. Deadline: June 20, 2026.*
*Duy Tan University — AegisFlow AI Team — ASEAN AI Hackathon 2026, Climate Change Track.*
