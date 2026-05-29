#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "DHT.h"

const char *WIFI_SSID     = "HomeLab";
const char *WIFI_PASSWORD = "saif@786";
const char *MQTT_BROKER   = "192.168.0.100";
const int   MQTT_PORT     = 1883;
const char *MQTT_CLIENT   = "primecare-esp32";
const char *TOPIC_SENSORS = "primecare/sensors/all";
const char *TOPIC_HEALTH  = "primecare/health/sensors";

const float SENSOR_MOUNT_HEIGHT_CM = 220.0;

#define HCSR04_TRIG  25
#define HCSR04_ECHO  26
#define ECG_OUT      34
#define ECG_LO_PLUS  32
#define ECG_LO_MINUS 35
#define DHT_PIN      27
#define DHT_TYPE     DHT22

Adafruit_MLX90614 mlx;
MAX30105 particleSensor;
DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool mlxOK = false;
bool maxOK = false;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

const int SPO2_BUFFER = 50;
long redBuffer[SPO2_BUFFER];
long irBuffer[SPO2_BUFFER];
int bufferIndex = 0;
float spo2Value = 0;
bool spo2Valid = false;

const unsigned long SENSOR_INTERVAL = 1000;
const unsigned long HEALTH_INTERVAL = 3000;
unsigned long lastSensorTime = 0;
unsigned long lastHealthTime = 0;

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
    Serial.println(" FAILED");
  }
}

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
  if (height_cm < 50 || height_cm > 220) return -1;
  return height_cm;
}

void updateMAX30102() {
  if (!maxOK) return;
  long irValue  = particleSensor.getIR();
  long redValue = particleSensor.getRed();

  if (irValue < 50000) {
    beatsPerMinute = 0;
    beatAvg = 0;
    spo2Valid = false;
    spo2Value = 0;
    bufferIndex = 0;
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

  redBuffer[bufferIndex] = redValue;
  irBuffer[bufferIndex]  = irValue;
  bufferIndex++;

  if (bufferIndex >= SPO2_BUFFER) {
    bufferIndex = 0;
    long redDC = 0, irDC = 0;
    for (int i = 0; i < SPO2_BUFFER; i++) {
      redDC += redBuffer[i];
      irDC  += irBuffer[i];
    }
    redDC /= SPO2_BUFFER;
    irDC  /= SPO2_BUFFER;

    long redAC = 0, irAC = 0;
    for (int i = 0; i < SPO2_BUFFER; i++) {
      redAC += abs(redBuffer[i] - redDC);
      irAC  += abs(irBuffer[i]  - irDC);
    }

    if (irAC > 0 && irDC > 0 && redDC > 0) {
      float R = ((float)redAC / (float)redDC) / ((float)irAC / (float)irDC);
      float spo2calc = 104.0 - 17.0 * R;
      if (spo2calc >= 85 && spo2calc <= 100) {
        spo2Value = spo2calc;
        spo2Valid = true;
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(2000);
  Serial.println("\n=============================");
  Serial.println("  PrimeCare Sensor Hub v1.0");
  Serial.println("=============================");

  pinMode(HCSR04_TRIG, OUTPUT);
  pinMode(HCSR04_ECHO, INPUT);
  pinMode(ECG_LO_PLUS, INPUT);
  pinMode(ECG_LO_MINUS, INPUT);

  dht.begin();
  Serial.println("DHT22: OK");

  pinMode(21, OUTPUT); pinMode(22, OUTPUT);
  for (int i = 0; i < 9; i++) {
    digitalWrite(22, HIGH); delayMicroseconds(5);
    digitalWrite(22, LOW);  delayMicroseconds(5);
  }
  digitalWrite(21, LOW); delayMicroseconds(5);
  digitalWrite(21, HIGH); delayMicroseconds(5);
  pinMode(21, INPUT); pinMode(22, INPUT);
  delay(500);

  Wire.begin(21, 22, 100000);
  delay(2000);

  if (mlx.begin()) {
    mlxOK = true;
    Serial.println("MLX90614: OK");
  } else {
    Serial.println("MLX90614: FAILED");
  }

  delay(500);

  Wire.begin(21, 22, 100000);
  delay(500);

  if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x1F);
    particleSensor.setPulseAmplitudeIR(0x1F);
    particleSensor.setPulseAmplitudeGreen(0);
    maxOK = true;
    Serial.println("MAX30102: OK");
  } else {
    Serial.println("MAX30102: FAILED");
  }

  connectWiFi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  connectMQTT();

  Serial.println("Setup complete.\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 5000) { lastRetry = millis(); connectMQTT(); }
  }
  mqtt.loop();
  updateMAX30102();

  unsigned long now = millis();

  if (now - lastSensorTime >= SENSOR_INTERVAL) {
    lastSensorTime = now;

    float temperature = -1;
    if (mlxOK) {
      float raw = mlx.readObjectTempC();
      Serial.print("MLX RAW: ");
      Serial.println(raw);
      temperature = raw;
    }

    float roomTemp  = dht.readTemperature();
    float humidity  = dht.readHumidity();
    float height_cm = readHeight();
    bool  leadsOn   = (digitalRead(ECG_LO_PLUS) == LOW && digitalRead(ECG_LO_MINUS) == LOW);
    int   ecgValue  = leadsOn ? analogRead(ECG_OUT) : 0;
    long  irValue   = maxOK ? particleSensor.getIR() : 0;
    bool  fingerOn  = irValue > 50000;

    String json = "{";
    json += "\"timestamp\":"       + String(millis() / 1000) + ",";
    json += "\"temperature\":"     + (temperature > 0 ? String(temperature, 1) : "null") + ",";
    json += "\"room_temp\":"       + (isnan(roomTemp) ? "null" : String(roomTemp, 1)) + ",";
    json += "\"humidity\":"        + (isnan(humidity) ? "null" : String(humidity, 1)) + ",";
    json += "\"hr\":"              + String(beatAvg) + ",";
    json += "\"spo2\":"            + (spo2Valid ? String(spo2Value, 1) : "null") + ",";
    json += "\"finger_detected\":" + String(fingerOn ? "true" : "false") + ",";
    json += "\"ecg_value\":"       + String(ecgValue) + ",";
    json += "\"leads_connected\":" + String(leadsOn ? "true" : "false") + ",";
    json += "\"height_cm\":"       + (height_cm > 0 ? String(height_cm, 1) : "null") + ",";
    json += "\"health\":{";
    json += "\"mlx90614\":"  + String(mlxOK ? "true" : "false") + ",";
    json += "\"max30102\":"  + String(maxOK ? "true" : "false") + ",";
    json += "\"dht22\":true,";
    json += "\"ad8232\":true,";
    json += "\"hcsr04\":true";
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
