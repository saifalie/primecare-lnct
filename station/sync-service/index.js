const Database = require('better-sqlite3');
const { MongoClient } = require('mongodb');

const DB_PATH = process.env.DB_PATH || '/data/primecare.db';
const MONGO_URI = process.env.MONGO_URI || '';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL || '300000'); // 5 minutes

function getDb() {
    return new Database(DB_PATH);
}

async function syncVisits(db, mongoDb) {
    const unsynced = db.prepare(`
        SELECT sq.visit_id FROM sync_queue sq
        WHERE sq.synced = FALSE
        ORDER BY sq.created_at ASC
        LIMIT 50
    `).all();

    if (unsynced.length === 0) {
        console.log('[Visits] No unsynced records');
        return;
    }

    console.log(`[Visits] Found ${unsynced.length} unsynced visits`);

    for (const row of unsynced) {
        const visitId = row.visit_id;
        try {
            const visit = db.prepare('SELECT * FROM visits WHERE id = ?').get(visitId);
            if (!visit) {
                db.prepare('UPDATE sync_queue SET synced = TRUE WHERE visit_id = ?').run(visitId);
                continue;
            }

            const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(visit.patient_id);
            const readings = db.prepare('SELECT * FROM sensor_readings WHERE visit_id = ?').all(visitId);

            const document = {
                visit_id: visitId,
                patient_id: visit.patient_id,
                patient: patient ? {
                    id: patient.id,
                    name: patient.name,
                    age: patient.age,
                    gender: patient.gender,
                    blood_group: patient.blood_group,
                    conditions: patient.conditions ? JSON.parse(patient.conditions) : [],
                    baseline_hr: patient.baseline_hr,
                    baseline_spo2: patient.baseline_spo2,
                    baseline_bp_sys: patient.baseline_bp_sys,
                    baseline_bp_dia: patient.baseline_bp_dia
                } : null,
                session_type: visit.session_type,
                risk_level: visit.risk_level,
                health_score: visit.health_score,
                ai_summary: visit.ai_summary,
                what_to_do: visit.what_to_do,
                doctor_type: visit.doctor_type,
                next_checkup_days: visit.next_checkup_days,
                simulation_mode: visit.simulation_mode === 1,
                readings: readings.map(r => {
                    let value;
                    try { value = JSON.parse(r.value_json); } catch { value = r.value_json; }
                    return {
                        sensor_type: r.sensor_type,
                        value,
                        quality_score: r.quality_score,
                        recorded_at: r.recorded_at
                    };
                }),
                started_at: visit.started_at,
                completed_at: visit.completed_at,
                synced_at: new Date().toISOString()
            };

            await mongoDb.collection('visits').replaceOne(
                { visit_id: visitId },
                document,
                { upsert: true }
            );

            db.prepare('UPDATE sync_queue SET synced = TRUE, last_attempt = CURRENT_TIMESTAMP WHERE visit_id = ?').run(visitId);
            db.prepare('UPDATE visits SET synced_to_cloud = TRUE WHERE id = ?').run(visitId);

            console.log(`[Visits] Synced: ${visitId}`);
        } catch (err) {
            console.error(`[Visits] Failed to sync ${visitId}:`, err.message);
            db.prepare('UPDATE sync_queue SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP WHERE visit_id = ?').run(visitId);
        }
    }
}

async function syncPatients(db, mongoDb) {
    let unsynced;
    try {
        unsynced = db.prepare(`
            SELECT * FROM patients
            WHERE synced_to_cloud = FALSE OR synced_to_cloud IS NULL
            LIMIT 20
        `).all();
    } catch (err) {
        console.log('[Patients] Table not ready yet, skipping');
        return;
    }

    if (unsynced.length === 0) {
        console.log('[Patients] All patients synced');
        return;
    }

    console.log(`[Patients] Found ${unsynced.length} unsynced patients`);

    for (const patient of unsynced) {
        try {
            const document = {
                patient_id: patient.id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                phone: patient.phone,
                blood_group: patient.blood_group,
                conditions: patient.conditions ? JSON.parse(patient.conditions) : [],
                allergies: patient.allergies ? JSON.parse(patient.allergies) : [],
                emergency_contacts: patient.emergency_contacts ? JSON.parse(patient.emergency_contacts) : [],
                auto_112: patient.auto_112 === 1,
                baseline_hr: patient.baseline_hr,
                baseline_spo2: patient.baseline_spo2,
                baseline_bp_sys: patient.baseline_bp_sys,
                baseline_bp_dia: patient.baseline_bp_dia,
                baseline_temp: patient.baseline_temp,
                band_device_id: patient.band_device_id,
                band_battery: patient.band_battery,
                updated_at: patient.updated_at,
                synced_at: new Date().toISOString()
            };

            await mongoDb.collection('patients').replaceOne(
                { patient_id: patient.id },
                document,
                { upsert: true }
            );

            db.prepare('UPDATE patients SET synced_to_cloud = TRUE WHERE id = ?').run(patient.id);
            console.log(`[Patients] Synced: ${patient.id}`);
        } catch (err) {
            console.error(`[Patients] Failed to sync ${patient.id}:`, err.message);
        }
    }
}

async function syncAlerts(db, mongoDb) {
    let unsynced;
    try {
        unsynced = db.prepare(`
            SELECT * FROM alerts
            WHERE notified_app = FALSE
            ORDER BY created_at ASC
            LIMIT 50
        `).all();
    } catch (err) {
        console.log('[Alerts] Table not ready yet, skipping');
        return;
    }

    if (unsynced.length === 0) {
        console.log('[Alerts] No unsynced alerts');
        return;
    }

    console.log(`[Alerts] Found ${unsynced.length} unsynced alerts`);

    for (const alert of unsynced) {
        try {
            const document = {
                alert_id: alert.id,
                patient_id: alert.patient_id,
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                data: alert.data_json ? JSON.parse(alert.data_json) : null,
                resolved: alert.resolved === 1,
                created_at: alert.created_at,
                synced_at: new Date().toISOString()
            };

            await mongoDb.collection('alerts').replaceOne(
                { alert_id: alert.id },
                document,
                { upsert: true }
            );

            db.prepare('UPDATE alerts SET notified_app = TRUE WHERE id = ?').run(alert.id);
            console.log(`[Alerts] Synced: ${alert.id}`);
        } catch (err) {
            console.error(`[Alerts] Failed to sync ${alert.id}:`, err.message);
        }
    }
}

async function syncMedicationLogs(db, mongoDb) {
    let unsynced;
    try {
        unsynced = db.prepare(`
            SELECT ml.*, m.name as med_name, m.dose as med_dose
            FROM medication_logs ml
            JOIN medications m ON ml.medication_id = m.id
            WHERE ml.status != 'pending'
            ORDER BY ml.scheduled_time ASC
            LIMIT 100
        `).all();
    } catch (err) {
        console.log('[MedLogs] Table not ready yet, skipping');
        return;
    }

    if (unsynced.length === 0) {
        console.log('[MedLogs] No medication logs to sync');
        return;
    }

    console.log(`[MedLogs] Syncing ${unsynced.length} medication logs`);

    for (const log of unsynced) {
        try {
            const document = {
                log_id: log.id,
                patient_id: log.patient_id,
                medication_id: log.medication_id,
                medication_name: log.med_name,
                medication_dose: log.med_dose,
                scheduled_time: log.scheduled_time,
                confirmed_at: log.confirmed_at,
                status: log.status,
                confirmed_by: log.confirmed_by,
                synced_at: new Date().toISOString()
            };

            await mongoDb.collection('medication_logs').replaceOne(
                { log_id: log.id },
                document,
                { upsert: true }
            );
        } catch (err) {
            console.error(`[MedLogs] Failed to sync log ${log.id}:`, err.message);
        }
    }

    console.log('[MedLogs] Sync complete');
}

async function syncToMongo() {
    if (!MONGO_URI) {
        console.log('No MONGO_URI set — skipping sync');
        return;
    }

    const db = getDb();
    let mongoClient;

    try {
        console.log('Starting sync cycle...');
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        const mongoDb = mongoClient.db('primecare');

        await syncVisits(db, mongoDb);
        await syncPatients(db, mongoDb);
        await syncAlerts(db, mongoDb);
        await syncMedicationLogs(db, mongoDb);

        console.log('Sync cycle complete');
    } catch (err) {
        console.error('Sync error:', err.message);
    } finally {
        db.close();
        if (mongoClient) await mongoClient.close();
    }
}

async function main() {
    console.log(`PrimeCare Sync service started. Interval: ${SYNC_INTERVAL / 1000}s`);
    console.log(`MongoDB: ${MONGO_URI ? 'configured' : 'NOT configured'}`);

    await syncToMongo();
    setInterval(syncToMongo, SYNC_INTERVAL);
}

main().catch(console.error);
