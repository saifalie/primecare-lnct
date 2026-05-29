import json
import sqlite3
import os
import time
import threading
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt
from database import init_db, get_connection
from fastapi import FastAPI
import uvicorn

MQTT_BROKER = os.getenv("MQTT_BROKER", "mosquitto")
MQTT_PORT = 1883
DB_PATH = os.getenv("DB_PATH", "/data/primecare.db")

app = FastAPI()

# Latest station sensor readings held in memory
latest_readings = {
    "timestamp": None,
    "temperature": None,
    "hr": None,
    "spo2": None,
    "finger_detected": False,
    "signal_quality": 0.0,
    "ecg_value": None,
    "leads_connected": False,
    "bp_systolic": None,
    "bp_diastolic": None,
    "health": {}
}

SIMULATION_DATA = {
    "green": {
        "timestamp": 0,
        "temperature": 36.8,
        "hr": 72,
        "spo2": 98,
        "finger_detected": True,
        "signal_quality": 0.95,
        "ecg_value": 512,
        "leads_connected": True,
        "bp_systolic": 118,
        "bp_diastolic": 76,
        "health": {
            "mlx90614": True,
            "max30102": True,
            "ad8232": True
        }
    },
    "yellow": {
        "timestamp": 0,
        "temperature": 37.1,
        "hr": 88,
        "spo2": 96,
        "finger_detected": True,
        "signal_quality": 0.90,
        "ecg_value": 530,
        "leads_connected": True,
        "bp_systolic": 148,
        "bp_diastolic": 94,
        "health": {
            "mlx90614": True,
            "max30102": True,
            "ad8232": True
        }
    },
    "red": {
        "timestamp": 0,
        "temperature": 38.9,
        "hr": 108,
        "spo2": 91,
        "finger_detected": True,
        "signal_quality": 0.85,
        "ecg_value": 580,
        "leads_connected": True,
        "bp_systolic": 182,
        "bp_diastolic": 112,
        "health": {
            "mlx90614": True,
            "max30102": True,
            "ad8232": True
        }
    }
}

simulation_mode = False
simulation_dataset = "green"

mqtt_client = None

def save_band_vitals(patient_id, payload):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO band_vitals (patient_id, hr, spo2, temperature, steps, battery)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            patient_id,
            payload.get("hr"),
            payload.get("spo2"),
            payload.get("temperature"),
            payload.get("steps"),
            payload.get("battery")
        ))
        # Purge band_vitals older than 7 days
        cursor.execute("""
            DELETE FROM band_vitals
            WHERE patient_id = ?
            AND recorded_at < datetime('now', '-7 days')
        """, (patient_id,))
        conn.commit()
        conn.close()
        print(f"Band vitals saved for patient {patient_id}")
    except Exception as e:
        print(f"Error saving band vitals: {e}")

def save_alert(patient_id, alert_type, severity, message, data_json=None):
    try:
        import uuid
        conn = get_connection()
        cursor = conn.cursor()
        alert_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO alerts (id, patient_id, type, severity, message, data_json)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (alert_id, patient_id, alert_type, severity, message, json.dumps(data_json) if data_json else None))
        conn.commit()
        conn.close()
        print(f"Alert saved: {alert_type} for patient {patient_id}")
        return alert_id
    except Exception as e:
        print(f"Error saving alert: {e}")
        return None

def save_sleep_log(patient_id, payload):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sleep_logs (patient_id, date, duration_hours, wake_episodes, quality, avg_hr_sleep)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            patient_id,
            payload.get("date"),
            payload.get("duration_hours"),
            payload.get("wake_episodes", 0),
            payload.get("quality"),
            payload.get("avg_hr")
        ))
        conn.commit()
        conn.close()
        print(f"Sleep log saved for patient {patient_id}")
    except Exception as e:
        print(f"Error saving sleep log: {e}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Sensor service connected to MQTT broker")
        client.subscribe("primecare/sensors/all")
        client.subscribe("primecare/simulation/#")
        client.subscribe("primecare/band/+/vitals")
        client.subscribe("primecare/band/+/fall")
        client.subscribe("primecare/band/+/sos")
        client.subscribe("primecare/band/+/sleep")
        print("Subscribed to all PrimeCare topics")
    else:
        print(f"MQTT connection failed with code {rc}")

def on_message(client, userdata, msg):
    global latest_readings, simulation_mode, simulation_dataset
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode())
    except Exception:
        return

    # Station sensor readings from ESP32
    if topic == "primecare/sensors/all":
        latest_readings.update(payload)
        latest_readings["timestamp"] = int(time.time())

    # Simulation control
    elif topic == "primecare/simulation/mode":
        simulation_mode = payload.get("enabled", False)
        simulation_dataset = payload.get("dataset", "green")
        print(f"Simulation mode: {simulation_mode}, dataset: {simulation_dataset}")

    # Band vitals — topic: primecare/band/{patientId}/vitals
    elif "/vitals" in topic and "/band/" in topic:
        parts = topic.split("/")
        if len(parts) >= 4:
            patient_id = parts[2]
            save_band_vitals(patient_id, payload)

    # Fall detection — topic: primecare/band/{patientId}/fall
    elif "/fall" in topic and "/band/" in topic:
        parts = topic.split("/")
        if len(parts) >= 4:
            patient_id = parts[2]
            save_alert(
                patient_id,
                "fall",
                "CRITICAL",
                "A fall has been detected. Please check on the patient immediately.",
                payload
            )
            # Forward for push notification
            client.publish(
                "primecare/alerts/push",
                json.dumps({"type": "fall", "patient_id": patient_id, "data": payload})
            )

    # SOS button — topic: primecare/band/{patientId}/sos
    elif "/sos" in topic and "/band/" in topic:
        parts = topic.split("/")
        if len(parts) >= 4:
            patient_id = parts[2]
            save_alert(
                patient_id,
                "sos",
                "CRITICAL",
                "Emergency SOS triggered. Patient needs immediate assistance.",
                payload
            )
            # Forward for push notification
            client.publish(
                "primecare/alerts/push",
                json.dumps({"type": "sos", "patient_id": patient_id, "data": payload})
            )

    # Sleep log — topic: primecare/band/{patientId}/sleep
    elif "/sleep" in topic and "/band/" in topic:
        parts = topic.split("/")
        if len(parts) >= 4:
            patient_id = parts[2]
            save_sleep_log(patient_id, payload)

def get_current_readings():
    if simulation_mode:
        data = SIMULATION_DATA[simulation_dataset].copy()
        data["timestamp"] = int(time.time())
        return data
    return latest_readings

def start_mqtt():
    global mqtt_client
    mqtt_client = mqtt.Client()
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    while True:
        try:
            mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            mqtt_client.loop_forever()
        except Exception as e:
            print(f"MQTT error: {e}. Retrying in 5 seconds...")
            time.sleep(5)

@app.get("/health")
def health():
    return {"status": "ok", "service": "sensor-service"}

@app.get("/sensors/live")
def get_live_sensors():
    return get_current_readings()

@app.get("/sensors/simulation/status")
def get_simulation_status():
    return {"simulation_mode": simulation_mode, "dataset": simulation_dataset}

@app.post("/sensors/simulation/enable/{dataset}")
def enable_simulation(dataset: str):
    global simulation_mode, simulation_dataset
    if dataset not in SIMULATION_DATA:
        return {"error": "Invalid dataset. Use: green, yellow, red"}
    simulation_mode = True
    simulation_dataset = dataset
    return {"simulation_mode": True, "dataset": dataset}

@app.post("/sensors/simulation/disable")
def disable_simulation():
    global simulation_mode
    simulation_mode = False
    return {"simulation_mode": False}

@app.get("/band/live/{patient_id}")
def get_band_live(patient_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM band_vitals
            WHERE patient_id = ?
            ORDER BY recorded_at DESC
            LIMIT 1
        """, (patient_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {"success": True, "vitals": dict(row)}
        return {"success": False, "message": "No band data found for this patient"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/band/history/{patient_id}")
def get_band_history(patient_id: str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM band_vitals
            WHERE patient_id = ?
            AND recorded_at >= datetime('now', '-24 hours')
            ORDER BY recorded_at DESC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return {"success": True, "count": len(rows), "vitals": [dict(r) for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    print("Initializing PrimeCare database...")
    init_db()
    print("Starting MQTT listener thread...")
    mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
    mqtt_thread.start()
    print("Starting sensor service API on port 3004...")
    uvicorn.run(app, host="0.0.0.0", port=3004)
