import os
import json
import sqlite3
from datetime import datetime
from fastapi import FastAPI
import uvicorn

DB_PATH = os.getenv("DB_PATH", "/data/primecare.db")
PRINTER_VENDOR_ID = int(os.getenv("PRINTER_VENDOR_ID", "0x0483"), 16)
PRINTER_PRODUCT_ID = int(os.getenv("PRINTER_PRODUCT_ID", "0x5840"), 16)
SIMULATION_MODE = os.getenv("SIMULATION_MODE", "true").lower() == "true"

app = FastAPI()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_printer():
    import usb.core
    import usb.util
    from escpos.printer import Usb
    import time
    dev = usb.core.find(idVendor=PRINTER_VENDOR_ID, idProduct=PRINTER_PRODUCT_ID)
    if dev is not None:
        try:
            for config in dev:
                for intf in config:
                    if dev.is_kernel_driver_active(intf.bInterfaceNumber):
                        try:
                            dev.detach_kernel_driver(intf.bInterfaceNumber)
                        except Exception as e:
                            print(f"detach_kernel_driver failed: {e}")
            dev.reset()
            print("USB device reset OK")
        except Exception as e:
            print(f"USB reset failed: {e}")
        usb.util.dispose_resources(dev)
    time.sleep(1.0)
    return Usb(PRINTER_VENDOR_ID, PRINTER_PRODUCT_ID, out_ep=0x04, in_ep=0x82)

def get_status_tag(value, sensor_type):
    thresholds = {
        "hr": (40, 100),
        "spo2": (95, 100),
        "temperature": (34, 37.5),
        "systolic": (70, 140),
        "diastolic": (40, 90),
    }
    if sensor_type not in thresholds:
        return "[OK]"
    low, high = thresholds[sensor_type]
    try:
        v = float(value)
        if v < low:
            return "[LOW]"
        elif v > high:
            return "[HIGH]"
        else:
            return "[OK]"
    except:
        return "[--]"

def get_risk_label(risk_level):
    mapping = {
        "GREEN": "GOOD",
        "YELLOW": "ATTENTION",
        "RED": "URGENT"
    }
    return mapping.get(str(risk_level).upper(), risk_level or "PENDING")

def print_receipt_simulation(visit, patient, readings_map):
    now = datetime.now().strftime('%d %b %Y  %H:%M')
    risk_label = get_risk_label(visit['risk_level'])
    health_score = visit['health_score'] if visit['health_score'] else "N/A"
    hr = readings_map.get("hr", "N/A")
    spo2 = readings_map.get("spo2", "N/A")
    temp = readings_map.get("temperature", "N/A")
    sys_bp = readings_map.get("systolic", "N/A")
    dia_bp = readings_map.get("diastolic", "N/A")

    print("\n" + "="*40)
    print("          * PrimeCare *")
    print("      Family Health Report")
    print("="*40)
    print(f"  {patient['name']}  |  Age {patient['age']}  |  {patient['gender'].title()}")
    print(f"  {now}")
    print(f"  Ref: {str(visit['id'])[:8].upper()}")
    print("="*40)
    print(f"  RESULT  :  {risk_label}")
    print(f"  SCORE   :  {health_score} / 100")
    print("="*40)
    print("  VITAL READINGS")
    print(f"  Heart Rate    {hr} bpm      {get_status_tag(hr, 'hr')}")
    print(f"  SpO2          {spo2}%         {get_status_tag(spo2, 'spo2')}")
    print(f"  Temperature   {temp} C       {get_status_tag(temp, 'temperature')}")
    print(f"  Blood Pressure {sys_bp}/{dia_bp} mmHg  {get_status_tag(sys_bp, 'systolic')}")
    print("="*40)
    ai_summary = visit['ai_summary'] if visit['ai_summary'] else ""
    if ai_summary:
        safe = ai_summary.encode('ascii', 'ignore').decode('ascii').strip()
        if safe:
            print("  AI HEALTH SUMMARY")
            words = safe.split()
            line = "  "
            for w in words:
                if len(line) + len(w) + 1 > 38:
                    print(line)
                    line = "  " + w + " "
                else:
                    line += w + " "
            if line.strip():
                print(line)
            print("="*40)
    what_to_do = visit['what_to_do'] if visit['what_to_do'] else ""
    if what_to_do:
        safe_todo = what_to_do.encode('ascii', 'ignore').decode('ascii').strip()
        if safe_todo:
            print("  WHAT TO DO NEXT")
            for line in safe_todo.split('.'):
                line = line.strip()
                if len(line) > 4:
                    print(f"  > {line}.")
            print("="*40)
    doctor_type = visit['doctor_type'] if visit['doctor_type'] else ""
    next_days = visit['next_checkup_days'] if visit['next_checkup_days'] else ""
    if doctor_type:
        print(f"  See a : {doctor_type}")
    if next_days:
        print(f"  Next checkup in {next_days} days")
    print("="*40)
    print("  Scan QR to view full report online")
    print(f"  Patient ID: {patient['id']}")
    print("="*40)
    print("  PrimeCare  |  Emergency: 112")
    print("  Your family's health, always watched.")
    print("="*40 + "\n")

def print_receipt_physical(visit, patient, readings_map):
    import time
    p = None
    for attempt in range(3):
        try:
            p = get_printer()
            break
        except Exception as e:
            print(f"Printer open attempt {attempt+1} failed: {e}")
            time.sleep(2)
    if p is None:
        raise Exception("Could not open printer after 3 attempts")

    p.set(align='center', bold=True, height=2, width=2)
    p.text("PrimeCare\n")
    p.set(align='center', bold=False, height=1, width=1)
    p.text("Family Health Report\n")
    p.text("--------------------------------\n")

    p.set(align='left', bold=True)
    p.text("PATIENT DETAILS\n")
    p.set(bold=False)
    p.text(f"Name   : {patient['name']}\n")
    p.text(f"Age    : {patient['age']}  Gender: {patient['gender']}\n")
    p.text(f"Date   : {datetime.now().strftime('%d-%m-%Y %H:%M')}\n")
    p.text(f"ID     : {str(visit['id'])[:8].upper()}\n")
    p.text("--------------------------------\n")

    p.set(align='center')
    p.text("Scan for returning visit\n")
    p.qr(patient['id'], size=6)
    p.text("\n--------------------------------\n")

    risk_label = get_risk_label(visit['risk_level'])
    health_score = visit['health_score'] if visit['health_score'] else "N/A"
    p.set(align='center', bold=True)
    p.text(f"RISK: {risk_label}   SCORE: {health_score}/100\n")
    p.text("--------------------------------\n")

    p.set(align='left', bold=True)
    p.text("HEALTH READINGS\n")
    p.set(bold=False)
    hr = readings_map.get("hr", "N/A")
    spo2 = readings_map.get("spo2", "N/A")
    temp = readings_map.get("temperature", "N/A")
    sys_bp = readings_map.get("systolic", "N/A")
    dia_bp = readings_map.get("diastolic", "N/A")
    p.text(f"Heart Rate   : {hr} bpm   {get_status_tag(hr, 'hr')}\n")
    p.text(f"SpO2         : {spo2}%      {get_status_tag(spo2, 'spo2')}\n")
    p.text(f"Temperature  : {temp} C    {get_status_tag(temp, 'temperature')}\n")
    p.text(f"Blood Press. : {sys_bp}/{dia_bp} mmHg  {get_status_tag(sys_bp, 'systolic')}\n")
    p.text("--------------------------------\n")

    ai_summary = visit['ai_summary'] if visit['ai_summary'] else ""
    if ai_summary:
        safe = ai_summary.encode('ascii', 'ignore').decode('ascii').strip()
        if safe:
            p.set(align='left', bold=True)
            p.text("SUMMARY\n")
            p.set(bold=False)
            p.text(f"{safe}\n")
            p.text("--------------------------------\n")

    what_to_do = visit['what_to_do'] if visit['what_to_do'] else ""
    if what_to_do:
        safe_todo = what_to_do.encode('ascii', 'ignore').decode('ascii').strip()
        if safe_todo:
            p.set(align='left', bold=True)
            p.text("WHAT TO DO NEXT\n")
            p.set(bold=False)
            for line in safe_todo.split('\n'):
                line = line.strip()
                if line:
                    p.text(f"  {line}\n")
            p.text("--------------------------------\n")

    doctor_type = visit['doctor_type'] if visit['doctor_type'] else ""
    next_days = visit['next_checkup_days'] if visit['next_checkup_days'] else ""
    if doctor_type:
        p.text(f"SEE A DOCTOR : {doctor_type}\n")
    if next_days:
        p.text(f"NEXT CHECKUP : In {next_days} days\n")
    if doctor_type or next_days:
        p.text("--------------------------------\n")

    p.set(align='center')
    p.text("PrimeCare | Emergency: 112\n")
    p.cut()
    try:
        p.close()
    except:
        pass

def build_readings_map(readings):
    readings_map = {}
    for r in readings:
        try:
            raw = r['value_json']
            sensor_type = r['sensor_type']
            try:
                value = json.loads(raw)
            except:
                value = raw
            if sensor_type == 'temperature':
                readings_map['temperature'] = value if not isinstance(value, dict) else value.get('temperature', 'N/A')
            elif sensor_type == 'hr':
                readings_map['hr'] = value if not isinstance(value, dict) else value.get('hr', 'N/A')
            elif sensor_type == 'spo2':
                readings_map['spo2'] = value if not isinstance(value, dict) else value.get('spo2', 'N/A')
            elif sensor_type == 'bp_systolic':
                readings_map['systolic'] = value if not isinstance(value, dict) else value.get('systolic', 'N/A')
            elif sensor_type == 'bp_diastolic':
                readings_map['diastolic'] = value if not isinstance(value, dict) else value.get('diastolic', 'N/A')
            elif sensor_type == 'heartrate':
                if isinstance(value, dict):
                    readings_map['hr'] = value.get('hr', 'N/A')
                    readings_map['spo2'] = value.get('spo2', 'N/A')
            elif sensor_type == 'bp':
                if isinstance(value, dict):
                    readings_map['systolic'] = value.get('systolic', 'N/A')
                    readings_map['diastolic'] = value.get('diastolic', 'N/A')
        except:
            pass
    return readings_map

@app.get("/health")
def health():
    return {"status": "ok", "service": "printer-service", "simulation_mode": SIMULATION_MODE}

@app.post("/print/test")
def print_test():
    dummy_visit = {
        "id": "test-1234-5678-abcd",
        "patient_id": "test-patient",
        "risk_level": "YELLOW",
        "health_score": 74,
        "ai_summary": "Blood pressure is slightly elevated compared to your personal baseline. Heart rate and SpO2 are within normal range. Sleep quality has been declining over the past week.",
        "what_to_do": "Monitor BP daily for the next 3 days.\nReduce salt intake.\nEnsure evening medication is taken on time.",
        "doctor_type": "General Physician",
        "next_checkup_days": 7
    }
    dummy_patient = {
        "id": "test-patient-uuid",
        "name": "Test Patient",
        "age": 65,
        "gender": "male"
    }
    dummy_readings = {
        "hr": 78, "spo2": 97, "temperature": 36.9,
        "systolic": 148, "diastolic": 94
    }
    if SIMULATION_MODE:
        print_receipt_simulation(dummy_visit, dummy_patient, dummy_readings)
        return {"success": True, "mode": "simulation"}
    else:
        print_receipt_physical(dummy_visit, dummy_patient, dummy_readings)
        return {"success": True, "mode": "physical"}

@app.post("/print/{visit_id}")
def print_receipt(visit_id: str):
    db = get_db()
    try:
        visit = db.execute("SELECT * FROM visits WHERE id = ?", (visit_id,)).fetchone()
        if not visit:
            return {"error": "Visit not found"}
        patient = db.execute("SELECT * FROM patients WHERE id = ?", (visit['patient_id'],)).fetchone()
        if not patient:
            return {"error": "Patient not found"}
        readings = db.execute("SELECT * FROM sensor_readings WHERE visit_id = ?", (visit_id,)).fetchall()
        readings_map = build_readings_map(readings)
        if SIMULATION_MODE:
            print_receipt_simulation(visit, patient, readings_map)
            return {"success": True, "mode": "simulation", "visit_id": visit_id}
        else:
            print_receipt_physical(visit, patient, readings_map)
            return {"success": True, "mode": "physical", "visit_id": visit_id}
    except Exception as e:
        print(f"Print error: {e}")
        return {"error": str(e)}
    finally:
        db.close()

from fastapi import Request

@app.post("/print")
async def print_from_ui(request: Request):
    try:
        body = await request.json()
        patient = body.get("patient", {})
        readings = body.get("readings", {})
        result = body.get("result", {})
        session_id = body.get("session_id", "")

        # Build visit-like object from result
        visit = {
            "id": session_id or "N/A",
            "risk_level": result.get("risk_level", "GREEN"),
            "health_score": result.get("health_score"),
            "ai_summary": result.get("ai_summary") or result.get("summary"),
            "what_to_do": result.get("what_to_do"),
            "doctor_type": result.get("doctor_type"),
            "next_checkup_days": result.get("next_checkup_days"),
        }

        # Build readings map from flat readings object
        readings_map = {
            "hr": readings.get("hr"),
            "spo2": readings.get("spo2"),
            "temperature": readings.get("temperature") or readings.get("temp"),
            "systolic": readings.get("bp_systolic"),
            "diastolic": readings.get("bp_diastolic"),
        }

        if SIMULATION_MODE:
            print_receipt_simulation(visit, patient, readings_map)
            return {"success": True, "mode": "simulation"}
        else:
            print_receipt_physical(visit, patient, readings_map)
            return {"success": True, "mode": "physical"}
    except Exception as e:
        print(f"Print from UI error: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    print(f"PrimeCare Printer service starting... Simulation mode: {SIMULATION_MODE}")
    uvicorn.run(app, host="0.0.0.0", port=8004)
