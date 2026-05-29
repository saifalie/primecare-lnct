/*
 * GRAMAI — ESP32 Sensor Hub Firmware v1.0
 *
 * Reads: MLX90614 (temperature), MAX30102 (HR + SpO2),
 *        AD8232 (ECG), HC-SR04 (height), Microwave Radar (presence)
 * Publishes: JSON to MQTT every 1 second
 *
 * Wiring:
 *   MLX90614  SDA → GPIO21, SCL → GPIO22, VCC → 3.3V, GND → GND
 *   MAX30102  SDA → GPIO21, SCL → GPIO22, VCC → 3.3V, GND → GND
 *   AD8232    OUT → GPIO34, LO+ → GPIO32, LO- → GPIO33, VCC → 3.3V, GND → GND
 *   HC-SR04   TRIG → GPIO25, ECHO → GPIO26, VCC → 5V, GND → GND
 *   RADAR     OUT → GPIO27, VCC → 5V, GND → GND
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include "MAX30105.h"
#include "heartRate.h"

// ===== CONFIGURATION =====
const char *WIFI_SSID     = "HomeLab";
const char *WIFI_PASSWORD = "saif@786";
const char *MQTT_BROKER   = "192.168.0.100";
const int   MQTT_PORT     = 1883;
const char *MQTT_CLIENT   = "gramai-esp32";
const char *TOPIC_SENSORS = "gramai/sensors/all";
const char *TOPIC_HEALTH  = "gramai/health/sensors";

// ===== SENSOR MOUNT HEIGHT =====
const float SENSOR_MOUNT_HEIGHT_CM = 220.0;

// ===== PIN DEFINITIONS =====
#define HCSR04_TRIG  25
#define HCSR04_ECHO  26
#define RADAR_PIN    27
#define ECG_OUT      34
#define ECG_LO_PLUS  32
#define ECG_LO_MINUS 33

// ===== OBJECTS =====
Adafruit_MLX90614 mlx;
MAX30105 particleSensor;
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// ===== SENSOR STATE =====
bool mlxOK    = false;
bool maxOK    = false;
bool ad8232OK = true;
bool hcsrOK   = true;
bool radarOK  = true;

// ===== HR CALCULATION =====
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// ===== TIMING =====
const unsigned long SENSOR_INTERVAL = 1000;
const unsigned long HEALTH_INTERVAL = 3000;
unsigned long lastSensorTime = 0;
unsigned long lastHealthTime = 0;

// ===== WIFI =====
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println(" FAILED — will retry");
  }
}

// ===== MQTT =====
void connectMQTT() {
  if (mqtt.connected()) return;
  Serial.print("Connecting to MQTT...");
  if (mqtt.connect(MQTT_CLIENT)) {
    Serial.println(" connected!");
  } else {
    Serial.print(" failed rc=");
    Serial.println(mqtt.state());
  }
}

// ===== HC-SR04 HEIGHT =====
float readHeight() {
  digitalWrite(HCSR04_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(HCSR04_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(HCSR04_TRIG, LOW);
  long duration = pulseIn(HCSR04_ECHO, HIGH, 30000);
  if (duration == 0) return -1;
  float distance_cm = duration * 0.034 / 2.0;
  float height_cm = SENSOR_MOUNT_HEIGHT_CM - distance_cm;
  if (height_cm < 100 || height_cm > 220) return -1;
  return height_cm;
}

// ===== MLX90614 TEMPERATURE =====
float readTemperature() {
  if (!mlxOK) return -1;
  float temp = mlx.readObjectTempC();
  if (temp < 30 || temp > 45) return -1;
  return temp;
}

// ===== MAX30102 HR + SPO2 =====
void updateHR() {
  if (!maxOK) return;
  long irValue = particleSensor.getIR();
  if (irValue < 50000) {
    beatsPerMinute = 0;
    beatAvg = 0;
    return;
  }
  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);
    if (beatsPerMinute > 40 && beatsPerMinute < 200) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=============================");
  Serial.println("  GRAMAI Sensor Hub v1.0");
  Serial.println("=============================");

  // Pin setup
  pinMode(HCSR04_TRIG, OUTPUT);
  pinMode(HCSR04_ECHO, INPUT);
  pinMode(RADAR_PIN, INPUT);
  pinMode(ECG_LO_PLUS, INPUT);
  pinMode(ECG_LO_MINUS, INPUT);

  // MLX90614
  Wire.begin(21, 22);
  if (mlx.begin()) {
    mlxOK = true;
    Serial.println("MLX90614: OK");
  } else {
    Serial.println("MLX90614: FAILED");
  }

  // MAX30102
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    maxOK = true;
    Serial.println("MAX30102: OK");
  } else {
    Serial.println("MAX30102: FAILED (check 3V3 solder jumper)");
  }

  connectWiFi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  connectMQTT();

  Serial.println("Setup complete.\n");
}

// ===== MAIN LOOP =====
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 5000) { lastRetry = millis(); connectMQTT(); }
  }
  mqtt.loop();

  updateHR();

  unsigned long now = millis();

  if (now - lastSensorTime >= SENSOR_INTERVAL) {
    lastSensorTime = now;

    // Read all sensors
    float temperature = readTemperature();
    float height_cm   = readHeight();
    bool  radar       = digitalRead(RADAR_PIN) == HIGH;
    bool  leadsOn     = (digitalRead(ECG_LO_PLUS) == LOW && digitalRead(ECG_LO_MINUS) == LOW);
    int   ecgValue    = leadsOn ? analogRead(ECG_OUT) : 0;
    long  irValue     = maxOK ? particleSensor.getIR() : 0;
    bool  fingerOn    = irValue > 50000;

    // SpO2 simple estimate
    float spo2 = 0;
    if (fingerOn && maxOK) {
      long redValue = particleSensor.getRed();
      if (redValue > 0 && irValue > 0) {
        float ratio = (float)redValue / (float)irValue;
        spo2 = 110.0 - 25.0 * ratio;
        if (spo2 > 100) spo2 = 100;
        if (spo2 < 85)  spo2 = 85;
      }
    }

    // Build JSON
    String json = "{";
    json += "\"timestamp\":"   + String(millis() / 1000) + ",";
    json += "\"temperature\":" + (temperature > 0 ? String(temperature, 1) : "null") + ",";
    json += "\"hr\":"          + String(beatAvg) + ",";
    json += "\"spo2\":"        + (fingerOn ? String(spo2, 1) : "null") + ",";
    json += "\"finger_detected\":" + String(fingerOn ? "true" : "false") + ",";
    json += "\"ecg_value\":"   + String(ecgValue) + ",";
    json += "\"leads_connected\":" + String(leadsOn ? "true" : "false") + ",";
    json += "\"height_cm\":"   + (height_cm > 0 ? String(height_cm, 1) : "null") + ",";
    json += "\"radar_presence\":" + String(radar ? "true" : "false") + ",";
    json += "\"health\":{";
    json += "\"mlx90614\":"  + String(mlxOK  ? "true" : "false") + ",";
    json += "\"max30102\":"  + String(maxOK  ? "true" : "false") + ",";
    json += "\"ad8232\":true,";
    json += "\"hcsr04\":true,";
    json += "\"radar\":true";
    json += "}}";

    if (mqtt.publish(TOPIC_SENSORS, json.c_str())) {
      Serial.println("Published: " + json);
    } else {
      Serial.println("Publish FAILED");
    }
  }

  if (now - lastHealthTime >= HEALTH_INTERVAL) {
    lastHealthTime = now;
    String h = "{\"node\":\"esp32\",\"status\":\"online\",\"uptime\":" + String(millis()/1000) + "}";
    mqtt.publish(TOPIC_HEALTH, h.c_str());
  }
}