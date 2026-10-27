# OneGuard LPG — Data Contract & Protocol Specification

This document defines the communication protocol and schema between the **ESP32 Edge Device**, **Firebase Realtime Database (RTDB)**, and the **OneGuard PWA Frontend**.

---

## 1. Confirmed Hardware GPIO Assignments

| Component | Signal | ESP32 GPIO | Direction | Purpose & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **HX711** | DOUT / DT | **GPIO 25** | Input | 24-bit strain-gauge serial data |
| **HX711** | SCK / CLK | **GPIO 26** | Output | Serial clock pulses |
| **MQ-6** | AO (Analog) | **GPIO 34** | Analog In | 0-3.3V gas level voltage via 2:1 divider (`ADC1_CH6` safe with Wi-Fi) |
| **MQ-6** | DO (Digital) | **GPIO 27** | Digital In | LM393 comparator threshold. Active-LOW (0 on trigger). **Exclusively MQ-6 DO.** |
| **DS3231 RTC**| SDA | **GPIO 21** | In/Out | Hardware I2C data |
| **DS3231 RTC**| SCL | **GPIO 22** | Output | Hardware I2C clock |
| **Status LED** | LED | **GPIO 2** | Output | Visual status / emergency flash |
| **Buzzer** | None | **Not Installed** | None | **Do not configure buzzer GPIO.** Audio alerts run in PWA browser Web Audio. |

---

## 2. Firebase RTDB Schema Structure

```json
{
  "devices": {
    "<deviceId>": {
      "meta": {
        "model": "OneGuard-V1",
        "firmwareVersion": "1.0.5",
        "ownerUid": "user_firebase_auth_uid",
        "registeredAt": 1729600000000,
        "lastSeen": 1729605432000
      },
      "config": {
        "tareKg": 15.3,
        "capacityKg": 14.2,
        "calibrationFactor": -22450.0,
        "gasWarnPpm": 1000,
        "gasAlarmPpm": 2000,
        "sampleIntervalSec": 2,
        "historyIntervalMin": 60,
        "emergencyContacts": {
          "contact_1": {
            "name": "Local Fire & Emergency",
            "phone": "1906",
            "priority": 1
          },
          "contact_2": {
            "name": "Family Member",
            "phone": "+919876543210",
            "priority": 2
          }
        }
      },
      "telemetry": {
        "timestamp": 1729605432000,
        "ts": 1729605432000,
        "grossWeightKg": 24.11,
        "grossKg": 24.11,
        "lpgRemainingKg": 8.81,
        "lpgKg": 8.81,
        "gasPercentage": 62.04,
        "percent": 62.04,
        "gasSensorRaw": 1420,
        "gasRaw": 1420,
        "gasDigitalState": 1,
        "leakState": "SAFE",
        "gasStatus": "safe",
        "gasPpm": 226,
        "deviceOnline": true,
        "sensorFault": false,
        "batteryPct": 100,
        "rssi": -60,
        "source": "live"
      },
      "history": {
        "2026-10-21": {
          "startKg": 9.25,
          "endKg": 8.81,
          "consumedKg": 0.44,
          "avgPpm": 210,
          "peakPpm": 412
        }
      },
      "events": {
        "<eventId>": {
          "ts": 1729605432000,
          "type": "LEAK_ALARM",
          "severity": "CRITICAL",
          "gasRaw": 2450,
          "gasDo": 0,
          "acknowledged": false
        }
      }
    }
  }
}
```

---

## 3. Telemetry Field Definitions & Validation

| Field | Type | Units / Allowed Values | Description | Validation Rule |
| :--- | :--- | :--- | :--- | :--- |
| `timestamp` / `ts` | `number \| null` | Unix timestamp (ms) | Time of measurement from DS3231 RTC or system timer | Must be non-negative |
| `grossWeightKg` / `grossKg` | `number \| null` | Kilograms (kg) | Total measured weight (cylinder + gas). Null on scale fault. | $0.0 \le \text{gross} \le 120.0$ or null |
| `lpgRemainingKg` / `lpgKg` | `number \| null` | Kilograms (kg) | Estimated net LPG mass ($\max(0, \min(\text{cap}, \text{gross} - \text{tare}))$. Null on scale fault. | $\ge 0$ or null |
| `gasPercentage` / `percent` | `number \| null` | Percent (0–100%) | Cylinder fill level percentage. Null on scale fault. | $0.0 \le \text{pct} \le 100.0$ or null |
| `gasSensorRaw` / `gasRaw` | `number \| null` | ADC units (0–4095) | Raw MQ-6 analog reading on GPIO 34 via 2:1 divider. | $0 \le \text{raw} \le 4096$ or null |
| `gasDigitalState` | `number \| boolean \| null` | `0 \| 1` | Raw digital level on GPIO 27 (LM393 output: 0 = trigger, 1 = normal). | `0` or `1` |
| `leakState` | `string` | `"SAFE" \| "WARNING" \| "LEAK_ALARM" \| "SENSOR_FAULT"` | Evaluated safety status combining DO and AO | Enforced enum |
| `deviceOnline` | `boolean` | `true \| false` | Network connectivity heartbeat status | Boolean |
| `sensorFault` | `boolean` | `true \| false` | Hardware fault flag (HX711 or MQ-6 offline) | Boolean |
| `gasPpm` | `number \| null` | PPM equivalent | Relative sensor response indication (not lab-certified ppm) | $\ge 0$ |
| `source` | `string` | `"live" \| "simulated" \| "stale" \| "offline" \| "fault"` | Data provenance indicator | Enforced enum |

---

## 4. Data Integrity & Safety Rules

1. **Sensor Indication Disclaimer:**
   MQ-6 analog and digital readings are treated as relative sensor indications for kitchen safety alerts, not certified ppm measurements.
2. **No Placeholder Fabrication:**
   When a hardware sensor is disconnected or faulted, the firmware and dashboard publish `null` or flag `sensorFault`, never fabricated random numbers.
3. **Heartbeat & Stale Guard:**
   - $\Delta t > 60\text{ seconds}$: Telemetry marked as `STALE`.
   - $\Delta t > 180\text{ seconds}$: Telemetry marked as `OFFLINE`.
4. **Offline Event Buffering & Deduplication:**
   When Wi-Fi disconnects, emergency leak events are recorded in an internal ring buffer with unique event IDs (`evt_<timestamp>_<type>`). Upon reconnection, un-dispatched events are synchronized to `/devices/<deviceId>/events/<eventId>.json`.
