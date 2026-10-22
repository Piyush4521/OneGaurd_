/**
 * OneGuard LPG — ESP32 Production Firmware
 * 
 * Target: ESP32 DevKit V1 (ESP-WROOM-32)
 * Sensors:
 *   - 4x 50kg 3-wire Load Cells + SparkFun Combinator v1.1 + HX711
 *   - MQ-6 LPG Gas Sensor (Analog Out on GPIO34 via 2:1 divider)
 *   - DS3231 Precision I2C RTC (SDA: 21, SCL: 22)
 *   - Local Active Buzzer (GPIO 25)
 *   - Status LED (GPIO 2)
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"
#include "RTClib.h"
#include "config.h.example"

// --- Hardware Pin Definitions ---
static const uint8_t PIN_HX711_DOUT = 19;
static const uint8_t PIN_HX711_SCK  = 18;
static const uint8_t PIN_MQ6_AO     = 34; // ADC1_CH6 (Safe with Wi-Fi)
static const uint8_t PIN_MQ6_DO     = 35; // Digital threshold interrupt
static const uint8_t PIN_BUZZER     = 25; // Local emergency buzzer
static const uint8_t PIN_LED        = 2;  // Built-in status indicator

// --- Peripherals ---
HX711 scale;
RTC_DS3231 rtc;

// --- State Variables ---
float currentGrossKg = 0.0f;
float currentLpgKg   = 0.0f;
float currentPercent = 0.0f;
int   currentGasRaw  = 0;
int   currentGasPpm  = 0;
bool  isLocalAlarmActive = false;
bool  isSensorFault = false;
unsigned long lastTelemetrySyncMs = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

// Filter buffers
static const int FILTER_SAMPLES = 5;
float weightBuffer[FILTER_SAMPLES];
int filterIdx = 0;

// Forward declarations
void updateWeight();
void updateGas();
void checkLocalAlarms();
void syncTelemetry();
int calculatePpmFromAdc(int rawAdc);

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n======================================"));
  Serial.println(F("       OneGuard LPG Firmware V1.0     "));
  Serial.println(F("======================================"));

  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_MQ6_DO, INPUT);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, LOW);

  // 1. Initialize I2C and RTC
  Wire.begin(21, 22);
  if (!rtc.begin()) {
    Serial.println(F("[WARN] DS3231 RTC not detected. Falling back to internal millis timer."));
  } else if (rtc.lostPower()) {
    Serial.println(F("[INFO] RTC lost power, setting compile time..."));
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  // 2. Initialize HX711 Load Cell Amplifier
  Serial.print(F("[INFO] Initializing HX711 scale on DOUT:"));
  Serial.print(PIN_HX711_DOUT);
  Serial.print(F(", SCK:"));
  Serial.println(PIN_HX711_SCK);

  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.wait_ready_timeout(1000)) {
    scale.set_scale(DEFAULT_CALIBRATION_FACTOR);
    scale.tare(); // Zero out stand
    Serial.println(F("[OK] Scale initialized and tared."));
  } else {
    Serial.println(F("[ERROR] HX711 not found! Check wiring and 5V excitation supply."));
    isSensorFault = true;
  }

  // 3. Connect to Wi-Fi
  Serial.print(F("[INFO] Connecting to Wi-Fi: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Non-blocking timeout for initial Wi-Fi connect
  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 10000) {
    delay(250);
    Serial.print(F("."));
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[OK] Wi-Fi Connected. IP: "));
    Serial.println(WiFi.localIP());
    digitalWrite(PIN_LED, HIGH);
  } else {
    Serial.println(F("\n[WARN] Wi-Fi connection timed out. Local alarm loop running autonomously."));
    digitalWrite(PIN_LED, LOW);
  }
}

void loop() {
  updateWeight();
  updateGas();
  checkLocalAlarms();

  if (millis() - lastTelemetrySyncMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetrySyncMs = millis();
    syncTelemetry();
  }

  delay(50);
}

void updateWeight() {
  if (!scale.is_ready()) return;

  float sample = scale.get_units(1); // Read single averaged unit
  weightBuffer[filterIdx] = sample;
  filterIdx = (filterIdx + 1) % FILTER_SAMPLES;

  // Simple moving average
  float sum = 0;
  for (int i = 0; i < FILTER_SAMPLES; i++) {
    sum += weightBuffer[i];
  }
  currentGrossKg = sum / FILTER_SAMPLES;

  // Net LPG mass = gross - tare, bounded between 0 and cylinder capacity
  float net = currentGrossKg - DEFAULT_TARE_KG;
  if (net < 0.0f) net = 0.0f;
  if (net > DEFAULT_CAPACITY_KG) net = DEFAULT_CAPACITY_KG;
  currentLpgKg = net;

  currentPercent = (currentLpgKg / DEFAULT_CAPACITY_KG) * 100.0f;
}

void updateGas() {
  // Read analog value from MQ-6 via divider on GPIO34
  int raw = analogRead(PIN_MQ6_AO);
  currentGasRaw = raw;
  currentGasPpm = calculatePpmFromAdc(raw);
}

int calculatePpmFromAdc(int rawAdc) {
  // ESP32 ADC: 12-bit (0 - 4095), reference ~3.3V
  float vAdc = (rawAdc / 4095.0f) * 3.3f;
  // Account for voltage divider factor
  float vMq = vAdc * MQ6_DIVIDER_RATIO;
  if (vMq < 0.1f) vMq = 0.1f;
  if (vMq > 5.0f) vMq = 5.0f;

  // Sensor resistance: Rs = ((Vc - Vrl) / Vrl) * Rl
  float rs = ((5.0f - vMq) / vMq) * MQ6_RL_VALUE;
  float ratio = rs / MQ6_RO_CLEAN_AIR;

  // Approximate LPG power-law curve: ppm = a * (Rs/Ro)^b
  // For MQ-6 typical datasheet curve: a ~ 1000, b ~ -2.1
  float ppm = 1000.0f * pow(ratio, -2.1f);
  if (ppm < 10.0f) ppm = 10.0f;
  if (ppm > 10000.0f) ppm = 10000.0f;

  return (int)ppm;
}

void checkLocalAlarms() {
  // Autonomous failsafe: sounds local buzzer immediately
  if (!isLocalAlarmActive && currentGasPpm >= LEAK_ALARM_PPM) {
    isLocalAlarmActive = true;
    digitalWrite(PIN_BUZZER, HIGH);
    Serial.println(F("[CRITICAL] LEAK ALARM TRIGGERED! Buzzer sounding."));
  } else if (isLocalAlarmActive && currentGasPpm < (LEAK_ALARM_PPM - LEAK_HYSTERESIS_PPM)) {
    isLocalAlarmActive = false;
    digitalWrite(PIN_BUZZER, LOW);
    Serial.println(F("[INFO] Gas levels returned to safe range. Buzzer deactivated."));
  }
}

void syncTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    // Wi-Fi offline - local safety continues unaffected
    return;
  }

  int64_t ts = 0;
  DateTime now = rtc.now();
  if (now.isValid()) {
    ts = (int64_t)now.unixtime() * 1000ULL;
  } else {
    ts = (int64_t)millis();
  }

  int rssi = WiFi.RSSI();
  const char* gasStatus = (currentGasPpm >= LEAK_ALARM_PPM) ? "alarm" : 
                          (currentGasPpm >= LEAK_WARN_PPM)  ? "warn" : "safe";

  // Build JSON payload
  char payload[512];
  snprintf(payload, sizeof(payload),
    "{\"ts\":%lld,\"grossKg\":%.2f,\"tareKg\":%.2f,\"capacityKg\":%.2f,\"lpgKg\":%.2f,"
    "\"percent\":%.1f,\"gasRaw\":%d,\"gasPpm\":%d,\"gasStatus\":\"%s\",\"batteryPct\":%d,"
    "\"rssi\":%d,\"localAlarm\":%s,\"sensorFault\":%s,\"source\":\"live\"}",
    ts, currentGrossKg, DEFAULT_TARE_KG, DEFAULT_CAPACITY_KG, currentLpgKg,
    currentPercent, currentGasRaw, currentGasPpm, gasStatus, 100,
    rssi, isLocalAlarmActive ? "true" : "false", isSensorFault ? "true" : "false"
  );

  // Sync via Firebase Realtime Database REST API
  HTTPClient http;
  char url[256];
  snprintf(url, sizeof(url), "https://%s/devices/%s/telemetry.json?auth=%s",
           FIREBASE_HOST, DEVICE_ID, FIREBASE_AUTH);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(payload);

  if (httpCode == HTTP_CODE_OK || httpCode == 204) {
    // Success
  } else {
    Serial.print(F("[WARN] Firebase sync HTTP code: "));
    Serial.println(httpCode);
  }
  http.end();
}
