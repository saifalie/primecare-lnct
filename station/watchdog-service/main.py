import os, json, sqlite3, time, uuid, traceback
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt

MQTT_BROKER = os.getenv("MQTT_BROKER", "192.168.1.100")
DB_PATH = os.getenv("DB_PATH", "/data/primecare.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def parse_dt(s):
    """Parse any datetime string to naive UTC datetime."""
    if not s:
        return None
    s = s.replace("Z", "").split("+")[0].strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None

def save_alert(conn, patient_id, alert_type, severity, message, data=None):
    alert_id = str(uuid.uuid4())
    conn.execute("""
        INSERT INTO alerts (id, patient_id, type, severity, message, data_json, notified_app)
        VALUES (?, ?, ?, ?, ?, ?, FALSE)
    """, (alert_id, patient_id, alert_type, severity, message, json.dumps(data) if data else None))
    conn.commit()
    print(f"[WATCHDOG] Alert saved to DB: {alert_type} / {severity}", flush=True)
    return alert_id

def run_watchdog(patient_id):
    print(f"[WATCHDOG] Checking patient {patient_id}", flush=True)
    conn = get_db()
    alerts = []
    try:
        now = datetime.utcnow()

        # --- Existing checks: visits ---
        visits = conn.execute("""
            SELECT v.id, v.risk_level, v.completed_at,
                   sr.value_json, sr.sensor_type
            FROM visits v
            LEFT JOIN sensor_readings sr ON sr.visit_id = v.id
            AND sr.sensor_type = 'vitals'
            WHERE v.patient_id = ?
            AND v.completed_at IS NOT NULL
            ORDER BY v.completed_at DESC
            LIMIT 10
        """, (patient_id,)).fetchall()

        if len(visits) >= 2:
            # Check BP trend — 3 consecutive rising readings
            bp_readings = []
            for visit in visits:
                if visit["value_json"]:
                    try:
                        data = json.loads(visit["value_json"])
                        bp = data.get("bp_systolic")
                        if bp:
                            bp_readings.append(bp)
                    except Exception:
                        pass

            if len(bp_readings) >= 3:
                last3 = bp_readings[:3]
                if last3[0] > last3[1] > last3[2]:
                    msg = "Blood pressure has been rising over the last 3 readings. Consider a checkup soon."
                    save_alert(conn, patient_id, "bp_trend", "YELLOW", msg, {"readings": last3})
                    alerts.append({"type": "bp_trend", "message": msg, "severity": "YELLOW"})
                    print(f"[WATCHDOG] BP rising trend for {patient_id}: {last3}", flush=True)

            # Check visit frequency — last visit > 60 days
            last_visit_dt = parse_dt(visits[0]["completed_at"])
            if last_visit_dt:
                days_since = (now - last_visit_dt).days
                if days_since > 60:
                    msg = f"Last checkup was {days_since} days ago. A checkup is recommended."
                    save_alert(conn, patient_id, "overdue", "YELLOW", msg, {"days_since": days_since})
                    alerts.append({"type": "overdue", "message": msg, "severity": "YELLOW"})
                    print(f"[WATCHDOG] Overdue checkup for {patient_id}: {days_since} days", flush=True)

            # Check RED count — 2 or more RED visits in last 30 days
            cutoff = (now - timedelta(days=30)).isoformat()
            red_count = conn.execute("""
                SELECT COUNT(*) as cnt FROM visits
                WHERE patient_id=? AND risk_level='RED' AND completed_at>?
            """, (patient_id, cutoff)).fetchone()["cnt"]

            if red_count >= 2:
                msg = "2 or more critical readings in the last 30 days. Please consult a doctor."
                save_alert(conn, patient_id, "repeated_red", "RED", msg, {"count": red_count})
                alerts.append({"type": "repeated_red", "message": msg, "severity": "RED"})
                print(f"[WATCHDOG] Repeated RED for {patient_id}: {red_count} times", flush=True)
        else:
            print(f"[WATCHDOG] Not enough visits for {patient_id}", flush=True)

        # --- Band data trend checks ---

        # Fetch patient baseline
        patient = conn.execute(
            "SELECT baseline_hr, baseline_spo2 FROM patients WHERE id=?",
            (patient_id,)
        ).fetchone()

        # Check 1: Resting HR drift — 7-day average vs personal baseline
        if patient and patient["baseline_hr"]:
            cutoff_7d = (now - timedelta(days=7)).isoformat()
            hr_rows = conn.execute("""
                SELECT hr FROM band_vitals
                WHERE patient_id=? AND hr IS NOT NULL AND recorded_at > ?
            """, (patient_id, cutoff_7d)).fetchall()

            if len(hr_rows) >= 10:
                avg_hr = sum(r["hr"] for r in hr_rows) / len(hr_rows)
                baseline_hr = patient["baseline_hr"]
                if avg_hr > baseline_hr + 10:
                    msg = f"Average resting heart rate over the last 7 days ({avg_hr:.0f} bpm) is above personal baseline ({baseline_hr:.0f} bpm). Consider a checkup."
                    save_alert(conn, patient_id, "hr_drift", "INFO", msg, {"avg_hr": avg_hr, "baseline_hr": baseline_hr})
                    alerts.append({"type": "hr_drift", "message": msg, "severity": "INFO"})
                    print(f"[WATCHDOG] HR drift for {patient_id}: avg={avg_hr:.1f} baseline={baseline_hr}", flush=True)

        # Check 2: SpO2 declining — 3-day trend
        spo2_days = []
        for days_ago in [0, 1, 2]:
            day_start = (now - timedelta(days=days_ago)).replace(hour=0, minute=0, second=0).isoformat()
            day_end = (now - timedelta(days=days_ago)).replace(hour=23, minute=59, second=59).isoformat()
            rows = conn.execute("""
                SELECT AVG(spo2) as avg_spo2 FROM band_vitals
                WHERE patient_id=? AND spo2 IS NOT NULL
                AND recorded_at >= ? AND recorded_at <= ?
            """, (patient_id, day_start, day_end)).fetchone()
            if rows["avg_spo2"] is not None:
                spo2_days.append(rows["avg_spo2"])

        if len(spo2_days) == 3:
            if spo2_days[0] < spo2_days[1] < spo2_days[2]:
                msg = f"SpO2 has been declining over the last 3 days ({spo2_days[2]:.1f}% → {spo2_days[1]:.1f}% → {spo2_days[0]:.1f}%). Consider a checkup today."
                save_alert(conn, patient_id, "spo2_declining", "WARNING", msg, {"trend": spo2_days})
                alerts.append({"type": "spo2_declining", "message": msg, "severity": "WARNING"})
                print(f"[WATCHDOG] SpO2 declining for {patient_id}: {spo2_days}", flush=True)

        # Check 3: Sleep duration declining — avg < 5 hours for 3+ of last 5 days
        cutoff_5d = (now - timedelta(days=5)).isoformat()
        sleep_rows = conn.execute("""
            SELECT duration_hours FROM sleep_logs
            WHERE patient_id=? AND recorded_at > ?
            ORDER BY recorded_at DESC
        """, (patient_id, cutoff_5d)).fetchall()

        if len(sleep_rows) >= 3:
            short_nights = sum(1 for r in sleep_rows if r["duration_hours"] and r["duration_hours"] < 5)
            if short_nights >= 3:
                msg = f"Sleep duration has been under 5 hours for {short_nights} of the last 5 days. Poor sleep can affect health."
                save_alert(conn, patient_id, "sleep_declining", "INFO", msg, {"short_nights": short_nights})
                alerts.append({"type": "sleep_declining", "message": msg, "severity": "INFO"})
                print(f"[WATCHDOG] Sleep declining for {patient_id}: {short_nights} short nights", flush=True)

        # Check 4: Medication compliance correlation
        cutoff_14d = (now - timedelta(days=14)).isoformat()

        missed_days = conn.execute("""
            SELECT DATE(scheduled_time) as day
            FROM medication_logs
            WHERE patient_id=? AND status='missed' AND scheduled_time > ?
            GROUP BY DATE(scheduled_time)
        """, (patient_id, cutoff_14d)).fetchall()

        if missed_days:
            missed_day_set = set(row["day"] for row in missed_days)

            recent_visits = conn.execute("""
                SELECT v.completed_at, sr.value_json
                FROM visits v
                LEFT JOIN sensor_readings sr ON sr.visit_id = v.id
                AND sr.sensor_type = 'vitals'
                WHERE v.patient_id=? AND v.completed_at > ?
            """, (patient_id, cutoff_14d)).fetchall()

            overlap_count = 0
            for visit in recent_visits:
                if visit["completed_at"] and visit["value_json"]:
                    try:
                        visit_day = visit["completed_at"][:10]
                        data = json.loads(visit["value_json"])
                        bp = data.get("bp_systolic")
                        if bp and bp > 140 and visit_day in missed_day_set:
                            overlap_count += 1
                    except Exception:
                        pass

            if overlap_count >= 3:
                msg = "BP appears higher on days medication was missed. Consistent medication may help."
                save_alert(conn, patient_id, "medication_bp_correlation", "WARNING", msg, {"overlaps": overlap_count})
                alerts.append({"type": "medication_bp_correlation", "message": msg, "severity": "WARNING"})
                print(f"[WATCHDOG] Medication-BP correlation for {patient_id}: {overlap_count} overlaps", flush=True)

        # --- Publish all alerts to MQTT ---
        if alerts:
            mqtt_client.publish("primecare/alerts/watchdog", json.dumps({
                "patient_id": patient_id,
                "alerts": alerts,
                "timestamp": now.isoformat()
            }))
            print(f"[WATCHDOG] {len(alerts)} alerts published for {patient_id}", flush=True)
        else:
            print(f"[WATCHDOG] No alerts for {patient_id}", flush=True)

    except Exception as e:
        print(f"[WATCHDOG] Error: {e}", flush=True)
        traceback.print_exc()
    finally:
        conn.close()
    return alerts

def on_connect(client, userdata, flags, rc):
    print(f"[WATCHDOG] MQTT connected rc={rc}", flush=True)
    client.subscribe("primecare/session/complete")

def on_message(client, userdata, msg):
    if msg.topic == "primecare/session/complete":
        try:
            data = json.loads(msg.payload.decode())
            patient_id = data.get("patient_id") or (data.get("patient") or {}).get("id")
            if patient_id:
                run_watchdog(patient_id)
        except Exception as e:
            print(f"[WATCHDOG] Message error: {e}", flush=True)
            traceback.print_exc()

mqtt_client = mqtt.Client(client_id="primecare-watchdog")
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

if __name__ == "__main__":
    print("[WATCHDOG] PrimeCare Watchdog Agent started", flush=True)
    mqtt_client.connect(MQTT_BROKER, 1883, 60)
    mqtt_client.loop_start()
    print("[WATCHDOG] Listening for sessions...", flush=True)
    while True:
        time.sleep(60)
