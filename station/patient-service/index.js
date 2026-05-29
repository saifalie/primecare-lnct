const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DB_PATH = process.env.DB_PATH || '/data/primecare.db';

function getDb() {
    return new Database(DB_PATH);
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'patient-service' });
});

// POST /patients/register
app.post('/patients/register', (req, res) => {
    const {
        name, age, gender, phone,
        profile_photo,
        blood_group,
        conditions,
        allergies,
        surgeries,
        family_history,
        emergency_contacts,
        auto_112
    } = req.body;

    if (!name || !age || !gender || !phone) {
        return res.status(400).json({ error: 'Missing required fields: name, age, gender, phone' });
    }

    if (!emergency_contacts || !Array.isArray(emergency_contacts) || emergency_contacts.length === 0) {
        return res.status(400).json({ error: 'At least one emergency contact is required' });
    }

    const db = getDb();
    try {
        const existing = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
        if (existing) {
            return res.status(409).json({ error: 'Phone number already registered', patient: existing });
        }

        const id = uuidv4();
        db.prepare(`
            INSERT INTO patients (
                id, name, age, gender, phone,
                profile_photo, blood_group,
                conditions, allergies, surgeries, family_history,
                emergency_contacts, auto_112,
                language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en')
        `).run(
            id, name, parseInt(age), gender, phone,
            profile_photo || null,
            blood_group || null,
            conditions ? JSON.stringify(conditions) : null,
            allergies ? JSON.stringify(allergies) : null,
            surgeries ? JSON.stringify(surgeries) : null,
            family_history ? JSON.stringify(family_history) : null,
            JSON.stringify(emergency_contacts),
            auto_112 !== undefined ? (auto_112 ? 1 : 0) : 1
        );

        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        res.status(201).json({ success: true, patient });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// GET /patients — list all patients for profile selection screen
app.get('/patients', (req, res) => {
    const db = getDb();
    try {
        const patients = db.prepare(`
            SELECT
                p.id, p.name, p.age, p.gender, p.phone,
                p.profile_photo, p.blood_group,
                p.baseline_hr, p.baseline_spo2,
                p.baseline_bp_sys, p.baseline_bp_dia,
                p.band_battery, p.band_last_seen,
                p.auto_112, p.created_at, p.updated_at,
                v.risk_level as last_risk_level,
                v.health_score as last_health_score,
                v.completed_at as last_checkup_at
            FROM patients p
            LEFT JOIN visits v ON v.id = (
                SELECT id FROM visits
                WHERE patient_id = p.id
                AND completed_at IS NOT NULL
                ORDER BY completed_at DESC
                LIMIT 1
            )
            ORDER BY p.created_at DESC
        `).all();

        res.json({ success: true, count: patients.length, patients });
    } catch (err) {
        console.error('List patients error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// GET /patients/:id — full patient profile
app.get('/patients/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const visits = db.prepare(`
            SELECT * FROM visits WHERE patient_id = ? ORDER BY started_at DESC LIMIT 30
        `).all(id);

        const visitsWithReadings = visits.map(visit => {
            const readings = db.prepare(`
                SELECT * FROM sensor_readings WHERE visit_id = ? ORDER BY recorded_at ASC
            `).all(visit.id);
            return { ...visit, readings };
        });

        res.json({ success: true, patient, visits: visitsWithReadings });
    } catch (err) {
        console.error('Get patient error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// PUT /patients/:id — update patient profile
app.put('/patients/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const allowed = [
            'name', 'age', 'gender', 'phone', 'profile_photo', 'blood_group',
            'conditions', 'allergies', 'surgeries', 'family_history',
            'emergency_contacts', 'auto_112',
            'band_device_id', 'band_last_seen', 'band_battery'
        ];

        const jsonFields = ['conditions', 'allergies', 'surgeries', 'family_history', 'emergency_contacts'];
        const updates = [];
        const values = [];

        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (jsonFields.includes(field) && typeof req.body[field] !== 'string') {
                    values.push(JSON.stringify(req.body[field]));
                } else {
                    values.push(req.body[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        db.prepare(`UPDATE patients SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        res.json({ success: true, patient: updated });
    } catch (err) {
        console.error('Update patient error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// PUT /patients/:id/baseline — update learned baseline values
app.put('/patients/:id/baseline', (req, res) => {
    const { id } = req.params;
    const { baseline_hr, baseline_spo2, baseline_bp_sys, baseline_bp_dia, baseline_temp } = req.body;

    const db = getDb();
    try {
        const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        db.prepare(`
            UPDATE patients SET
                baseline_hr = COALESCE(?, baseline_hr),
                baseline_spo2 = COALESCE(?, baseline_spo2),
                baseline_bp_sys = COALESCE(?, baseline_bp_sys),
                baseline_bp_dia = COALESCE(?, baseline_bp_dia),
                baseline_temp = COALESCE(?, baseline_temp),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            baseline_hr || null,
            baseline_spo2 || null,
            baseline_bp_sys || null,
            baseline_bp_dia || null,
            baseline_temp || null,
            id
        );

        const updated = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
        res.json({ success: true, patient: updated });
    } catch (err) {
        console.error('Update baseline error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// POST /patients/login/phone — kept for compatibility
app.post('/patients/login/phone', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number required' });
    }

    const db = getDb();
    try {
        const patient = db.prepare('SELECT * FROM patients WHERE phone = ?').get(phone);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const visits = db.prepare(`
            SELECT * FROM visits WHERE patient_id = ? ORDER BY started_at DESC LIMIT 10
        `).all(patient.id);

        res.json({ success: true, patient, visits });
    } catch (err) {
        console.error('Login phone error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`PrimeCare patient service running on port ${PORT}`);
});

// GET /patients/:id/medications — list all active medications
app.get('/patients/:id/medications', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const medications = db.prepare(`
            SELECT * FROM medications
            WHERE patient_id = ? AND active = 1
            ORDER BY created_at ASC
        `).all(id);
        res.json({ success: true, medications });
    } catch (err) {
        console.error('Get medications error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// POST /patients/:id/medications — add new medication
app.post('/patients/:id/medications', (req, res) => {
    const { id } = req.params;
    const { name, dose, frequency, times, purpose, prescribing_dr } = req.body;

    if (!name || !dose || !frequency || !times) {
        return res.status(400).json({ error: 'Missing required fields: name, dose, frequency, times' });
    }

    const db = getDb();
    try {
        const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(id);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        const medId = uuidv4();
        db.prepare(`
            INSERT INTO medications (id, patient_id, name, dose, frequency, times, purpose, prescribing_dr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            medId, id, name, dose, frequency,
            Array.isArray(times) ? JSON.stringify(times) : times,
            purpose || null,
            prescribing_dr || null
        );

        const medication = db.prepare('SELECT * FROM medications WHERE id = ?').get(medId);
        res.status(201).json({ success: true, medication });
    } catch (err) {
        console.error('Add medication error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// PUT /medications/:id — update medication
app.put('/medications/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const medication = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
        if (!medication) {
            return res.status(404).json({ error: 'Medication not found' });
        }

        const allowed = ['name', 'dose', 'frequency', 'times', 'purpose', 'prescribing_dr'];
        const updates = [];
        const values = [];

        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (field === 'times' && Array.isArray(req.body[field])) {
                    values.push(JSON.stringify(req.body[field]));
                } else {
                    values.push(req.body[field]);
                }
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(id);
        db.prepare(`UPDATE medications SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        const updated = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
        res.json({ success: true, medication: updated });
    } catch (err) {
        console.error('Update medication error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// DELETE /medications/:id — soft delete (deactivate)
app.delete('/medications/:id', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const medication = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
        if (!medication) {
            return res.status(404).json({ error: 'Medication not found' });
        }

        db.prepare('UPDATE medications SET active = 0 WHERE id = ?').run(id);
        res.json({ success: true, message: 'Medication deactivated' });
    } catch (err) {
        console.error('Delete medication error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// POST /medications/:id/confirm — mark dose taken
app.post('/medications/:id/confirm', (req, res) => {
    const { id } = req.params;
    const { scheduled_time, confirmed_by } = req.body;

    if (!scheduled_time) {
        return res.status(400).json({ error: 'scheduled_time is required' });
    }

    const db = getDb();
    try {
        const medication = db.prepare('SELECT * FROM medications WHERE id = ?').get(id);
        if (!medication) {
            return res.status(404).json({ error: 'Medication not found' });
        }

        const logId = db.prepare(`
            INSERT INTO medication_logs (patient_id, medication_id, scheduled_time, confirmed_at, status, confirmed_by)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'taken', ?)
        `).run(medication.patient_id, id, scheduled_time, confirmed_by || 'patient');

        res.status(201).json({ success: true, log_id: logId.lastInsertRowid });
    } catch (err) {
        console.error('Confirm medication error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// GET /patients/:id/alerts — list all alerts newest first
app.get('/patients/:id/alerts', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const alerts = db.prepare(`
            SELECT * FROM alerts
            WHERE patient_id = ?
            ORDER BY created_at DESC
        `).all(id);
        res.json({ success: true, alerts });
    } catch (err) {
        console.error('Get alerts error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});

// PUT /alerts/:id/resolve — mark alert resolved
app.put('/alerts/:id/resolve', (req, res) => {
    const { id } = req.params;
    const db = getDb();
    try {
        const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(id);
        res.json({ success: true, message: 'Alert resolved' });
    } catch (err) {
        console.error('Resolve alert error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        db.close();
    }
});
