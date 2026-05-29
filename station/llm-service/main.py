import os
import json
import asyncio
import httpx
from datetime import datetime
from fastapi import FastAPI
import uvicorn

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_PRIMARY = os.getenv("OPENROUTER_PRIMARY", "meta-llama/llama-3.1-8b-instruct:free")
OPENROUTER_FALLBACK = os.getenv("OPENROUTER_FALLBACK", "meta-llama/llama-3.3-70b-instruct:free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

app = FastAPI()

# ── OpenRouter calls ──────────────────────────────────────────────────────────

async def call_openrouter(messages, model):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    body = {
        "model": model,
        "messages": messages,
        "max_tokens": 1000,
        "temperature": 0.3
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(OPENROUTER_URL, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]

async def call_llm_with_fallback(messages):
    try:
        result = await call_openrouter(messages, OPENROUTER_PRIMARY)
        print(f"[LLM] Primary model succeeded", flush=True)
        return result
    except Exception as e:
        print(f"[LLM] Primary model failed: {e}", flush=True)

    try:
        result = await call_openrouter(messages, OPENROUTER_FALLBACK)
        print(f"[LLM] Fallback model succeeded", flush=True)
        return result
    except Exception as e:
        print(f"[LLM] Fallback model failed: {e}", flush=True)

    return None

# ── Response parsing ──────────────────────────────────────────────────────────

def parse_llm_response(text):
    if not text:
        return None
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    try:
        return json.loads(text)
    except Exception:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end])
            except Exception:
                pass
    return None

# ── Reading extractor — handles both flat and nested formats ──────────────────

def extract_reading(readings, key, default=None):
    """
    Extract a scalar value from readings regardless of format.
    Handles:
      flat:   {"hr": 88}
      nested: {"hr": {"value": 88, "unit": "bpm"}}
      bp:     {"bp": {"systolic": 148, "diastolic": 94}}
    """
    val = readings.get(key, default)
    if isinstance(val, dict):
        # Try common scalar keys
        for k in ("value", "systolic", "diastolic", "score"):
            if k in val:
                return val[k]
        return default
    return val

def flatten_readings(readings):
    """Return a flat dict of scalar values for use in prompts and fallback logic."""
    flat = {}

    # HR
    hr = readings.get("hr")
    if isinstance(hr, dict):
        flat["hr"] = hr.get("value")
    else:
        flat["hr"] = hr

    # SpO2
    spo2 = readings.get("spo2")
    if isinstance(spo2, dict):
        flat["spo2"] = spo2.get("value")
    else:
        flat["spo2"] = spo2

    # Temperature
    temp = readings.get("temp") or readings.get("temperature")
    if isinstance(temp, dict):
        flat["temperature"] = temp.get("value")
    else:
        flat["temperature"] = temp

    # BP — nested object with systolic/diastolic
    bp = readings.get("bp")
    if isinstance(bp, dict):
        flat["bp_systolic"] = bp.get("systolic")
        flat["bp_diastolic"] = bp.get("diastolic")
    else:
        flat["bp_systolic"] = readings.get("bp_systolic")
        flat["bp_diastolic"] = readings.get("bp_diastolic")

    # ECG
    ecg = readings.get("ecg")
    if isinstance(ecg, dict):
        flat["ecg_value"] = ecg.get("value")
    else:
        flat["ecg_value"] = readings.get("ecg_value") or ecg

    # Mood and sleep
    flat["mood"] = extract_reading(readings, "mood")
    flat["sleep_quality"] = readings.get("sleep_quality")

    return flat

# ── Rule-based fallback ───────────────────────────────────────────────────────

def make_fallback_diagnosis(readings):
    flat = flatten_readings(readings)

    bp = flat.get("bp_systolic") or 120
    spo2 = flat.get("spo2") or 98
    hr = flat.get("hr") or 72
    temp = flat.get("temperature") or 36.8

    if bp > 180 or spo2 < 90 or hr > 130 or temp > 39.5:
        level = "RED"
        summary = "Critical readings detected. Immediate medical attention required."
        what_to_do = "Go to the nearest hospital emergency room now. Call 112 if needed."
        doctor_type = "Emergency"
        next_days = 0
        score = 20
    elif bp > 140 or spo2 < 95 or hr > 95 or temp > 37.5:
        level = "YELLOW"
        summary = "Some readings are outside normal range and need attention."
        what_to_do = "Consult a doctor within the next few days. Monitor your readings daily."
        doctor_type = "General Physician"
        next_days = 7
        score = 60
    else:
        level = "GREEN"
        summary = "All readings are within normal range. You appear to be in good health."
        what_to_do = "Continue your current routine. Schedule your next checkup in 30 days."
        doctor_type = None
        next_days = 30
        score = 85

    return {
        "risk_level": level,
        "health_score": score,
        "summary": summary,
        "what_to_do": what_to_do,
        "doctor_type": doctor_type,
        "next_checkup_days": next_days,
        "fallback": True
    }

# ── System prompt builder ─────────────────────────────────────────────────────

def build_system_prompt(patient):
    conditions = patient.get("conditions", "None")
    if isinstance(conditions, str):
        try:
            conditions = json.loads(conditions)
        except Exception:
            pass
    if isinstance(conditions, list):
        conditions = ", ".join(conditions) if conditions else "None"

    medications = patient.get("medications", [])
    if isinstance(medications, list):
        med_names = [m.get("name", "") for m in medications]
        medications_str = ", ".join(med_names) if med_names else "None"
    else:
        medications_str = "None"

    baseline_hr = patient.get("baseline_hr") or "Not established"
    baseline_spo2 = patient.get("baseline_spo2") or "Not established"
    baseline_bp_sys = patient.get("baseline_bp_sys") or "Not established"
    baseline_bp_dia = patient.get("baseline_bp_dia") or "Not established"

    return f"""You are PrimeCare AI, a personal health assistant for home health monitoring.

You have access to this patient's complete health history, personal baselines, medications, and recent trends.

PATIENT CONTEXT:
Name: {patient.get('name', 'Unknown')}
Age: {patient.get('age', 'Unknown')}
Gender: {patient.get('gender', 'Unknown')}
Blood Group: {patient.get('blood_group', 'Unknown')}
Conditions: {conditions}
Medications: {medications_str}
Personal Baselines: HR {baseline_hr} bpm, SpO2 {baseline_spo2}%, BP {baseline_bp_sys}/{baseline_bp_dia} mmHg

RULES:
- Always compare readings to THIS patient's personal baseline, not population averages
- Cross-correlate parameters — never treat readings in isolation
- Plain English only — no medical jargon
- Actionable recommendations — specific, not vague
- Risk levels: GREEN (normal), YELLOW (monitor/consult soon), RED (act now)
- Never guess — if data is insufficient, say so
- Never ask questions

RESPOND IN JSON ONLY. No other text. No markdown."""

# ── Mode 1 — Silent Session Analysis ─────────────────────────────────────────

async def analyze_session(patient, readings, history):
    print(f"[LLM] Mode 1 — Session analysis for patient {patient.get('id', '?')}", flush=True)

    # Flatten readings to scalar values for prompt and fallback
    flat = flatten_readings(readings)
    print(f"[LLM] Flattened readings: {flat}", flush=True)

    system_prompt = build_system_prompt(patient)

    history_summary = ""
    if history:
        recent = history[:5]
        history_lines = []
        for v in recent:
            history_lines.append(
                f"  {v.get('completed_at', 'unknown date')}: "
                f"Risk={v.get('risk_level', '?')} Score={v.get('health_score', '?')}"
            )
        history_summary = "Recent visits:\n" + "\n".join(history_lines)

    user_msg = f"""Analyze this health checkup and provide a complete assessment.

TODAY'S READINGS:
HR: {flat.get('hr', 'N/A')} bpm
SpO2: {flat.get('spo2', 'N/A')}%
Temperature: {flat.get('temperature', 'N/A')}°C
BP: {flat.get('bp_systolic', 'N/A')}/{flat.get('bp_diastolic', 'N/A')} mmHg
ECG: {flat.get('ecg_value', 'N/A')}
Mood score: {flat.get('mood', 'N/A')}/5
Sleep quality: {flat.get('sleep_quality', 'N/A')}

{history_summary}

Respond with this exact JSON structure:
{{
  "risk_level": "GREEN or YELLOW or RED",
  "health_score": 0-100,
  "summary": "2-3 sentence plain English summary of today's health",
  "what_to_do": "specific actionable steps",
  "doctor_type": "type of doctor or null",
  "next_checkup_days": number
}}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg}
    ]

    raw = await call_llm_with_fallback(messages)

    if raw is None:
        print("[LLM] Both models failed — using rule-based fallback", flush=True)
        return make_fallback_diagnosis(readings)

    parsed = parse_llm_response(raw)
    if parsed and "risk_level" in parsed:
        parsed["fallback"] = False
        print(f"[LLM] Session analysis complete: {parsed.get('risk_level')}", flush=True)
        return parsed

    print("[LLM] Parse failed — using rule-based fallback", flush=True)
    return make_fallback_diagnosis(readings)

# ── Mode 2 — Deep History Analysis ───────────────────────────────────────────

async def analyze_history(patient, visits, band_vitals, days):
    print(f"[LLM] Mode 2 — History analysis for {days} days", flush=True)

    system_prompt = build_system_prompt(patient)

    visit_lines = []
    for v in visits[:20]:
        visit_lines.append(
            f"  {v.get('completed_at', '?')}: "
            f"Risk={v.get('risk_level', '?')} "
            f"Score={v.get('health_score', '?')} "
            f"BP={v.get('bp_systolic', '?')}/{v.get('bp_diastolic', '?')} "
            f"HR={v.get('hr', '?')} SpO2={v.get('spo2', '?')}"
        )

    band_lines = []
    for b in band_vitals[:50]:
        band_lines.append(
            f"  {b.get('recorded_at', '?')}: "
            f"HR={b.get('hr', '?')} SpO2={b.get('spo2', '?')} "
            f"Temp={b.get('temperature', '?')} Steps={b.get('steps', '?')}"
        )

    user_msg = f"""Analyze this patient's health trends over the last {days} days.

STATION VISITS:
{chr(10).join(visit_lines) if visit_lines else "No visits in this period"}

BAND VITALS (sample):
{chr(10).join(band_lines) if band_lines else "No band data in this period"}

Look for:
- Trends (improving, declining, stable)
- Correlations between different parameters
- Patterns (time of day, day of week, medication correlation)
- Changes compared to personal baselines

Respond with a narrative paragraph (3-5 sentences) in plain English describing the most important insights and patterns. Be specific with numbers. End with one actionable recommendation."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg}
    ]

    raw = await call_llm_with_fallback(messages)

    if raw is None:
        return {"insight": "Unable to generate analysis at this time. Please try again later.", "fallback": True}

    clean = raw.strip()
    if clean.startswith("```"):
        lines = clean.split("\n")
        clean = "\n".join(lines[1:-1])

    return {"insight": clean, "days": days, "fallback": False}

# ── Mode 3 — Daily Morning Summary ───────────────────────────────────────────

async def generate_daily_summary(patient, band_vitals_24h, last_visit, medication_compliance):
    print(f"[LLM] Mode 3 — Daily summary for patient {patient.get('id', '?')}", flush=True)

    system_prompt = build_system_prompt(patient)

    avg_hr = "N/A"
    avg_spo2 = "N/A"
    avg_temp = "N/A"
    if band_vitals_24h:
        hrs = [b.get("hr") for b in band_vitals_24h if b.get("hr")]
        spo2s = [b.get("spo2") for b in band_vitals_24h if b.get("spo2")]
        temps = [b.get("temperature") for b in band_vitals_24h if b.get("temperature")]
        if hrs:
            avg_hr = round(sum(hrs) / len(hrs), 1)
        if spo2s:
            avg_spo2 = round(sum(spo2s) / len(spo2s), 1)
        if temps:
            avg_temp = round(sum(temps) / len(temps), 1)

    last_visit_str = "No recent checkup"
    if last_visit:
        last_visit_str = (
            f"Last checkup: Risk={last_visit.get('risk_level', '?')} "
            f"Score={last_visit.get('health_score', '?')}/100 "
            f"on {last_visit.get('completed_at', '?')}"
        )

    user_msg = f"""Generate a brief morning health summary for this patient's family.

LAST 24 HOURS BAND DATA:
Average HR: {avg_hr} bpm
Average SpO2: {avg_spo2}%
Average Temperature: {avg_temp}°C
Readings count: {len(band_vitals_24h)}

{last_visit_str}

Medication compliance today: {medication_compliance}%

Write one paragraph (2-3 sentences) in plain English that a family member can read.
Use the patient's name ({patient.get('name', 'the patient')}).
Be warm but factual. Mention if anything needs attention.
Do not use JSON. Just write the paragraph."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_msg}
    ]

    raw = await call_llm_with_fallback(messages)

    if raw is None:
        name = patient.get("name", "Your family member")
        return {
            "summary": f"{name} had a stable night. Average HR {avg_hr} bpm, SpO2 {avg_spo2}%. Please check the app for details.",
            "fallback": True
        }

    clean = raw.strip()
    if clean.startswith("```"):
        lines = clean.split("\n")
        clean = "\n".join(lines[1:-1])

    return {"summary": clean, "fallback": False}

# ── FastAPI endpoints ─────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "llm-service"}

@app.get("/analysis/status")
async def analysis_status():
    try:
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get("https://openrouter.ai/api/v1/models", headers=headers)
            if r.status_code == 200:
                return {"status": "ok", "openrouter": "connected", "primary": OPENROUTER_PRIMARY}
    except Exception as e:
        pass
    return {"status": "degraded", "openrouter": "unreachable", "fallback": "rule-based"}

@app.post("/analysis/session")
async def session_analysis(body: dict):
    patient = body.get("patient", {})
    readings = body.get("readings", {})
    history = body.get("history", [])

    if not patient or not readings:
        return {"error": "patient and readings are required"}

    result = await analyze_session(patient, readings, history)
    return result

@app.post("/analysis/history")
async def history_analysis(body: dict):
    patient = body.get("patient", {})
    visits = body.get("visits", [])
    band_vitals = body.get("band_vitals", [])
    days = body.get("days", 30)

    if not patient:
        return {"error": "patient is required"}

    result = await analyze_history(patient, visits, band_vitals, days)
    return result

@app.post("/analysis/daily-summary")
async def daily_summary(body: dict):
    patient = body.get("patient", {})
    band_vitals_24h = body.get("band_vitals_24h", [])
    last_visit = body.get("last_visit", None)
    medication_compliance = body.get("medication_compliance", 100)

    if not patient:
        return {"error": "patient is required"}

    result = await generate_daily_summary(patient, band_vitals_24h, last_visit, medication_compliance)
    return result

if __name__ == "__main__":
    print("[LLM] PrimeCare LLM Service starting...", flush=True)
    print(f"[LLM] Primary model: {OPENROUTER_PRIMARY}", flush=True)
    print(f"[LLM] Fallback model: {OPENROUTER_FALLBACK}", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=3005)
