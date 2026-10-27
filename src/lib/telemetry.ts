import { useEffect, useRef, useState } from "react";
import { database, ensureAuth } from "@/lib/firebase";
import { ref, onValue, off, type DataSnapshot } from "firebase/database";

/**
 * Data source of a reading. When live ESP32 hardware is connected,
 * source is 'live', 'stale', 'offline', or 'fault'.
 */
export type DataSource = "live" | "stale" | "offline" | "fault";

export type CylinderConfig = {
  tareKg: number;
  capacityKg: number;
  presetName?: string | undefined;
};

export type LeakState = "SAFE" | "WARNING" | "LEAK_ALARM" | "SENSOR_FAULT";

export type Reading = {
  ts: number;
  grossKg: number | null;
  lpgKg: number | null;
  percent: number | null;
  gasPpm?: number | null;
  gasRaw?: number | null; // MQ-6 AO raw ADC reading (0-4095)
  gasDo?: number | null;  // MQ-6 DO pin level (0 = triggered, 1 = normal)
  leakState?: LeakState;
  batteryPct: number;
  rssi: number;
  source: DataSource;
  deviceOnline?: boolean;
  sensorFault?: boolean;
};

export type CylinderPreset = {
  id: string;
  name: string;
  shortName: string;
  tareKg: number;
  capacityKg: number;
  color: string;
  description: string;
};

export const CYLINDER_PRESETS: CylinderPreset[] = [
  {
    id: "domestic_14_2",
    name: "14.2 kg Domestic Steel",
    shortName: "14.2 KG DOMESTIC",
    tareKg: 15.3,
    capacityKg: 14.2,
    color: "#c8321f", // Classic Indian red cylinder
    description: "Standard Indian domestic cylinder (Indane, Bharat Gas, HP Gas)",
  },
  {
    id: "composite_10_0",
    name: "10.0 kg Smart Composite",
    shortName: "10.0 KG COMPOSITE",
    tareKg: 5.2,
    capacityKg: 10.0,
    color: "#2563eb", // Blue composite
    description: "Translucent lightweight composite cylinder with visual fill",
  },
  {
    id: "chhotu_5_0",
    name: "5.0 kg Chhotu Domestic",
    shortName: "5.0 KG CHHOTU",
    tareKg: 4.8,
    capacityKg: 5.0,
    color: "#ea580c", // Orange cylinder
    description: "Compact 5kg domestic cylinder for small kitchens & quick refills",
  },
  {
    id: "commercial_19_0",
    name: "19.0 kg Commercial Jumbo",
    shortName: "19.0 KG COMMERCIAL",
    tareKg: 18.2,
    capacityKg: 19.0,
    color: "#0284c7", // Commercial deep blue
    description: "High capacity commercial cylinder for heavy cooking",
  },
];

export const DEFAULT_CONFIG: CylinderConfig = {
  tareKg: CYLINDER_PRESETS[0]!.tareKg,
  capacityKg: CYLINDER_PRESETS[0]!.capacityKg,
  presetName: CYLINDER_PRESETS[0]!.shortName,
};

export const DEFAULT_DEVICE_ID = "oneguard_kitchen_01";

export const LEAK_WARN_PPM = 1000;
export const LEAK_ALARM_PPM = 2000;

export function lpgFromGross(grossKg: number, cfg: CylinderConfig) {
  const lpg = Math.max(0, Math.min(cfg.capacityKg, grossKg - cfg.tareKg));
  return { lpgKg: lpg, percent: (lpg / cfg.capacityKg) * 100 };
}

/** Linear estimate from average daily usage. Returns null when usage is too small to estimate. */
export function estimateDaysLeft(lpgKg: number | null, dailyKg: number[]) {
  if (lpgKg === null) return null;
  const usable = dailyKg.filter((d) => d > 0);
  if (usable.length < 3) return null;
  const avg = usable.reduce((a, b) => a + b, 0) / usable.length;
  if (avg < 0.01) return null;
  return Math.floor(lpgKg / avg);
}

export function gasLevel(ppm: number): "safe" | "warn" | "alarm" {
  if (ppm >= LEAK_ALARM_PPM) return "alarm";
  if (ppm >= LEAK_WARN_PPM) return "warn";
  return "safe";
}

// Sample usage for the last 14 days (kg/day), clearly labelled as reference.
export const SAMPLE_DAILY = [0.42, 0.38, 0.51, 0.33, 0.47, 0.6, 0.55, 0.4, 0.36, 0.44, 0.52, 0.39, 0.48, 0.45];

const STORAGE_KEY_CFG = "oneguard_cylinder_config_v1";
const STORAGE_KEY_DEVICE = "oneguard_device_id_v1";

export function loadSavedDeviceId(): string {
  if (typeof window === "undefined") return DEFAULT_DEVICE_ID;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEVICE);
    if (raw && raw.trim().length > 0) return raw.trim();
  } catch {
    // fallback
  }
  return DEFAULT_DEVICE_ID;
}

export function saveSavedDeviceId(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_DEVICE, id.trim());
    window.dispatchEvent(new CustomEvent("oneguard-device-change", { detail: id.trim() }));
  } catch {
    // ignore
  }
}

export function loadSavedConfig(): CylinderConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CFG);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<CylinderConfig>;
    if (typeof parsed.tareKg === "number" && typeof parsed.capacityKg === "number") {
      return {
        tareKg: parsed.tareKg,
        capacityKg: parsed.capacityKg,
        presetName: parsed.presetName ?? DEFAULT_CONFIG.presetName,
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(cfg: CylinderConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CFG, JSON.stringify(cfg));
  } catch {
    // ignore
  }
}

/**
 * Return dynamic, culturally warm Indian Hinglish microcopy
 */
export function getHinglishStatus(
  percent: number | null,
  level: "safe" | "warn" | "alarm",
  source: DataSource,
  leakState?: LeakState
): {
  headline: string;
  subtext: string;
  greeting: string;
  emoji: string;
} {
  const hour = new Date().getHours();
  let greeting = "Namaste";
  if (hour >= 5 && hour < 12) greeting = "Shubh Prabhat";
  else if (hour >= 12 && hour < 17) greeting = "Shubh Dopahar";
  else if (hour >= 17 && hour < 22) greeting = "Shubh Sandhya";
  else greeting = "Shubh Ratri";

  if (source === "fault" || leakState === "SENSOR_FAULT") {
    return {
      headline: "Sensor check karein",
      subtext: "HX711 scale ya MQ-6 gas sensor fault detect hua.",
      greeting,
      emoji: "⚠️",
    };
  }

  if (source === "offline") {
    return {
      headline: "Device offline hai",
      subtext: "ESP32 Wi-Fi disconnect ho gaya hai. Last known reading dikha rahe hain.",
      greeting,
      emoji: "📡",
    };
  }

  if (level === "alarm" || leakState === "LEAK_ALARM") {
    return {
      headline: "GAS LEAK DETECTED! Khidkiyan kholo!",
      subtext: "Regulator band karein, switches ko mat chhuyein, call 1906 immediately.",
      greeting: "EMERGENCY ALERT",
      emoji: "🚨",
    };
  }

  if (level === "warn" || leakState === "WARNING") {
    return {
      headline: "Halka gas smell detect hua",
      subtext: "Burner ya regulator knob check karein. Ventilation banaye rakhein.",
      greeting: "Caution",
      emoji: "⚠️",
    };
  }

  if (percent === null) {
    return {
      headline: "Reading check karein",
      subtext: "Scale connection verified hone ka intezar hai.",
      greeting,
      emoji: "⚖️",
    };
  }

  if (percent > 60) {
    return {
      headline: "Cylinder full hai boss!",
      subtext: "Chai aur biryani aaram se banegi. Zero tension!",
      greeting,
      emoji: "🔥",
    };
  }

  if (percent > 25) {
    return {
      headline: "Sab theek chal raha hai",
      subtext: "Cooking chalne do, gas level steady hai.",
      greeting,
      emoji: "👍",
    };
  }

  if (percent > 10) {
    return {
      headline: "Gas khatam hone wali hai!",
      subtext: "Naya refill cylinder book kar lo jaldi, warna beech me band ho jayega.",
      greeting,
      emoji: "⏳",
    };
  }

  return {
    headline: "Refill urgent chahiye!",
    subtext: "Sirf emergency jitna gas bacha hai. Aaj hi refill book karein.",
    greeting,
    emoji: "🔴",
  };
}

export function useTelemetry(initialCfg?: CylinderConfig) {
  const [cfg, setCfg] = useState<CylinderConfig>(() => initialCfg ?? loadSavedConfig());
  const [deviceId, setDeviceId] = useState<string>(() => loadSavedDeviceId());
  const [online, setOnline] = useState(true);
  const [reading, setReading] = useState<Reading | null>(null);

  // Sync when config changes
  useEffect(() => {
    if (initialCfg) setCfg(initialCfg);
  }, [initialCfg]);

  // Listen for device ID pairing changes
  useEffect(() => {
    const handleDeviceEvent = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setDeviceId(custom.detail);
    };
    window.addEventListener("oneguard-device-change", handleDeviceEvent);
    return () => {
      window.removeEventListener("oneguard-device-change", handleDeviceEvent);
    };
  }, []);

  // Online / offline window events
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // 100% Real Firebase Realtime Database Hardware Listener
  useEffect(() => {
    if (typeof window === "undefined" || !database) {
      return;
    }

    ensureAuth();

    const telemetryRef = ref(database, `devices/${deviceId}/telemetry`);

    const unsubscribe = onValue(
      telemetryRef,
      (snapshot: DataSnapshot) => {
        if (!snapshot.exists()) {
          // Hardware not yet connected or has not sent telemetry
          setReading({
            ts: Date.now() - 300000,
            grossKg: null,
            lpgKg: null,
            percent: null,
            gasRaw: null,
            gasDo: null,
            leakState: "SAFE",
            batteryPct: 0,
            rssi: 0,
            source: "offline",
            deviceOnline: false,
            sensorFault: false,
          });
          return;
        }

        const val = snapshot.val();
        if (!val || typeof val !== "object") return;

        const ts = typeof val.timestamp === "number" ? val.timestamp : typeof val.ts === "number" ? val.ts : Date.now();
        const deltaSec = Math.max(0, (Date.now() - ts) / 1000);

        const isSensorFault = Boolean(val.sensorFault || val.leakState === "SENSOR_FAULT");
        const isDeviceOnline = val.deviceOnline !== false;

        let source: DataSource = "live";
        if (isSensorFault) {
          source = "fault";
        } else if (!isDeviceOnline || deltaSec > 180) {
          source = "offline";
        } else if (deltaSec > 60) {
          source = "stale";
        }

        const grossVal = typeof val.grossWeightKg === "number" ? val.grossWeightKg : typeof val.grossKg === "number" ? val.grossKg : null;
        const lpgVal = typeof val.lpgRemainingKg === "number" ? val.lpgRemainingKg : typeof val.lpgKg === "number" ? val.lpgKg : null;
        const percentVal = typeof val.gasPercentage === "number" ? val.gasPercentage : typeof val.percent === "number" ? val.percent : null;
        const gasRawVal = typeof val.gasSensorRaw === "number" ? val.gasSensorRaw : typeof val.gasRaw === "number" ? val.gasRaw : null;
        const gasDoVal = typeof val.gasDigitalState === "number" ? val.gasDigitalState : typeof val.gasDigitalState === "boolean" ? (val.gasDigitalState ? 1 : 0) : null;
        const gasPpmVal = typeof val.gasPpm === "number" ? val.gasPpm : null;

        const leakStateVal: LeakState =
          val.leakState === "LEAK_ALARM" || val.leakState === "WARNING" || val.leakState === "SAFE" || val.leakState === "SENSOR_FAULT"
            ? val.leakState
            : val.gasStatus === "alarm"
            ? "LEAK_ALARM"
            : val.gasStatus === "warn"
            ? "WARNING"
            : "SAFE";

        setReading({
          ts,
          grossKg: grossVal,
          lpgKg: lpgVal,
          percent: percentVal,
          gasRaw: gasRawVal,
          gasDo: gasDoVal,
          gasPpm: gasPpmVal,
          leakState: leakStateVal,
          batteryPct: typeof val.batteryPct === "number" ? val.batteryPct : 100,
          rssi: typeof val.rssi === "number" ? val.rssi : -60,
          source,
          deviceOnline: isDeviceOnline,
          sensorFault: isSensorFault,
        });
      },
      (error) => {
        console.warn("Firebase telemetry listener error:", error);
      }
    );

    return () => {
      off(telemetryRef);
    };
  }, [deviceId]);

  const updateConfig = (newCfg: CylinderConfig) => {
    setCfg(newCfg);
    saveConfig(newCfg);
  };

  const updateDeviceId = (newId: string) => {
    setDeviceId(newId);
    saveSavedDeviceId(newId);
  };

  return { reading, online, cfg, deviceId, updateConfig, updateDeviceId };
}
