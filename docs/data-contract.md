# OneGuard LPG — Data Contract & Protocol Specification

This document defines the strict communication protocol and schema between the **ESP32 Edge Device**, **Firebase Realtime Database (RTDB)**, and the **OneGuard PWA Frontend**.

---

## 1. Firebase RTDB Schema Structure

```json
{
  "devices": {
    "<deviceId>": {
      "meta": {
        "model": "OneGuard-V1",
        "firmwareVersion": "1.0.4",
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
        "ts": 1729605432000,
        "grossKg": 24.11,
        "tareKg": 15.3,
        "capacityKg": 14.2,
        "lpgKg": 8.81,
        "percent": 62.04,
        "gasRaw": 1420,
        "gasPpm": 226,
        "gasStatus": "safe",
        "batteryPct": 86,
        "rssi": -60,
        "localAlarm": false,
        "sensorFault": false,
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
          "gasPpm": 2150,
          "acknowledged": false,
          "notifiedPhone": true
        }
      }
    }
  }
}
```

---

## 2. Telemetry Field Definitions & Validation

| Field | Type | Units / Allowed Values | Description | Validation Rule |
| :--- | :--- | :--- | :--- | :--- |
| `ts` | `number` | Unix timestamp (ms) | Time of sample according to DS3231 or NTP | Must be $\pm 300\text{s}$ of server time |
| `grossKg` | `number` | Kilograms (kg) | Total measured weight (cylinder + gas) | $0.0 \le \text{grossKg} \le 80.0$ |
| `lpgKg` | `number` | Kilograms (kg) | Estimated net LPG mass | $\max(0, \min(\text{capacityKg}, \text{grossKg} - \text{tareKg}))$ |
| `percent` | `number` | Percent (0–100%) | Tank fill percentage | $(\text{lpgKg} / \text{capacityKg}) \times 100$ |
| `gasPpm` | `number` | ppm equivalent | Raw/calibrated MQ-6 response | $\ge 0$ |
| `gasStatus` | `string` | `"safe" \| "warn" \| "alarm"` | Safety classification | `"alarm"` if $\ge 2000$, `"warn"` if $\ge 1000$ |
| `batteryPct` | `number` | Percent (0–100%) | Battery state of charge | $0 \le \text{batteryPct} \le 100$ |
| `rssi` | `number` | dBm | Wi-Fi Signal Strength | $-120 \le \text{rssi} \le 0$ |
| `source` | `string` | `"live" \| "simulated" \| "stale" \| "offline" \| "fault"` | Data provenance | Frontend marks stale if $\Delta t > 60\text{s}$ |

---

## 3. Data Integrity & Stale Detection Rules

1. **Heartbeat / Stale Guard:**
   - If current time minus `telemetry.ts` exceeds **60 seconds**, the UI displays the `STALE` badge with a yellow Neo-Brutalist highlight.
   - If current time minus `telemetry.ts` exceeds **180 seconds**, the UI transitions to `OFFLINE` status.
2. **Offline Event Buffering:**
   - If the ESP32 disconnects from Wi-Fi, it buffers critical events (such as leak alerts or battery low) to SPIFFS/NVS non-volatile flash storage with timestamps from the DS3231 RTC.
   - Upon reconnecting, buffered events are dispatched to `/events/` with unique IDs to prevent duplication.
