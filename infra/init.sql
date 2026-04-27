-- Sorabbyngo Labs — PostgreSQL initialization
-- Run: psql -U postgres -f init.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Staff ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
    id              TEXT PRIMARY KEY,
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('doctor','nurse','chw','admin','pharmacist','analyst')),
    facility_id     TEXT NOT NULL,
    county_id       INTEGER NOT NULL,
    phone           TEXT,
    cadre           TEXT,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_facility ON staff(facility_id);
CREATE INDEX IF NOT EXISTS idx_staff_county   ON staff(county_id);

-- ─── Appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      TEXT NOT NULL,
    provider_id     TEXT NOT NULL REFERENCES staff(id),
    facility_id     TEXT NOT NULL,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    type            TEXT NOT NULL,
    status          TEXT DEFAULT 'confirmed',
    notes           TEXT,
    outcome         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appt_patient  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_provider ON appointments(provider_id);

-- ─── Billing ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      TEXT NOT NULL,
    facility_id     TEXT NOT NULL,
    items           JSONB,
    total_kes       NUMERIC(12,2),
    nhif_number     TEXT,
    nhif_package    TEXT,
    status          TEXT DEFAULT 'pending',
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id              UUID REFERENCES invoices(id),
    checkout_request_id     TEXT UNIQUE,
    phone                   TEXT,
    amount_kes              NUMERIC(10,2),
    status                  TEXT DEFAULT 'pending',
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nhif_claims (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id      UUID REFERENCES invoices(id),
    nhif_number     TEXT NOT NULL,
    package_code    TEXT NOT NULL,
    diagnosis_codes JSONB,
    status          TEXT DEFAULT 'submitted',
    submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Devices ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial          TEXT UNIQUE NOT NULL,
    type            TEXT NOT NULL,
    manufacturer    TEXT,
    model           TEXT,
    facility_id     TEXT NOT NULL,
    ward            TEXT,
    mqtt_topic      TEXT,
    status          TEXT DEFAULT 'active',
    last_calibrated TIMESTAMPTZ,
    registered_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CHW & Home Visits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chws (
    id              TEXT PRIMARY KEY,
    full_name       TEXT NOT NULL,
    phone           TEXT UNIQUE NOT NULL,
    county_id       INTEGER NOT NULL,
    sub_county      TEXT,
    ward            TEXT,
    village         TEXT,
    id_number       TEXT UNIQUE,
    link_facility_id TEXT NOT NULL,
    active          BOOLEAN DEFAULT TRUE,
    registered_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_visits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chw_id              TEXT REFERENCES chws(id),
    patient_id          TEXT NOT NULL,
    household_id        TEXT,
    visit_type          TEXT NOT NULL,
    vitals              JSONB,
    symptoms            JSONB,
    notes               TEXT,
    gps_lat             NUMERIC(10,7),
    gps_lng             NUMERIC(10,7),
    news2_score         INTEGER,
    alert_level         TEXT,
    referral_triggered  BOOLEAN DEFAULT FALSE,
    visited_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      TEXT NOT NULL,
    source_type     TEXT,
    source_id       UUID,
    reason          TEXT,
    urgency         TEXT DEFAULT 'routine',
    status          TEXT DEFAULT 'pending',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ANC ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anc_visits (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id              TEXT NOT NULL,
    facility_id             TEXT NOT NULL,
    provider_id             TEXT,
    gestational_age_weeks   INTEGER,
    weight_kg               NUMERIC(5,2),
    blood_pressure          TEXT,
    haemoglobin_gdl         NUMERIC(4,2),
    fundal_height_cm        NUMERIC(5,2),
    fetal_heart_rate        INTEGER,
    presentation            TEXT,
    danger_signs            JSONB,
    hiv_status              TEXT,
    malaria_test            TEXT,
    notes                   TEXT,
    next_visit_date         DATE,
    referral_needed         BOOLEAN DEFAULT FALSE,
    visited_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Pharmacy ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drug_stock (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id     TEXT NOT NULL,
    drug_name       TEXT NOT NULL,
    generic_name    TEXT,
    quantity        INTEGER DEFAULT 0,
    unit            TEXT,
    category        TEXT,
    expiry_date     DATE,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facility_id, drug_name)
);

CREATE TABLE IF NOT EXISTS procurement_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_ref       TEXT UNIQUE NOT NULL,
    facility_id     TEXT NOT NULL,
    items           JSONB,
    route           TEXT DEFAULT 'kemsa',
    priority        TEXT DEFAULT 'routine',
    status          TEXT DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Surveillance ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveillance_alerts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county_id           INTEGER NOT NULL,
    county_name         TEXT,
    disease             TEXT NOT NULL,
    cases               INTEGER DEFAULT 0,
    deaths              INTEGER DEFAULT 0,
    alert_date          DATE NOT NULL,
    notes               TEXT,
    threshold_exceeded  BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
