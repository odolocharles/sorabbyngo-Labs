# Sorabbyngo Labs — Kenya Health Platform

A modular, open-source health information system built for Kenya's healthcare infrastructure.

## Architecture

```
sorabbyngo-Labs/
├── novela/      FastAPI — Patient, Staff, Billing (NHIF/M-Pesa), Appointments
├── pulse/       FastAPI — Ward Vitals (InfluxDB), WebSocket, SMS Alerts (Africa's Talking)
├── karibu/      FastAPI — CHW Registration, Home Visits (NEWS2), ANC
├── dawa/        FastAPI — Drug Forecasting, Procurement (KEMSA routing)
├── taifa/       FastAPI — National Analytics, Surveillance, DHIS2
├── shared/      Schemas (VitalsReading), Utils (SUID), Constants (Kenya counties)
├── dashboard/   React/TypeScript — 14-page dashboard, live WardMonitor, Recharts
├── mobile/      Flutter — Offline-first CHW app, NEWS2 calculator
└── infra/       PostgreSQL SQL, Nginx, Mosquitto MQTT, Docker Compose
```

## Quick Start

```bash
# 1. Start all services
docker compose up -d

# 2. Dashboard
open http://localhost

# 3. API docs
open http://localhost:8001/docs  # Novela
open http://localhost:8002/docs  # Pulse
open http://localhost:8003/docs  # Karibu
open http://localhost:8004/docs  # Dawa
open http://localhost:8005/docs  # Taifa
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `JWT_SECRET` | JWT signing secret |
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | Africa's Talking username |
| `MPESA_CONSUMER_KEY` | Safaricom M-Pesa consumer key |
| `MPESA_CONSUMER_SECRET` | Safaricom M-Pesa consumer secret |
| `MPESA_PASSKEY` | Safaricom STK push passkey |
| `DHIS2_BASE_URL` | DHIS2 instance URL |

## Modules

### Novela — Patient & Staff
- Staff CRUD with role-based access (doctor/nurse/chw/admin/pharmacist)
- JWT authentication with refresh tokens
- NHIF claims submission
- M-Pesa STK push for patient billing
- Appointment booking with conflict detection

### Pulse — Ward Monitoring
- Real-time vitals via WebSocket (`/ws/vitals/{ward}`)
- NEWS2 auto-scoring on every reading
- InfluxDB time-series storage
- SMS alerts via Africa's Talking when NEWS2 ≥ 5
- Medical device registry with MQTT topic mapping

### Karibu — Community Health
- CHW registration with SUID generation
- Home visit recording with auto NEWS2 + referral trigger
- ANC visits with danger sign detection (pre-eclampsia, eclampsia, severe anaemia)

### Dawa — Pharmacy
- Drug forecasting with Kenya malaria seasonal calendar
- Safety stock and reorder point calculation
- KEMSA procurement order routing

### Taifa — Analytics
- County-level aggregated statistics
- National surveillance alert management
- DHIS2 data value push integration

## License

MIT
