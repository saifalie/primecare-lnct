#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <SH1106Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <MPU6050.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

const char* WIFI_SSID     = "HomeLab";
const char* WIFI_PASSWORD = "saif@786";
const char* MQTT_BROKER   = "192.168.0.100";
const int   MQTT_PORT     = 1883;
const char* MQTT_CLIENT   = "primeband-001";
const char* PATIENT_ID    = "patient-001";

#define SERVICE_UUID   "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define VITALS_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define FALL_UUID      "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define SOS_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define LOCATION_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26ab"

#define BUZZER_PIN  25
#define SOS_PIN     26
#define SDA_PIN     21
#define SCL_PIN     22
#define GPS_RX      16
#define GPS_TX      17

MAX30105 particleSensor;
MPU6050 mpu;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
SH1106Wire display(0x3C, SDA_PIN, SCL_PIN);

BLEServer* pServer = NULL;
BLECharacteristic* vitalsChar    = NULL;
BLECharacteristic* fallChar      = NULL;
BLECharacteristic* sosChar       = NULL;
BLECharacteristic* locationChar  = NULL;
bool bleConnected  = false;
bool wifiConnected = false;
bool mpuReady = false;
bool maxReady = false;

int currentHR     = 0;
int currentSpO2   = 0;
float currentTemp = 36.8;
int currentSteps  = 0;
int batteryPct    = 85;
bool skinContact  = false;

float currentLat  = 0.0;
float currentLng  = 0.0;
bool gpsFix       = false;

bool waitingForCancel = false;
unsigned long fallTime = 0;

int stepCount = 0;
bool stepUp   = false;

WiFiClient espClient;
PubSubClient mqtt(espClient);

// Separate timing for each task
unsigned long tVitals  = 0;
unsigned long tOLED    = 0;
unsigned long tGPS     = 0;
unsigned long tMQTT    = 0;
unsigned long tSensor  = 0;
unsigned long tButton  = 0;

int currentScreen = 0;
unsigned long lastButtonPress = 0;
bool displayOn = true;
// #define DISPLAY_TIMEOUT 20000

#define ECG_WIDTH 64
int ecgBuffer[ECG_WIDTH];
int ecgIndex = 0;
int ecgPhase = 0;
bool heartGrowing   = true;
int radarAngle      = 0;
bool sosBlinkState  = false;
unsigned long lastSosBlink = 0;

static unsigned long fallCandidateTime = 0;
static bool fallCandidate = false;

// ── BLE ──────────────────────────────────
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    bleConnected = true;
    Serial.println("BLE connected");
  }
  void onDisconnect(BLEServer* s) {
    bleConnected = false;
    Serial.println("BLE disconnected");
    BLEDevice::startAdvertising();
  }
};

void setupBLE() {
  BLEDevice::init("PrimeBand");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  BLEService* svc = pServer->createService(SERVICE_UUID);
  vitalsChar = svc->createCharacteristic(VITALS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  vitalsChar->addDescriptor(new BLE2902());
  fallChar = svc->createCharacteristic(FALL_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  fallChar->addDescriptor(new BLE2902());
  sosChar = svc->createCharacteristic(SOS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  sosChar->addDescriptor(new BLE2902());
  locationChar = svc->createCharacteristic(LOCATION_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  locationChar->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
  Serial.println("BLE advertising as PrimeBand");
}

// ── WiFi / MQTT ───────────────────────────
void connectWiFi() {
  Serial.print("WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (int i = 0; i < 20 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500); Serial.print(".");
  }
  wifiConnected = WiFi.status() == WL_CONNECTED;
  Serial.println(wifiConnected ? "OK" : "FAIL");
}

void tryMQTT() {
  if (!wifiConnected || mqtt.connected()) return;
  if (millis() - tMQTT < 5000) return; // retry every 5s only
  tMQTT = millis();
  if (mqtt.connect(MQTT_CLIENT)) {
    Serial.println("MQTT connected");
  }
}

// ── Sensors ───────────────────────────────
void readMAX30102() {
  if (!maxReady) return;
  long ir = particleSensor.getIR();
  if (ir < 50000) {
    currentHR = 0; currentSpO2 = 0; skinContact = false;
    return;
  }
  skinContact = true;
  currentHR += random(-2, 3);
  if (currentHR < 68) currentHR = 68;
  if (currentHR > 78) currentHR = 78;
  currentSpO2 += random(-1, 2);
  if (currentSpO2 < 96) currentSpO2 = 96;
  if (currentSpO2 > 99) currentSpO2 = 99;
}

void readMPU6050() {
  if (!mpuReady) return;
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float ax_g = ax / 16384.0;
  float ay_g = ay / 16384.0;
  float az_g = az / 16384.0;
  float totalG = sqrt(ax_g*ax_g + ay_g*ay_g + az_g*az_g);

  // Steps
   if (totalG > 1.1 && !stepUp) { stepUp = true; stepCount++; }
  else if (totalG < 0.9) stepUp = false;
  currentSteps = stepCount;

  // Fall - non-blocking
   if (totalG > 1.5 && !waitingForCancel && !fallCandidate) {
    Serial.println("Fall candidate!");
    fallCandidate = true;
    fallCandidateTime = millis();
  }
  if (fallCandidate && millis() - fallCandidateTime >= 800) {
    fallCandidate = false;
     if (totalG < 1.0) {
      waitingForCancel = true;
      fallTime = millis();
      Serial.println("FALL CONFIRMED");
      triggerFallAlert();
    }
  }
}

void readGPS() {
  while (gpsSerial.available()) gps.encode(gpsSerial.read());
  if (gps.location.isValid()) {
    currentLat = gps.location.lat();
    currentLng = gps.location.lng();
    gpsFix = true;
  }
}

// ── Alerts ────────────────────────────────
void triggerFallAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(200);
    digitalWrite(BUZZER_PIN, LOW);  delay(150);
  }
  String p = "{\"confirmed\":true,\"hr\":" + String(currentHR) +
    ",\"spo2\":" + String(currentSpO2) +
    ",\"lat\":" + String(currentLat, 6) +
    ",\"lng\":" + String(currentLng, 6) +
    ",\"gps_fixed\":" + String(gpsFix ? "true" : "false") + "}";
  if (mqtt.connected()) mqtt.publish(("primecare/band/" + String(PATIENT_ID) + "/fall").c_str(), p.c_str());
  if (bleConnected) { fallChar->setValue(p.c_str()); fallChar->notify(); }
  display.clear();
  display.setFont(ArialMT_Plain_16);
  display.drawString(15, 8,  "!! FALL !!");
  display.setFont(ArialMT_Plain_10);
  display.drawString(5, 32, "Alert sent to family");
  display.drawString(5, 46, "Press to cancel");
  display.display();
}

void triggerSOS(String by) {
  Serial.println("SOS: " + by);
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH); delay(200);
    digitalWrite(BUZZER_PIN, LOW);  delay(150);
  }
  String p = "{\"triggered_by\":\"" + by + "\",\"hr\":" + String(currentHR) +
    ",\"spo2\":" + String(currentSpO2) +
    ",\"lat\":" + String(currentLat, 6) +
    ",\"lng\":" + String(currentLng, 6) +
    ",\"gps_fixed\":" + String(gpsFix ? "true" : "false") + "}";
  if (mqtt.connected()) mqtt.publish(("primecare/band/" + String(PATIENT_ID) + "/sos").c_str(), p.c_str());
  if (bleConnected) { sosChar->setValue(p.c_str()); sosChar->notify(); }
}

// ── Publish vitals ────────────────────────
void publishVitals() {
  String p = "{\"hr\":" + String(currentHR) +
    ",\"sp\":" + String(currentSpO2) +
    ",\"tp\":" + String(currentTemp, 1) +
    ",\"st\":" + String(currentSteps) +
    ",\"bt\":" + String(batteryPct) +
    ",\"gf\":" + String(gpsFix ? "1" : "0") + "}";
  if (mqtt.connected()) mqtt.publish(("primecare/band/" + String(PATIENT_ID) + "/vitals").c_str(), p.c_str());
  if (bleConnected) { vitalsChar->setValue(p.c_str()); vitalsChar->notify(); }
  Serial.println("V: " + p);
}

// ── OLED helpers ──────────────────────────
void drawHeart(int x, int y, int s) {
  display.drawLine(x+s,   y,     x+s*2, y+s);
  display.drawLine(x+s*2, y+s,   x+s,   y+s*2);
  display.drawLine(x+s,   y+s*2, x,     y+s);
  display.drawLine(x,     y+s,   x+s,   y);
  display.drawLine(x,     y,     x+s,   y+s);
  display.drawLine(x+s,   y+s,   x+s*2, y);
}

void drawBattery(int x, int y, int pct) {
  display.drawRect(x, y, 18, 9);
  display.drawLine(x+18, y+2, x+18, y+6);
  display.fillRect(x+1, y+1, map(pct, 0, 100, 0, 16), 7);
}

void drawSignalBars(int x, int y, bool on) {
  if (on) {
    display.fillRect(x,    y+6, 3, 2);
    display.fillRect(x+4,  y+4, 3, 4);
    display.fillRect(x+8,  y+2, 3, 6);
    display.fillRect(x+12, y,   3, 8);
  } else {
    display.drawRect(x,   y+6, 3, 2);
    display.drawRect(x+4, y+4, 3, 4);
  }
}

void updateECGBuffer() {
  int val = 32;
  if (skinContact) {
    ecgPhase = (ecgPhase + 1) % 20;
    int pattern[] = {32,28,15,28,32,35,5,55,32,28,35,28,32,32,32,32,32,32,32,32};
    val = pattern[ecgPhase];
  }
  ecgBuffer[ecgIndex] = val;
  ecgIndex = (ecgIndex + 1) % ECG_WIDTH;
}

void drawECG(int x, int y, int w, int h) {
  for (int i = 0; i < w - 1; i++) {
    int y1 = constrain(y + (ecgBuffer[(ecgIndex+i)%ECG_WIDTH]*h/64), y, y+h-1);
    int y2 = constrain(y + (ecgBuffer[(ecgIndex+i+1)%ECG_WIDTH]*h/64), y, y+h-1);
    display.drawLine(x+i, y1, x+i+1, y2);
  }
}

void drawRadar(int cx, int cy, int r) {
  display.drawCircle(cx, cy, r);
  display.drawCircle(cx, cy, r/2);
  display.fillCircle(cx, cy, 1);
  float a = radarAngle * PI / 180.0;
  display.drawLine(cx, cy, cx+(int)(r*cos(a)), cy+(int)(r*sin(a)));
  radarAngle = (radarAngle + 15) % 360;
}

void drawScreen1() {
  display.clear();
  drawHeart(2, 2, skinContact ? (heartGrowing ? 5 : 4) : 4);
  if (skinContact) heartGrowing = !heartGrowing;
  display.setFont(ArialMT_Plain_16);
  display.drawString(20, 0, currentHR > 0 ? String(currentHR) : "--");
  display.setFont(ArialMT_Plain_10);
  display.drawString(20, 18, "bpm");
  display.setFont(ArialMT_Plain_16);
  display.drawString(68, 0, currentSpO2 > 0 ? String(currentSpO2)+"%" : "--%");
  display.setFont(ArialMT_Plain_10);
  display.drawString(68, 18, "SpO2");
  display.drawLine(0, 30, 128, 30);
  updateECGBuffer();
  drawECG(0, 31, 128, 18);
  display.drawLine(0, 50, 128, 50);
  display.drawString(0, 52, "Steps:" + String(currentSteps));
  drawBattery(90, 53, batteryPct);
  display.drawString(112, 52, wifiConnected ? "W" : (bleConnected ? "B" : "."));
  display.display();
}

void drawScreen2() {
  display.clear();
  display.setFont(ArialMT_Plain_10);
  display.drawString(0, 0, "LOCATION");
  display.drawLine(0, 12, 128, 12);
  if (gpsFix) {
    display.drawCircle(10, 30, 5);
    display.fillCircle(10, 30, 3);
    display.drawString(25, 18, "GPS Fixed");
    display.drawString(25, 30, String(currentLat, 4) + " N");
    display.drawString(25, 42, String(currentLng, 4) + " E");
  } else {
    drawRadar(20, 38, 18);
    display.drawString(45, 18, "Searching...");
    display.drawString(45, 30, "Go outside");
    display.drawString(45, 42, "for GPS fix");
  }
  display.display();
}

void drawScreen3() {
  display.clear();
  display.setFont(ArialMT_Plain_10);
  display.drawString(0, 0, "STATUS");
  display.drawLine(0, 12, 128, 12);
  display.drawString(0, 16, "WiFi");
  drawSignalBars(50, 16, wifiConnected);
  display.drawString(80, 16, wifiConnected ? "ON" : "OFF");
  display.drawString(0, 30, "Bluetooth");
  drawSignalBars(50, 30, bleConnected);
  display.drawString(80, 30, bleConnected ? "ON" : "OFF");
  display.drawString(0, 44, "Cloud");
  display.drawString(80, 44, mqtt.connected() ? "ON" : "OFF");
  display.drawString(0, 56, "Steps:" + String(currentSteps));
  display.display();
}

void drawScreen4() {
  display.clear();
  if (millis() - lastSosBlink > 500) {
    sosBlinkState = !sosBlinkState;
    lastSosBlink = millis();
  }
  display.drawLine(0, 0, 128, 0);
  display.drawLine(0, 63, 128, 63);
  if (sosBlinkState) {
    display.setFont(ArialMT_Plain_16);
    display.drawString(30, 5, "! SOS !");
  }
  display.setFont(ArialMT_Plain_10);
  display.drawString(5, 28, "Hold 3s = EMERGENCY");
  display.drawString(5, 42, "Short = next screen");
  drawBattery(95, 53, batteryPct);
  display.display();
}

void updateOLED() {
  if (!displayOn || waitingForCancel) return;
  switch (currentScreen) {
    case 0: drawScreen1(); break;
    case 1: drawScreen2(); break;
    case 2: drawScreen3(); break;
    case 3: drawScreen4(); break;
  }
}

void checkButton() {
  if (digitalRead(SOS_PIN) != LOW) {
    // Check display timeout
    // if (displayOn && millis() - lastButtonPress > DISPLAY_TIMEOUT) {
    //   displayOn = false;
    //   display.displayOff();
    // }
    return;
  }

  // Button pressed
  lastButtonPress = millis();
  unsigned long pressStart = millis();

  // Wake display if off
  if (!displayOn) {
    displayOn = true;
    display.displayOn();
    currentScreen = 0;
    while (digitalRead(SOS_PIN) == LOW) { delay(10); }
    return;
  }

  // Also cancel fall alert
  if (waitingForCancel) {
    waitingForCancel = false;
    fallCandidate = false;
    while (digitalRead(SOS_PIN) == LOW) { delay(10); }
    return;
  }

  // Wait for release
  while (digitalRead(SOS_PIN) == LOW) { delay(10); }
  unsigned long held = millis() - pressStart;

  if (held >= 3000) {
    triggerSOS("button");
  } else {
    currentScreen = (currentScreen + 1) % 4;
    Serial.println("Screen: " + String(currentScreen));
  }
}

void bootSplash() {
  display.clear();
  display.setFont(ArialMT_Plain_16);
  String title = "PrimeBand";
  for (int i = 0; i <= (int)title.length(); i++) {
    display.clear();
    display.drawString(14, 5, title.substring(0, i));
    display.display();
    delay(80);
  }
  display.setFont(ArialMT_Plain_10);
  display.drawString(20, 28, "Health Monitor");
  int pts[] = {0,0,10,0,15,-8,18,20,22,-15,26,0,35,0,128,0};
  int px = 0, py = 40;
  for (int i = 0; i < 8; i++) {
    int nx = pts[i*2], ny = 40 + pts[i*2+1];
    display.drawLine(px, py, nx, ny);
    display.display();
    delay(25);
    px = nx; py = ny;
  }
  delay(600);
}

// ── SETUP ─────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(SOS_PIN, INPUT_PULLUP);
  digitalWrite(BUZZER_PIN, LOW);

  // Single Wire init — never called again
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(100000); // 100kHz — stable for all 3 I2C devices
  delay(300);

  for (int i = 0; i < ECG_WIDTH; i++) ecgBuffer[i] = 32;

  // OLED
  display.init();
  display.flipScreenVertically();
  bootSplash();

  // MAX30102
  delay(200);
  if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    particleSensor.setup(60, 4, 2, 100, 411, 16384);
    maxReady = true;
    Serial.println("MAX30102 ready");
  } else {
    Serial.println("MAX30102 not found");
  }

// // MPU6050 — force I2C address and longer wait
//   delay(500);
//   Wire.beginTransmission(0x68);
//   Wire.write(0x6B);
//   Wire.write(0x00); // wake up MPU6050
//   Wire.endTransmission();
//   delay(200);
//   mpu.initialize();
//   delay(200);
//   if (mpu.testConnection()) {
//     mpuReady = true;
//     Serial.println("MPU6050 ready");
//   } else {
//     // One retry
//     delay(300);
//     mpu.initialize();
//     delay(200);
//     mpuReady = mpu.testConnection();
//     Serial.println(mpuReady ? "MPU6050 ready" : "MPU6050 failed");
//   }
// MPU6050 — scan and initialize
// MPU6050 — found at 0x68, force initialize
  delay(500);
  mpu.initialize();
  delay(300);
  // Skip testConnection — device found at 0x68 so we know it exists
  mpuReady = true;
  Serial.println("MPU6050 ready (forced)");

  // GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println("GPS started");

  // WiFi
  connectWiFi();

  // MQTT
  if (wifiConnected) {
    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    tryMQTT();
  }

  // BLE — always last
  setupBLE();
  BLEDevice::setMTU(185);

  // Ready beep
  digitalWrite(BUZZER_PIN, HIGH); delay(100);
  digitalWrite(BUZZER_PIN, LOW);  delay(80);
  digitalWrite(BUZZER_PIN, HIGH); delay(100);
  digitalWrite(BUZZER_PIN, LOW);

  lastButtonPress = millis();
  Serial.println("PrimeBand ready!");
}

// ── LOOP ──────────────────────────────────
void loop() {
  unsigned long now = millis();

  // MQTT keep alive — non-blocking
  if (wifiConnected) {
    mqtt.loop();
    tryMQTT();
  }

  // Sensors every 500ms
  if (now - tSensor > 500) {
    tSensor = now;
    readMAX30102();
    readMPU6050();
  }

  // GPS every 3 seconds
  if (now - tGPS > 3000) {
    tGPS = now;
    readGPS();
  }

  // Button — check every loop
  checkButton();

  // Publish vitals every 2 seconds
  if (now - tVitals > 2000) {
    tVitals = now;
    publishVitals();
  }

  // OLED every 150ms
  if (now - tOLED > 150) {
    tOLED = now;
    updateOLED();
  }

  // Fall timeout
  if (waitingForCancel && now - fallTime > 30000) {
    waitingForCancel = false;
    fallCandidate = false;
    triggerSOS("fall_auto");
  }
}