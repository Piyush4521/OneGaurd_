import { useEffect, useRef, useState } from "react";

/**
 * Data source of a reading. Until the ESP32 + Firebase link is configured,
 * readings are marked "simulated" unless a live device is streaming.
 */
export type DataSource = "live" | "simulated" | "stale" | "offline" | "fault";

export type CylinderConfig = {
  tareKg: number;
  capacityKg: number;
  presetName?: string | undefined;
};

export type SimulationScenario = "normal" | "low_gas" | "leak_emergency" | "sensor_fault" | "offline";

export type Reading = {
  ts: number;
  grossKg: number;
  lpgKg: number;
  percent: number;
  gasPpm: number;
  batteryPct: number;
  rssi: number;
  source: DataSource;
  scenario?: SimulationScenario;
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

export const LEAK_WARN_PPM = 1000;
export const LEAK_ALARM_PPM = 2000;

export function lpgFromGross(grossKg: number, cfg: CylinderConfig) {
  const lpg = Math.max(0, Math.min(cfg.capacityKg, grossKg - cfg.tareKg));
  return { lpgKg: lpg, percent: (lpg / cfg.capacityKg) * 100 };
}

/** Linear estimate from average daily usage. Returns null when usage is too small to estimate. */
export function estimateDaysLeft(lpgKg: number, dailyKg: number[]) {
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

// Sample usage for the last 14 days (kg/day), clearly labelled as simulated in the UI.
export const SAMPLE_DAILY = [0.42, 0.38, 0.51, 0.33, 0.47, 0.6, 0.55, 0.4, 0.36, 0.44, 0.52, 0.39, 0.48, 0.45];

const STORAGE_KEY_CFG = "oneguard_cylinder_config_v1";
const STORAGE_KEY_SCENARIO = "oneguard_sim_scenario_v1";

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

export function loadSavedScenario(): SimulationScenario {
  if (typeof window === "undefined") return "normal";
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCENARIO);
    if (raw === "normal" || raw === "low_gas" || raw === "leak_emergency" || raw === "sensor_fault" || raw === "offline") {
      return raw;
    }
  } catch {
    // fallback
  }
  return "normal";
}

export function saveSavedScenario(s: SimulationScenario) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SCENARIO, s);
    window.dispatchEvent(new CustomEvent("oneguard-scenario-change", { detail: s }));
  } catch {
    // ignore
  }
}

/**
 * Return dynamic, culturally warm Indian Hinglish microcopy
 */
export function getHinglishStatus(percent: number, level: "safe" | "warn" | "alarm", source: DataSource): {
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

  if (source === "fault") {
    return {
      headline: "Sensor wiring check karein",
      subtext: "Load cell or MQ-6 sensor not responding. Check connections.",
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

  if (level === "alarm") {
    return {
      headline: "GAS LEAK DETECTED! Khidkiyan kholo!",
      subtext: "Regulator band karein, switches ko mat chhuyein, call 1906 immediately.",
      greeting: "EMERGENCY ALERT",
      emoji: "🚨",
    };
  }

  if (level === "warn") {
    return {
      headline: "Halka gas smell detect hua",
      subtext: "Burner ya regulator knob check karein. Ventilation banaye rakhein.",
      greeting: "Caution",
      emoji: "⚠️",
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

export function useTelemetry(initialCfg?: CylinderConfig, intervalMs = 2000) {
  const [cfg, setCfg] = useState<CylinderConfig>(() => initialCfg ?? loadSavedConfig());
  const [scenario, setScenario] = useState<SimulationScenario>(() => loadSavedScenario());
  const [online, setOnline] = useState(true);
  const [reading, setReading] = useState<Reading | null>(null);

  // Keep gross weight stateful
  const gross = useRef(cfg.tareKg + cfg.capacityKg * 0.62);

  // Sync when config changes
  useEffect(() => {
    if (initialCfg) setCfg(initialCfg);
  }, [initialCfg]);

  // Listen for scenario changes across tabs or simulator controls
  useEffect(() => {
    const handleScenarioEvent = (e: Event) => {
      const custom = e as CustomEvent<SimulationScenario>;
      if (custom.detail) setScenario(custom.detail);
    };
    window.addEventListener("oneguard-scenario-change", handleScenarioEvent);
    return () => window.removeEventListener("oneguard-scenario-change", handleScenarioEvent);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const tick = () => {
      if (scenario === "offline") {
        setReading({
          ts: Date.now() - 320000, // 5+ min ago (stale/offline)
          grossKg: cfg.tareKg + cfg.capacityKg * 0.45,
          lpgKg: cfg.capacityKg * 0.45,
          percent: 45,
          gasPpm: 210,
          batteryPct: 42,
          rssi: -88,
          source: "offline",
          scenario,
        });
        return;
      }

      if (scenario === "sensor_fault") {
        setReading({
          ts: Date.now(),
          grossKg: 0,
          lpgKg: 0,
          percent: 0,
          gasPpm: 0,
          batteryPct: 15,
          rssi: -65,
          source: "fault",
          scenario,
        });
        return;
      }

      if (scenario === "leak_emergency") {
        const noisyGross = cfg.tareKg + cfg.capacityKg * 0.54 + (Math.random() - 0.5) * 0.02;
        const { lpgKg, percent } = lpgFromGross(noisyGross, cfg);
        setReading({
          ts: Date.now(),
          grossKg: noisyGross,
          lpgKg,
          percent,
          gasPpm: Math.round(2420 + Math.random() * 250), // Critical >2000 ppm
          batteryPct: 82,
          rssi: -56,
          source: "simulated",
          scenario,
        });
        return;
      }

      if (scenario === "low_gas") {
        const lowGross = cfg.tareKg + cfg.capacityKg * 0.12 + (Math.random() - 0.5) * 0.01;
        const { lpgKg, percent } = lpgFromGross(lowGross, cfg);
        setReading({
          ts: Date.now(),
          grossKg: lowGross,
          lpgKg,
          percent,
          gasPpm: Math.round(200 + Math.random() * 40),
          batteryPct: 78,
          rssi: -60,
          source: "simulated",
          scenario,
        });
        return;
      }

      // Normal simulation scenario
      gross.current -= 0.0004 + Math.random() * 0.0004;
      if (gross.current < cfg.tareKg + 0.5) {
        gross.current = cfg.tareKg + cfg.capacityKg * 0.72; // Reset loop if exhausted
      }
      const noisy = gross.current + (Math.random() - 0.5) * 0.01;
      const { lpgKg, percent } = lpgFromGross(noisy, cfg);
      setReading({
        ts: Date.now(),
        grossKg: noisy,
        lpgKg,
        percent,
        gasPpm: Math.round(195 + Math.random() * 55),
        batteryPct: 88,
        rssi: -58 - Math.round(Math.random() * 4),
        source: navigator.onLine ? "simulated" : "offline",
        scenario,
      });
    };

    const first = setTimeout(tick, 100);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [cfg, intervalMs, scenario]);

  const updateScenario = (s: SimulationScenario) => {
    setScenario(s);
    saveSavedScenario(s);
  };

  const updateConfig = (newCfg: CylinderConfig) => {
    setCfg(newCfg);
    saveConfig(newCfg);
    gross.current = newCfg.tareKg + newCfg.capacityKg * 0.62;
  };

  return { reading, online, cfg, scenario, updateScenario, updateConfig };
}
