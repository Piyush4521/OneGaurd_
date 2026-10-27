import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Download,
  Flame,
  Info,
  RefreshCw,
  Scale,
  Settings2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Screen, rise, stagger } from "@/components/app/AppShell";
import { CYLINDER_PRESETS, CylinderPreset, useTelemetry } from "@/lib/telemetry";
import { playChirp } from "@/lib/alarm-audio";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Calibration | OneGuard LPG" },
      { name: "description", content: "Configure cylinder tare weight, presets, and ESP32 hardware pairing." },
      { property: "og:title", content: "Settings & Calibration | OneGuard LPG" },
      { property: "og:description", content: "Configure cylinder tare weight, presets, and ESP32 hardware pairing." },
    ],
  }),
  component: Settings,
});

type BIPEvent = Event & { prompt: () => Promise<void> };

function Settings() {
  const { cfg, updateConfig, reading, deviceId, updateDeviceId } = useTelemetry();
  const [tare, setTare] = useState(String(cfg.tareKg));
  const [cap, setCap] = useState(String(cfg.capacityKg));
  const [devId, setDevId] = useState(deviceId);
  const [saved, setSaved] = useState(false);
  const [install, setInstall] = useState<BIPEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [tareSuccess, setTareSuccess] = useState(false);

  useEffect(() => {
    setTare(String(cfg.tareKg));
    setCap(String(cfg.capacityKg));
  }, [cfg]);

  useEffect(() => {
    if (deviceId) setDevId(deviceId);
  }, [deviceId]);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstall(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", h);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  const handleApplyPreset = (preset: CylinderPreset) => {
    playChirp("success");
    setTare(String(preset.tareKg));
    setCap(String(preset.capacityKg));
    updateConfig({
      tareKg: preset.tareKg,
      capacityKg: preset.capacityKg,
      presetName: preset.shortName,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTare = parseFloat(tare);
    const parsedCap = parseFloat(cap);
    if (!isNaN(parsedTare) && !isNaN(parsedCap) && parsedTare > 0 && parsedCap > 0) {
      playChirp("success");
      updateConfig({
        tareKg: parsedTare,
        capacityKg: parsedCap,
        presetName: `${parsedCap.toFixed(1)} KG CUSTOM`,
      });
      if (devId && devId.trim().length > 0 && updateDeviceId) {
        updateDeviceId(devId.trim());
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleZeroTareCalibration = () => {
    playChirp("tap");
    setIsCalibrating(true);
    setTareSuccess(false);
    setTimeout(() => {
      playChirp("success");
      setIsCalibrating(false);
      setTareSuccess(true);
      setTimeout(() => setTareSuccess(false), 4000);
    }, 2500);
  };

  const activePreset = CYLINDER_PRESETS.find((p) => p.capacityKg === cfg.capacityKg) ?? CYLINDER_PRESETS[0]!;

  return (
    <Screen kicker="Hardware & Configuration" title="Device Setup">
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
        {/* Authentic Indian Cylinder Metal Neck Tag Visualizer */}
        <motion.section
          variants={rise}
          className="tile col-span-2 flex flex-col items-center justify-between gap-4 border-3 border-ink bg-paper p-5 shadow-[4px_4px_0px_var(--ink)] sm:flex-row"
        >
          <div className="flex items-center gap-4">
            {/* Visual Metal Neck Collar Stamp */}
            <div
              className="flex h-20 w-28 shrink-0 flex-col items-center justify-center rounded-xl border-3 border-ink text-paper shadow-[3px_3px_0px_var(--ink)]"
              style={{ backgroundColor: activePreset.color }}
            >
              <span className="font-mono text-[9px] font-black uppercase tracking-widest text-paper/90">NECK STAMP</span>
              <p className="font-display text-base font-black text-paper leading-tight">D-26</p>
              <div className="mt-1 border-t border-paper/40 pt-0.5 text-center font-mono text-[10px] font-bold">
                TARE {cfg.tareKg} KG
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="label-xs">Active Cylinder Profile</span>
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[9px] font-black text-ink">
                  AUTHENTICATED
                </span>
              </div>
              <h2 className="font-display text-xl font-black text-ink">{activePreset.name}</h2>
              <p className="font-mono text-xs text-muted-foreground">
                Tare: {cfg.tareKg} kg • Rated LPG Fill: {cfg.capacityKg} kg • Total Gross: {(cfg.tareKg + cfg.capacityKg).toFixed(1)} kg
              </p>
            </div>
          </div>

          {/* Zero-Tare Offset Calibration Trigger */}
          <button
            onClick={handleZeroTareCalibration}
            disabled={isCalibrating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-accent px-4 py-2.5 font-display text-xs font-black text-ink shadow-[2px_2px_0px_var(--ink)] press disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isCalibrating ? "animate-spin" : ""}`} />
            {isCalibrating ? "Zeroing Sensor Stand..." : tareSuccess ? "✓ Stand Offset Zeroed!" : "Zero Stand (Tare)"}
          </button>
        </motion.section>

        {/* Cylinder Preset Quick Selectors */}
        <motion.section variants={rise} className="glass tile col-span-2 border-3 border-ink shadow-[4px_4px_0px_var(--ink)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="label-xs">Cylinder Presets</p>
              <h3 className="font-display text-base font-black text-ink">Choose Standard Indian LPG Tank</h3>
            </div>
            <Sparkles className="h-5 w-5 text-accent" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CYLINDER_PRESETS.map((p) => {
              const isSelected = cfg.capacityKg === p.capacityKg;
              return (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className={`flex flex-col justify-between rounded-xl border-2 border-ink p-3.5 text-left transition-all ${
                    isSelected
                      ? "bg-accent shadow-[4px_4px_0px_var(--ink)] scale-[1.02]"
                      : "bg-paper hover:bg-paper/90 shadow-[2px_2px_0px_var(--ink)] opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black" style={{ color: p.color }}>
                      ● {p.shortName}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-ink stroke-[3]" />}
                  </div>
                  <p className="mt-2 font-display text-sm font-black text-ink">{p.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 font-mono text-[10px]">
                    <span>Tare: {p.tareKg} kg</span>
                    <span>Cap: {p.capacityKg} kg</span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* Manual Tare & Capacity Calibration Form */}
        <motion.form variants={rise} className="glass tile space-y-3 border-2 border-ink shadow-[3px_3px_0px_var(--ink)]" onSubmit={handleManualSave}>
          <div className="flex items-center justify-between mb-1">
            <p className="label-xs">Manual Fine-Tuning</p>
            <span className="font-mono text-[10px] text-muted-foreground">Stamped on cylinder neck</span>
          </div>

          <Field
            label="Tare Weight (Empty Cylinder kg)"
            hint="Typically 15.1 - 15.8 kg for domestic steel tanks"
            value={tare}
            onChange={setTare}
          />
          <Field
            label="LPG Rated Fill Mass (kg)"
            hint="14.2 kg for domestic, 19.0 kg for commercial"
            value={cap}
            onChange={setCap}
          />
          <Field
            label="Firebase Device ID"
            hint="Hardware device node in RTDB (default: oneguard_kitchen_01)"
            value={devId}
            onChange={setDevId}
          />

          <button
            type="submit"
            className="w-full rounded-xl border-2 border-ink bg-primary py-3 font-display text-sm font-black text-paper shadow-[3px_3px_0px_var(--ink)] press"
          >
            {saved ? "✓ Configuration Saved!" : "Save Custom Parameters"}
          </button>
        </motion.form>

        {/* ESP32 Hardware Diagnostics & Status */}
        <motion.section variants={rise} className="glass tile flex flex-col justify-between border-2 border-ink shadow-[3px_3px_0px_var(--ink)]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="label-xs">OneGuard IoT Ring Status</p>
              <span className="rounded bg-safe px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                READY
              </span>
            </div>

            <div className="space-y-2">
              <DiagRow
                icon={Scale}
                name="HX711 24-Bit ADC (GPIO 25 / 26)"
                status={reading?.grossKg != null ? "Active" : "Ready"}
                detail="DOUT: GPIO 25 • SCK: GPIO 26"
              />
              <DiagRow
                icon={Flame}
                name="MQ-6 Gas Sensor (AO: 34 / DO: 27)"
                status={reading?.leakState === "SENSOR_FAULT" ? "Fault" : "Armed"}
                detail="Analog: GPIO 34 (2:1 divider) • Digital: GPIO 27"
              />
              <DiagRow
                icon={Cpu}
                name="DS3231 Precision RTC (I2C 21 / 22)"
                status="Synced"
                detail="SDA: GPIO 21 • SCL: GPIO 22"
              />
              <DiagRow
                icon={ShieldCheck}
                name="Physical Buzzer"
                status="Not Installed"
                detail="No buzzer GPIO • PWA Web Audio siren active"
              />
            </div>
          </div>

          {/* PWA Install Button */}
          <div className="mt-4 pt-3 border-t border-ink/10">
            {isInstalled ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-ink bg-safe/60 py-2.5 font-mono text-xs font-bold text-ink">
                <CheckCircle2 className="h-4 w-4" /> App Installed on Device
              </div>
            ) : (
              <button
                disabled={!install}
                onClick={() => {
                  playChirp("tap");
                  install?.prompt();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-accent py-2.5 font-display text-xs font-black text-ink shadow-[2px_2px_0px_var(--ink)] press disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Install as Offline PWA App
              </button>
            )}
            {!install && !isInstalled && (
              <p className="mt-1 text-center font-mono text-[10px] text-muted-foreground">
                To install: Tap Share (iOS) or Menu (Android) → "Add to Home screen"
              </p>
            )}
          </div>
        </motion.section>

        {/* Legal & Compliance Footer */}
        <motion.nav variants={rise} className="glass tile divide-y divide-ink/10 border-2 border-ink shadow-[3px_3px_0px_var(--ink)] md:col-span-2">
          <Row to="/privacy" label="Privacy & Security Policy" />
          <Row to="/terms" label="Safety Guidelines & Disclaimer (Prototype Device)" />
        </motion.nav>
      </motion.div>
    </Screen>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border-2 border-ink bg-paper px-3 py-2 font-mono text-sm font-bold shadow-[2px_2px_0px_var(--ink)] outline-none focus:ring-2 focus:ring-ring"
      />
      <span className="mt-1 block font-mono text-[10px] text-muted-foreground">{hint}</span>
    </label>
  );
}

function DiagRow({
  icon: Icon,
  name,
  status,
  detail,
}: {
  icon: typeof Cpu;
  name: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border-2 border-ink bg-paper/85 p-2 shadow-[1px_1px_0px_var(--ink)]">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-ink" />
        <div>
          <p className="text-xs font-black text-ink">{name}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{detail}</p>
        </div>
      </div>
      <span className="font-mono text-[11px] font-bold text-safe">{status}</span>
    </div>
  );
}

function Row({ to, label }: { to: "/privacy" | "/terms"; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between py-3 font-semibold text-sm hover:text-primary">
      {label} <ChevronRight className="h-4 w-4" />
    </Link>
  );
}
