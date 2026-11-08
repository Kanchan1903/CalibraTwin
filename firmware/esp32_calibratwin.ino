/*
  CalibraTwin - ESP32 Firmware Example
  Intelligent IoT Sensor Monitoring, Drift Detection & Self-Calibration
  
  Hardware connections:
  - BMP280 / BME280 (Digital Sensor, I2C): SDA=GPIO21, SCL=GPIO22
  - Analog Piezoresistive Pressure Transducer: ADC1 (GPIO34)
  - Status LED: GPIO2 (Built-in)
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BMP280.h>

// Configuration & Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* MQTT_BROKER = "your-broker.hivemq.cloud";
const int   MQTT_PORT   = 8883; // TLS
const char* MQTT_USER   = "calibratwin_device";
const char* MQTT_PASS   = "your_secure_password";

const char* DEVICE_ID   = "CALIBRA-ESP32-001";

// Topics
char TELEMETRY_TOPIC[64];
char STATUS_TOPIC[64];
char CALIBRATION_SUB_TOPIC[64];

WiFiClientSecure netClient;
PubSubClient mqttClient(netClient);
Adafruit_BMP280 bmp;

// Calibration parameters in device memory
float offset_correction_kpa = 0.0;
float gain_multiplier = 1.0;

// Analog pin
const int ANALOG_PRESSURE_PIN = 34;

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("]: ");
  
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.println("Failed to parse JSON calibration payload");
    return;
  }
  
  // Handle bounded self-calibration update
  if (strstr(topic, "/calibration")) {
    float new_offset = doc["offset_correction"] | offset_correction_kpa;
    float new_gain = doc["gain_multiplier"] | gain_multiplier;
    
    // Firmware safety check: max clamp +/- 5.0 kPa offset
    if (new_offset >= -5.0 && new_offset <= 5.0) {
      offset_correction_kpa = new_offset;
      gain_multiplier = new_gain;
      Serial.printf("Updated local calibration! Offset: %.3f, Gain: %.4f\n", offset_correction_kpa, gain_multiplier);
      
      // Publish confirmation
      StaticJsonDocument<128> ack;
      ack["device_id"] = DEVICE_ID;
      ack["status"] = "CALIBRATION_APPLIED";
      ack["offset"] = offset_correction_kpa;
      ack["gain"] = gain_multiplier;
      char ackBuf[128];
      serializeJson(ack, ackBuf);
      mqttClient.publish(STATUS_TOPIC, ackBuf);
    } else {
      Serial.println("REJECTED: Calibration offset outside safety bounds!");
    }
  }
}

void connectMQTT() {
  snprintf(TELEMETRY_TOPIC, sizeof(TELEMETRY_TOPIC), "calibratwin/devices/%s/telemetry", DEVICE_ID);
  snprintf(STATUS_TOPIC, sizeof(STATUS_TOPIC), "calibratwin/devices/%s/status", DEVICE_ID);
  snprintf(CALIBRATION_SUB_TOPIC, sizeof(CALIBRATION_SUB_TOPIC), "calibratwin/devices/%s/calibration", DEVICE_ID);

  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection to: ");
    Serial.println(MQTT_BROKER);
    
    // In production, configure Root CA certificate:
    // netClient.setCACert(root_ca);
    netClient.setInsecure(); // For testing with TLS brokers if CA not baked
    
    if (mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASS, STATUS_TOPIC, 1, true, "{\"status\":\"OFFLINE\"}")) {
      Serial.println("MQTT Connected!");
      mqttClient.publish(STATUS_TOPIC, "{\"status\":\"ONLINE\"}", true);
      mqttClient.subscribe(CALIBRATION_SUB_TOPIC);
    } else {
      Serial.print("Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
  digitalWrite(2, HIGH);
  
  if (!bmp.begin(0x76)) {
    Serial.println("Could not find a valid BMP280 sensor, check wiring!");
  }
  
  connectWiFi();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

unsigned long lastSend = 0;
const long interval = 5000; // 5 seconds

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) connectMQTT();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastSend >= interval) {
    lastSend = now;

    // Read digital sensor
    float raw_pressure_hpa = bmp.readPressure() / 100.0F; // hPa
    float raw_temp = bmp.readTemperature();
    
    // Read analog transducer (GPIO 34 ADC, 0-3.3V mapped to 0-200 kPa)
    int adcVal = analogRead(ANALOG_PRESSURE_PIN);
    float analog_pressure_kpa = (adcVal / 4095.0) * 200.0;
    
    // Apply local calibration parameters to primary digital pressure
    float digital_pressure_kpa = ((raw_pressure_hpa) * gain_multiplier) + offset_correction_kpa;

    StaticJsonDocument<384> doc;
    doc["device_id"] = DEVICE_ID;
    doc["timestamp"] = "2026-11-08T12:00:00Z"; // Or NTP time
    doc["digital_pressure"] = round(digital_pressure_kpa * 100.0) / 100.0;
    doc["analog_pressure"] = round(analog_pressure_kpa * 100.0) / 100.0;
    doc["temperature"] = round(raw_temp * 10.0) / 10.0;
    doc["humidity"] = 55.0; // BME280 or DHT22 reading
    doc["reference_temperature"] = 25.0;
    doc["health_status"] = "GOOD";

    char buffer[384];
    serializeJson(doc, buffer);
    mqttClient.publish(TELEMETRY_TOPIC, buffer);
    Serial.println("Published telemetry: " + String(buffer));
  }
}
