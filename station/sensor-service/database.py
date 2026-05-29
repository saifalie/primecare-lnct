import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", "/data/primecare.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS patients (
            id                  TEXT PRIMARY KEY,
            name                TEXT NOT NULL,
            age                 INTEGER NOT NULL,
            gender              TEXT NOT NULL,
            phone               TEXT UNIQUE NOT NULL,
            profile_photo       TEXT,
            blood_group         TEXT,

            conditions          TEXT,
            allergies           TEXT,
            surgeries           TEXT,
            family_history      TEXT,

            baseline_hr         REAL,
            baseline_spo2       REAL,
            baseline_bp_sys     INTEGER,
            baseline_bp_dia     INTEGER,
            baseline_temp       REAL,

            band_device_id      TEXT,
            band_last_seen      DATETIME,
            band_battery        INTEGER,

            emergency_contacts  TEXT,
            auto_112            BOOLEAN DEFAULT TRUE,

            language            TEXT DEFAULT 'en',

            created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced_to_cloud     BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS visits (
            id                  TEXT PRIMARY KEY,
            patient_id          TEXT REFERENCES patients(id),
            session_type        TEXT NOT NULL,

            risk_level          TEXT,
            health_score        INTEGER,
            ai_summary          TEXT,
            what_to_do          TEXT,
            doctor_type         TEXT,
            next_checkup_days   INTEGER,

            simulation_mode     BOOLEAN DEFAULT FALSE,

            started_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at        DATETIME,
            synced_to_cloud     BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS sensor_readings (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            visit_id        TEXT REFERENCES visits(id),
            patient_id      TEXT REFERENCES patients(id),
            sensor_type     TEXT NOT NULL,
            value_json      TEXT NOT NULL,
            quality_score   REAL DEFAULT 1.0,
            recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS band_vitals (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id      TEXT REFERENCES patients(id),
            hr              INTEGER,
            spo2            REAL,
            temperature     REAL,
            steps           INTEGER,
            fall_detected   BOOLEAN DEFAULT FALSE,
            battery         INTEGER,
            recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS medications (
            id              TEXT PRIMARY KEY,
            patient_id      TEXT REFERENCES patients(id),
            name            TEXT NOT NULL,
            dose            TEXT NOT NULL,
            frequency       TEXT NOT NULL,
            times           TEXT NOT NULL,
            purpose         TEXT,
            prescribing_dr  TEXT,
            active          BOOLEAN DEFAULT TRUE,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS medication_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id      TEXT REFERENCES patients(id),
            medication_id   TEXT REFERENCES medications(id),
            scheduled_time  DATETIME NOT NULL,
            confirmed_at    DATETIME,
            status          TEXT DEFAULT 'pending',
            confirmed_by    TEXT DEFAULT 'patient'
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id              TEXT PRIMARY KEY,
            patient_id      TEXT REFERENCES patients(id),
            type            TEXT NOT NULL,
            severity        TEXT NOT NULL,
            message         TEXT NOT NULL,
            data_json       TEXT,
            resolved        BOOLEAN DEFAULT FALSE,
            notified_app    BOOLEAN DEFAULT FALSE,
            notified_sms    BOOLEAN DEFAULT FALSE,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sleep_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id      TEXT REFERENCES patients(id),
            date            DATE NOT NULL,
            duration_hours  REAL,
            wake_episodes   INTEGER DEFAULT 0,
            quality         TEXT,
            avg_hr_sleep    REAL,
            recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mood_logs (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id      TEXT REFERENCES patients(id),
            score           INTEGER NOT NULL,
            sleep_quality   TEXT,
            recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            visit_id        TEXT NOT NULL,
            attempts        INTEGER DEFAULT 0,
            last_attempt    DATETIME,
            synced          BOOLEAN DEFAULT FALSE,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_visits_patient      ON visits(patient_id);
        CREATE INDEX IF NOT EXISTS idx_readings_visit      ON sensor_readings(visit_id);
        CREATE INDEX IF NOT EXISTS idx_band_vitals_patient ON band_vitals(patient_id);
        CREATE INDEX IF NOT EXISTS idx_band_vitals_time    ON band_vitals(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_alerts_patient      ON alerts(patient_id);
        CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
        CREATE INDEX IF NOT EXISTS idx_med_logs_patient    ON medication_logs(patient_id);
        CREATE INDEX IF NOT EXISTS idx_sleep_patient       ON sleep_logs(patient_id);
        CREATE INDEX IF NOT EXISTS idx_mood_patient        ON mood_logs(patient_id);
        CREATE INDEX IF NOT EXISTS idx_sync_queue_synced   ON sync_queue(synced);
    """)
    conn.commit()
    conn.close()
    print("PrimeCare database initialized successfully.")

if __name__ == "__main__":
    init_db()
