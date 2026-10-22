import { useEffect, useRef, useState } from "react";

/**
 * Data source of a reading. Until the ESP32 + Firebase link is configured,
 * every reading is "simulated" and the UI must say so.
 */
export type DataSource = "live" | "simulated" | "stale" | "offline" | "fault";

export type CylinderConfig = { tareKg: number; capacityKg: number };

export type Reading = {
  ts: number;
  grossKg: number;
  lpgKg: number;
  percent: number;
  gasPpm: number;
  batteryPct: number;
  rssi: number;
  source: DataSource;
};

export const DEFAULT_CONFIG: CylinderConfig = { tareKg: 15.3, capacityKg: 14.2 };
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

export function useTelemetry(cfg: CylinderConfig = DEFAULT_CONFIG, intervalMs = 2000) {
  const gross = useRef(cfg.tareKg + cfg.capacityKg * 0.62);
  const [reading, setReading] = useState<Reading | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    const tick = () => {
      gross.current -= 0.0004 + Math.random() * 0.0004;
      const noisy = gross.current + (Math.random() - 0.5) * 0.01;
      const { lpgKg, percent } = lpgFromGross(noisy, cfg);
      setReading({
        ts: Date.now(),
        grossKg: noisy,
        lpgKg,
        percent,
        gasPpm: Math.round(180 + Math.random() * 60),
        batteryPct: 86,
        rssi: -58 - Math.round(Math.random() * 6),
        source: navigator.onLine ? "simulated" : "offline",
      });
    };
    const first = setTimeout(tick, 900);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [cfg, intervalMs]);

  return { reading, online };
}
