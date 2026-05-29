import os
import re
import time
import threading
import subprocess
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

CAMERA_RTSP_URL = os.getenv("CAMERA_RTSP_URL", "rtsp://admin:123456@192.168.1.30:554/stream2")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

latest_bp = {
    "systolic": None,
    "diastolic": None,
    "pulse": None,
    "timestamp": None,
    "status": "idle"
}

bp_lock = threading.Lock()

def capture_frame():
    try:
        result = subprocess.run([
            "ffmpeg", "-rtsp_transport", "tcp",
            "-i", CAMERA_RTSP_URL,
            "-frames:v", "1",
            "-f", "image2",
            "-vcodec", "mjpeg",
            "-update", "1",
            "-y", "/tmp/bp_capture.jpg"
        ], capture_output=True, timeout=15)
        if result.returncode == 0:
            return "/tmp/bp_capture.jpg"
        return None
    except Exception as e:
        print(f"Capture error: {e}")
        return None

def capture_best_frame(attempts=5):
    best_path = None
    for i in range(attempts):
        path = capture_frame()
        if path:
            best_path = path
        time.sleep(1)
    return best_path

def preprocess_image(image_path):
    try:
        import cv2
        img = cv2.imread(image_path)
        if img is None:
            return None
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.convertScaleAbs(gray, alpha=1.8, beta=20)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        scaled = cv2.resize(thresh, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        cv2.imwrite("/tmp/bp_processed.jpg", scaled)
        return "/tmp/bp_processed.jpg"
    except Exception as e:
        print(f"Preprocess error: {e}")
        return None

def read_text(image_path):
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(image_path)
        config = "--psm 6 -c tessedit_char_whitelist=0123456789"
        text = pytesseract.image_to_string(img, config=config)
        return text.strip()
    except Exception as e:
        print(f"OCR error: {e}")
        return ""

def parse_bp(text):
    print(f"OCR raw text: '{text}'")
    numbers = re.findall(r'\d+', text)
    print(f"Numbers found: {numbers}")
    valid = [int(n) for n in numbers if 40 <= int(n) <= 280]
    print(f"Valid numbers: {valid}")
    if len(valid) >= 2:
        valid_sorted = sorted(valid, reverse=True)
        systolic = valid_sorted[0]
        diastolic = valid_sorted[1]
        pulse = valid_sorted[2] if len(valid_sorted) >= 3 else None
        return systolic, diastolic, pulse
    return None, None, None

def validate_bp(systolic, diastolic):
    if systolic is None or diastolic is None:
        return False
    return (70 <= systolic <= 220) and (40 <= diastolic <= 130)

def run_ocr_pipeline():
    with bp_lock:
        latest_bp["status"] = "capturing"
    print("Starting OCR pipeline...")
    image_path = capture_best_frame(attempts=5)
    if not image_path:
        with bp_lock:
            latest_bp["status"] = "error"
            latest_bp["error"] = "Failed to capture frame"
        return
    with bp_lock:
        latest_bp["status"] = "processing"
    processed = preprocess_image(image_path)
    if not processed:
        with bp_lock:
            latest_bp["status"] = "error"
            latest_bp["error"] = "Failed to process image"
        return
    text = read_text(processed)
    systolic, diastolic, pulse = parse_bp(text)
    if validate_bp(systolic, diastolic):
        with bp_lock:
            latest_bp["systolic"] = systolic
            latest_bp["diastolic"] = diastolic
            latest_bp["pulse"] = pulse
            latest_bp["timestamp"] = int(time.time())
            latest_bp["status"] = "success"
            latest_bp.pop("error", None)
        print(f"BP reading SUCCESS: {systolic}/{diastolic}, pulse: {pulse}")
    else:
        with bp_lock:
            latest_bp["status"] = "failed"
            latest_bp["error"] = f"Invalid reading: {systolic}/{diastolic}"
        print(f"BP reading FAILED: {systolic}/{diastolic}")

def delayed_ocr(delay_seconds):
    print(f"BP OCR will run in {delay_seconds} seconds...")
    time.sleep(delay_seconds)
    run_ocr_pipeline()

def generate_mjpeg_stream():
    print(f"Starting MJPEG stream from {CAMERA_RTSP_URL}")
    process = subprocess.Popen([
        "ffmpeg", "-rtsp_transport", "tcp",
        "-i", CAMERA_RTSP_URL,
        "-f", "mjpeg",
        "-q:v", "5",
        "-r", "10",
        "pipe:1"
    ], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    
    buffer = b""
    try:
        while True:
            chunk = process.stdout.read(4096)
            if not chunk:
                break
            buffer += chunk
            start = buffer.find(b'\xff\xd8')
            end = buffer.find(b'\xff\xd9')
            if start != -1 and end != -1 and end > start:
                frame = buffer[start:end+2]
                buffer = buffer[end+2:]
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
                )
    finally:
        process.kill()

@app.get("/health")
def health():
    return {"status": "ok", "service": "ocr-service", "camera": CAMERA_RTSP_URL}

@app.get("/ocr/stream")
def stream_camera():
    return StreamingResponse(
        generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.post("/ocr/bp/start")
def start_bp_reading(delay: int = 45):
    with bp_lock:
        latest_bp["status"] = "waiting"
        latest_bp["wait_until"] = int(time.time()) + delay
    thread = threading.Thread(target=delayed_ocr, args=(delay,), daemon=True)
    thread.start()
    return {"success": True, "message": f"BP reading will start in {delay} seconds", "delay": delay}

@app.post("/ocr/bp/now")
def read_bp_now():
    thread = threading.Thread(target=run_ocr_pipeline, daemon=True)
    thread.start()
    return {"success": True, "message": "BP reading started"}

@app.get("/ocr/bp/result")
def get_bp_result():
    with bp_lock:
        return latest_bp.copy()

@app.post("/ocr/bp/manual")
def manual_bp(systolic: int, diastolic: int):
    if not validate_bp(systolic, diastolic):
        return {"error": f"Invalid BP values: {systolic}/{diastolic}"}
    with bp_lock:
        latest_bp["systolic"] = systolic
        latest_bp["diastolic"] = diastolic
        latest_bp["timestamp"] = int(time.time())
        latest_bp["status"] = "manual"
    return {"success": True, "systolic": systolic, "diastolic": diastolic, "source": "manual"}

if __name__ == "__main__":
    print(f"OCR service starting. Camera: {CAMERA_RTSP_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8002)
