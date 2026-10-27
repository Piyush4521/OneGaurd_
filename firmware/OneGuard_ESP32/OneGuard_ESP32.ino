/**
 * OneGuard LPG — ESP32 Production Firmware
 * 
 * Target: ESP32 DevKit V1 (ESP-WROOM-32)
 * Confirmed Hardware Pin Assignments:
 *   - HX711 DOUT / DT: GPIO 25
 *   - HX711 SCK / CLK: GPIO 26
 *   - MQ-6 AO (Analog Output): GPIO 34 (via 2:1 divider, safe with Wi-Fi)
 *   - MQ-6 DO (Digital Output): GPIO 27 (LM393 comparator threshold)
 *   - DS3231 Precision I2C RTC: SDA GPIO 21, SCL GPIO 22
 *   - Status LED: GPIO 2
 *   - Buzzer: NOT INSTALLED (Do not configure a buzzer GPIO; GPIO 27 is dedicated to MQ-6 DO)
 * 
 * Integration:
 *   - Firebase ESP Client (by Mobizt) with native email/password device authentication
 *   - Direct TLS synchronization to regional Firebase Realtime Database
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "HX711.h"
#include "RTClib.h"

#if __has_include("config.h")
#include "config.h"
#else
#include "config.h.example"
#endif

// --- Confirmed ESP32 Hardware Pin Definitions ---
#define HX711_DOUT_PIN 25
#define HX711_SCK_PIN  26

#define MQ6_AO_PIN     34
#define MQ6_DO_PIN     27

#define RTC_SDA_PIN    21
#define RTC_SCL_PIN    22

#define STATUS_LED_PIN 2

// --- MQ-6 Gas Sensor Polarity ---
// Standard LM393 comparator breakout modules pull DO LOW (0) when gas exceeds potentiometer threshold.
#ifndef MQ6_DO_ACTIVE_LOW
#define MQ6_DO_ACTIVE_LOW true
#endif

// --- Peripherals & Firebase Client Objects ---
HX711 scale;
RTC_DS3231 rtc;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;
bool isFirebaseReady = false;

// --- State Variables ---
float currentGrossKg = 0.0f;
float currentLpgKg   = 0.0f;
float currentPercent = 0.0f;

int   currentGasRaw  = 0;
int   currentGasDo   = 1;
int   currentGasPpm  = 0;
bool  isGasDigitalTriggered = false;

// Sensor Health & Fault Flags
bool  isScaleFault   = false;
bool  isGasFault     = false;
bool  isRtcAvailable = false;
bool  isSensorFault  = false;
int   consecutiveScaleTimeouts = 0;

// Leak State Classification: "SAFE" | "WARNING" | "LEAK_ALARM" | "SENSOR_FAULT"
const char* currentLeakState = "SAFE";
bool isLocalAlarmActive = false;

unsigned long lastTelemetrySyncMs = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2000;
unsigned long lastWifiRetryMs = 0;
const unsigned long WIFI_RETRY_INTERVAL_MS = 15000;

// Filter buffers (5-sample moving average)
static const int FILTER_SAMPLES = 5;
float weightBuffer[FILTER_SAMPLES];
int filterIdx = 0;
bool isWeightBufferInitialized = false;

// --- Offline Event Buffering (Ring buffer) ---
struct OfflineEvent {
  int64_t ts;
  char type[24];
  char severity[16];
  int gasRaw;
  int gasDo;
  char eventId[48];
  bool dispatched;
};

static const int MAX_BUFFERED_EVENTS = 8;
OfflineEvent eventBuffer[MAX_BUFFERED_EVENTS];
int eventCount = 0;

// Forward declarations
void updateWeight();
void updateGas();
void evaluateLocalAlarm();
void syncTelemetry();
void flushOfflineEvents();
void bufferEvent(int64_t ts, const char* type, const char* severity, int raw, int digital);
int calculatePpmFromAdc(int rawAdc);
int64_t getCurrentTimestamp();
void initFirebase();

void initFirebase() {
  if (isFirebaseReady) return;
  Serial.println(F("[INFO] Initializing Firebase ESP Client (Native Auth)..."));
  fbConfig.api_key = FIREBASE_API_KEY;
  fbConfig.database_url = FIREBASE_DATABASE_URL;
  auth.user.email = DEVICE_AUTH_EMAIL;
  auth.user.password = DEVICE_AUTH_PASSWORD;
  fbConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);
  isFirebaseReady = true;
  Serial.println(F("[OK] Firebase Client initialized."));
}

void diagnoseWiFi() {
  Serial.println(F("[WIFI-DIAG] Scanning visible 2.4 GHz networks..."));
  int n = WiFi.scanNetworks();
  if (n == 0) {
    Serial.println(F("[WIFI-DIAG] 0 networks found. Check 2.4 GHz environment or antenna."));
  } else {
    Serial.printf("[WIFI-DIAG] Found %d visible 2.4 GHz network(s):\n", n);
    bool targetFound = false;
    for (int i = 0; i < n; ++i) {
      bool isTarget = (WiFi.SSID(i) == WIFI_SSID);
      if (isTarget) targetFound = true;
      Serial.printf("  %s %-22s (RSSI: %3d dBm, Ch: %2d)\n", 
        isTarget ? "--> [MATCH]" : "   ",
        WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i));
    }
    if (!targetFound) {
      Serial.print(F("[WIFI-DIAG] Target SSID '"));
      Serial.print(WIFI_SSID);
      Serial.println(F("' NOT detected on 2.4 GHz band."));
      Serial.println(F("[WIFI-DIAG] Check: Is hotspot configured for 2.4 GHz? (e.g. 'Maximize Compatibility' on iPhone)"));
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("\n========================================================"));
  Serial.println(F("     OneGuard LPG Production Firmware (ESP32 DevKit)    "));
  Serial.println(F("========================================================"));
  Serial.print(F("[CFG] HX711 DOUT: ")); Serial.print(HX711_DOUT_PIN);
  Serial.print(F(", SCK: ")); Serial.println(HX711_SCK_PIN);
  Serial.print(F("[CFG] MQ-6 AO: ")); Serial.print(MQ6_AO_PIN);
  Serial.print(F(", DO: ")); Serial.println(MQ6_DO_PIN);
  Serial.print(F("[CFG] RTC SDA: ")); Serial.print(RTC_SDA_PIN);
  Serial.print(F(", SCL: ")); Serial.println(RTC_SCL_PIN);
  Serial.println(F("[CFG] Physical Buzzer: NOT INSTALLED (GPIO 27 is MQ-6 DO)"));
  Serial.print(F("[CFG] Firebase Database URL: ")); Serial.println(FIREBASE_DATABASE_URL);

  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(MQ6_AO_PIN, INPUT);
  pinMode(MQ6_DO_PIN, INPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // 1. Initialize I2C and DS3231 RTC
  Wire.begin(RTC_SDA_PIN, RTC_SCL_PIN);
  if (!rtc.begin()) {
    Serial.println(F("[WARN] DS3231 RTC not detected on GPIO 21/22. Using internal millis timer."));
    isRtcAvailable = false;
  } else {
    isRtcAvailable = true;
    if (rtc.lostPower()) {
      Serial.println(F("[INFO] RTC lost power, setting compile time..."));
      rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    }
    Serial.println(F("[OK] DS3231 RTC initialized."));
  }

  // 2. Initialize HX711 Load Cell Amplifier
  Serial.println(F("[INFO] Initializing HX711 scale..."));
  scale.begin(HX711_DOUT_PIN, HX711_SCK_PIN);
  if (scale.wait_ready_timeout(1500)) {
    scale.set_scale(DEFAULT_CALIBRATION_FACTOR);
    scale.tare(); // Zero out stand
    isScaleFault = false;
    Serial.println(F("[OK] HX711 scale ready and tared."));
  } else {
    Serial.println(F("[ERROR] HX711 not ready on GPIO 25/26! Check wiring and excitation."));
    isScaleFault = true;
  }

  // 3. Connect to Wi-Fi with Diagnostic Event Listener
  Serial.print(F("[INFO] Connecting to Wi-Fi SSID: "));
  Serial.println(WIFI_SSID);

  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
    if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
      uint8_t reason = info.wifi_sta_disconnected.reason;
      Serial.print(F("\n[WIFI-EVENT] Disconnect code: "));
      Serial.print(reason);
      if (reason == 201) Serial.println(F(" (NO_AP_FOUND: SSID not visible on 2.4GHz)"));
      else if (reason == 15 || reason == 202) Serial.println(F(" (AUTH_FAIL: Password mismatch or WPA3 incompatible)"));
      else if (reason == 200) Serial.println(F(" (BEACON_TIMEOUT: Signal lost)"));
      else Serial.println();
    }
  });

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startWifi = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startWifi < 15000) {
    delay(250);
    Serial.print(F("."));
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[OK] Wi-Fi Connected. IP: "));
    Serial.println(WiFi.localIP());
    digitalWrite(STATUS_LED_PIN, HIGH);
    initFirebase();
  } else {
    Serial.println(F("\n[WARN] Wi-Fi initial connection timed out."));
    digitalWrite(STATUS_LED_PIN, LOW);
    diagnoseWiFi();
  }

  isSensorFault = (isScaleFault || isGasFault);
}

void loop() {
  updateWeight();
  updateGas();
  evaluateLocalAlarm();

  // Dynamic Wi-Fi connection handling:
  if (WiFi.status() == WL_CONNECTED) {
    if (!isFirebaseReady) {
      Serial.println(F("\n[OK] Wi-Fi Connected in background. IP: "));
      Serial.println(WiFi.localIP());
      digitalWrite(STATUS_LED_PIN, HIGH);
      initFirebase();
    }
  } else {
    // If disconnected and retry interval elapsed
    if (millis() - lastWifiRetryMs >= WIFI_RETRY_INTERVAL_MS) {
      lastWifiRetryMs = millis();
      wl_status_t st = WiFi.status();
      if (st == WL_DISCONNECTED || st == WL_CONNECTION_LOST || st == WL_IDLE_STATUS) {
        Serial.println(F("[WIFI] Re-triggering connection to AP..."));
        WiFi.disconnect();
        delay(100);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      }
    }
  }

  // Periodic telemetry synchronization via Firebase ESP Client
  if (millis() - lastTelemetrySyncMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetrySyncMs = millis();
    syncTelemetry();
  }

  delay(50);
}

void updateWeight() {
  if (!scale.wait_ready_timeout(80)) {
    consecutiveScaleTimeouts++;
    if (consecutiveScaleTimeouts >= 5) {
      if (!isScaleFault) {
        Serial.println(F("[WARN] HX711 communication lost. Setting scale fault."));
      }
      isScaleFault = true;
    }
    return;
  }

  consecutiveScaleTimeouts = 0;
  isScaleFault = false;

  float sample = scale.get_units(1); // Read single averaged unit
  
  if (!isWeightBufferInitialized) {
    for (int i = 0; i < FILTER_SAMPLES; i++) {
      weightBuffer[i] = sample;
    }
    isWeightBufferInitialized = true;
  } else {
    weightBuffer[filterIdx] = sample;
    filterIdx = (filterIdx + 1) % FILTER_SAMPLES;
  }

  // Moving average
  float sum = 0;
  for (int i = 0; i < FILTER_SAMPLES; i++) {
    sum += weightBuffer[i];
  }
  currentGrossKg = sum / FILTER_SAMPLES;

  // Sanity check: gross weight out-of-range checks
  if (currentGrossKg < -2.0f || currentGrossKg > 90.0f) {
    isScaleFault = true;
    return;
  }

  // Net LPG mass = gross - tare, bounded between 0 and cylinder capacity
  float net = currentGrossKg - DEFAULT_TARE_KG;
  if (net < 0.0f) net = 0.0f;
  if (net > DEFAULT_CAPACITY_KG) net = DEFAULT_CAPACITY_KG;
  currentLpgKg = net;

  currentPercent = (currentLpgKg / DEFAULT_CAPACITY_KG) * 100.0f;
}

void updateGas() {
  // Read analog voltage from MQ-6 via 2:1 divider on GPIO34
  int rawAdc = analogRead(MQ6_AO_PIN);
  currentGasRaw = rawAdc;

  // Read digital threshold comparator from MQ-6 DO on GPIO 27
  int rawDo = digitalRead(MQ6_DO_PIN);
  currentGasDo = rawDo;

  // Physical ADC sanity check (detect floating or disconnected wire)
  if (rawAdc < 5 || rawAdc > 4090) {
    // Persistent extreme values indicate sensor disconnect or short circuit
    isGasFault = true;
  } else {
    isGasFault = false;
  }

  // Polarity check: LM393 pulls DO LOW when gas exceeds potentiometer threshold
  isGasDigitalTriggered = (MQ6_DO_ACTIVE_LOW) ? (rawDo == LOW) : (rawDo == HIGH);

  // Calibrate response indication (treated as relative sensor response, not certified ppm)
  currentGasPpm = calculatePpmFromAdc(rawAdc);

  // Combined leak state evaluation
  if (isGasFault) {
    currentLeakState = "SENSOR_FAULT";
  } else if (isGasDigitalTriggered || currentGasPpm >= LEAK_ALARM_PPM) {
    currentLeakState = "LEAK_ALARM";
  } else if (currentGasPpm >= LEAK_WARN_PPM) {
    currentLeakState = "WARNING";
  } else {
    currentLeakState = "SAFE";
  }

  isSensorFault = (isScaleFault || isGasFault);
}

int calculatePpmFromAdc(int rawAdc) {
  // ESP32 ADC: 12-bit (0 - 4095), reference ~3.3V
  float vAdc = (rawAdc / 4095.0f) * 3.3f;
  float vMq = vAdc * MQ6_DIVIDER_RATIO;
  if (vMq < 0.1f) vMq = 0.1f;
  if (vMq > 5.0f) vMq = 5.0f;

  float rs = ((5.0f - vMq) / vMq) * MQ6_RL_VALUE;
  float ratio = rs / MQ6_RO_CLEAN_AIR;

  // Approximate LPG power-law response curve: ppm = a * (Rs/Ro)^b
  float ppm = 1000.0f * pow(ratio, -2.1f);
  if (ppm < 10.0f) ppm = 10.0f;
  if (ppm > 10000.0f) ppm = 10000.0f;

  return (int)ppm;
}

void evaluateLocalAlarm() {
  bool isLeak = (strcmp(currentLeakState, "LEAK_ALARM") == 0);

  if (!isLocalAlarmActive && isLeak) {
    isLocalAlarmActive = true;
    Serial.println(F("[CRITICAL] LEAK DETECTED! High-priority local fail-safe triggered."));
    int64_t ts = getCurrentTimestamp();
    bufferEvent(ts, "LEAK_ALARM", "CRITICAL", currentGasRaw, currentGasDo);
  } else if (isLocalAlarmActive && !isLeak && currentGasPpm < (LEAK_ALARM_PPM - LEAK_HYSTERESIS_PPM)) {
    isLocalAlarmActive = false;
    Serial.println(F("[INFO] Gas levels returned to safe range."));
  }

  // Visual local indication via status LED (rapid flash during alarm)
  if (isLocalAlarmActive) {
    digitalWrite(STATUS_LED_PIN, (millis() / 150) % 2);
  } else if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
  } else {
    digitalWrite(STATUS_LED_PIN, (millis() / 1000) % 2);
  }
}

int64_t getCurrentTimestamp() {
  if (isRtcAvailable) {
    DateTime now = rtc.now();
    if (now.isValid() && now.year() >= 2024) {
      return (int64_t)now.unixtime() * 1000ULL;
    }
  }
  return (int64_t)millis();
}

void bufferEvent(int64_t ts, const char* type, const char* severity, int raw, int digital) {
  // Deduplicate: check if event already queued in recent buffer
  char id[48];
  snprintf(id, sizeof(id), "evt_%lld_%s", ts, type);

  for (int i = 0; i < eventCount; i++) {
    if (strcmp(eventBuffer[i].eventId, id) == 0) {
      return; // Already recorded
    }
  }

  int slot = eventCount < MAX_BUFFERED_EVENTS ? eventCount++ : (MAX_BUFFERED_EVENTS - 1);
  eventBuffer[slot].ts = ts;
  strncpy(eventBuffer[slot].type, type, sizeof(eventBuffer[slot].type) - 1);
  strncpy(eventBuffer[slot].severity, severity, sizeof(eventBuffer[slot].severity) - 1);
  eventBuffer[slot].gasRaw = raw;
  eventBuffer[slot].gasDo = digital;
  strncpy(eventBuffer[slot].eventId, id, sizeof(eventBuffer[slot].eventId) - 1);
  eventBuffer[slot].dispatched = false;

  // If Firebase is ready now, flush immediately
  if (Firebase.ready()) {
    flushOfflineEvents();
  }
}

void flushOfflineEvents() {
  if (!Firebase.ready()) return;

  for (int i = 0; i < eventCount; i++) {
    if (eventBuffer[i].dispatched) continue;

    char eventPayload[256];
    snprintf(eventPayload, sizeof(eventPayload),
      "{\"ts\":%lld,\"type\":\"%s\",\"severity\":\"%s\",\"gasRaw\":%d,\"gasDo\":%d,\"acknowledged\":false}",
      eventBuffer[i].ts, eventBuffer[i].type, eventBuffer[i].severity,
      eventBuffer[i].gasRaw, eventBuffer[i].gasDo
    );

    String path = "/devices/" + String(DEVICE_ID) + "/events/" + String(eventBuffer[i].eventId);
    FirebaseJson json;
    json.setJsonData(eventPayload);
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      eventBuffer[i].dispatched = true;
      Serial.print(F("[OK] Synced buffered event to Firebase: "));
      Serial.println(eventBuffer[i].eventId);
    } else {
      Serial.print(F("[WARN] Firebase event sync failed: "));
      Serial.println(fbdo.errorReason());
    }
  }
}

void syncTelemetry() {
  if (!Firebase.ready()) {
    return; // Wait until Wi-Fi is connected and Firebase auth token is valid
  }

  // Flush any pending offline events first
  flushOfflineEvents();

  int64_t ts = getCurrentTimestamp();
  int rssi = WiFi.RSSI();
  const char* gasStatus = (strcmp(currentLeakState, "LEAK_ALARM") == 0) ? "alarm" :
                          (strcmp(currentLeakState, "WARNING") == 0)    ? "warn"  : "safe";

  // Build JSON payload adhering to confirmed telemetry schema
  // Notice: If sensor is faulted, send null rather than fabricated numbers.
  char payload[768];

  if (isScaleFault && isGasFault) {
    snprintf(payload, sizeof(payload),
      "{\"timestamp\":%lld,\"ts\":%lld,"
      "\"grossWeightKg\":null,\"grossKg\":null,"
      "\"lpgRemainingKg\":null,\"lpgKg\":null,"
      "\"gasPercentage\":null,\"percent\":null,"
      "\"gasSensorRaw\":null,\"gasRaw\":null,"
      "\"gasDigitalState\":%d,"
      "\"leakState\":\"SENSOR_FAULT\",\"gasStatus\":\"warn\","
      "\"deviceOnline\":true,\"sensorFault\":true,\"batteryPct\":100,\"rssi\":%d,\"source\":\"fault\"}",
      ts, ts, currentGasDo, rssi
    );
  } else if (isScaleFault) {
    snprintf(payload, sizeof(payload),
      "{\"timestamp\":%lld,\"ts\":%lld,"
      "\"grossWeightKg\":null,\"grossKg\":null,"
      "\"lpgRemainingKg\":null,\"lpgKg\":null,"
      "\"gasPercentage\":null,\"percent\":null,"
      "\"gasSensorRaw\":%d,\"gasRaw\":%d,"
      "\"gasDigitalState\":%d,"
      "\"leakState\":\"%s\",\"gasStatus\":\"%s\",\"gasPpm\":%d,"
      "\"deviceOnline\":true,\"sensorFault\":true,\"batteryPct\":100,\"rssi\":%d,\"source\":\"fault\"}",
      ts, ts, currentGasRaw, currentGasRaw, currentGasDo,
      currentLeakState, gasStatus, currentGasPpm, rssi
    );
  } else if (isGasFault) {
    snprintf(payload, sizeof(payload),
      "{\"timestamp\":%lld,\"ts\":%lld,"
      "\"grossWeightKg\":%.2f,\"grossKg\":%.2f,"
      "\"lpgRemainingKg\":%.2f,\"lpgKg\":%.2f,"
      "\"gasPercentage\":%.1f,\"percent\":%.1f,"
      "\"gasSensorRaw\":null,\"gasRaw\":null,"
      "\"gasDigitalState\":%d,"
      "\"leakState\":\"SENSOR_FAULT\",\"gasStatus\":\"warn\","
      "\"deviceOnline\":true,\"sensorFault\":true,\"batteryPct\":100,\"rssi\":%d,\"source\":\"fault\"}",
      ts, ts, currentGrossKg, currentGrossKg, currentLpgKg, currentLpgKg,
      currentPercent, currentPercent, currentGasDo, rssi
    );
  } else {
    snprintf(payload, sizeof(payload),
      "{\"timestamp\":%lld,\"ts\":%lld,"
      "\"grossWeightKg\":%.2f,\"grossKg\":%.2f,"
      "\"lpgRemainingKg\":%.2f,\"lpgKg\":%.2f,"
      "\"gasPercentage\":%.1f,\"percent\":%.1f,"
      "\"gasSensorRaw\":%d,\"gasRaw\":%d,"
      "\"gasDigitalState\":%d,"
      "\"leakState\":\"%s\",\"gasStatus\":\"%s\",\"gasPpm\":%d,"
      "\"deviceOnline\":true,\"sensorFault\":false,\"batteryPct\":100,\"rssi\":%d,\"source\":\"live\"}",
      ts, ts, currentGrossKg, currentGrossKg, currentLpgKg, currentLpgKg,
      currentPercent, currentPercent, currentGasRaw, currentGasRaw, currentGasDo,
      currentLeakState, gasStatus, currentGasPpm, rssi
    );
  }

  // Sync to Firebase Realtime Database using Firebase ESP Client
  String path = "/devices/" + String(DEVICE_ID) + "/telemetry";
  FirebaseJson json;
  json.setJsonData(payload);
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    // Write successful
  } else {
    Serial.print(F("[WARN] Firebase telemetry sync failed: "));
    Serial.println(fbdo.errorReason());
  }
}
