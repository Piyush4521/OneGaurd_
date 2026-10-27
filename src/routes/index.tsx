import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  BatteryMedium,
  CheckCircle2,
  Clock,
  Coffee,
  Eye,
  Flame,
  Phone,
  Radio,
  RotateCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Utensils,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Screen, SourceBadge, rise, stagger } from "@/components/app/AppShell";
import {
  CYLINDER_PRESETS,
  DEFAULT_CONFIG,
  LEAK_ALARM_PPM,
  LEAK_WARN_PPM,
  SAMPLE_DAILY,
  estimateDaysLeft,
  gasLevel,
  getHinglishStatus,
  useTelemetry,
} from "@/lib/telemetry";
import { playChirp, startEmergencySiren, stopEmergencySiren } from "@/lib/alarm-audio";

const Cylinder3D = lazy(() => import("@/components/app/Cylinder3D"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OneGuard LPG | Smart Cylinder Monitor" },
      { name: "description", content: "Real-time LPG gas level, leak detection, and smart refill forecasting." },
      { property: "og:title", content: "OneGuard LPG | Smart Cylinder Monitor" },
      { property: "og:description", content: "Real-time LPG gas level, leak detection, and smart refill forecasting." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { reading, online, cfg, deviceId } = useTelemetry();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [modelAngle, setModelAngle] = useState<"front" | "iso" | "top">("iso");

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pct = reading?.percent ?? null;
  const level: "safe" | "warn" | "alarm" =
    reading?.leakState === "LEAK_ALARM"
      ? "alarm"
      : reading?.leakState === "WARNING"
      ? "warn"
      : reading?.gasPpm != null
      ? gasLevel(reading.gasPpm)
      : "safe";

  const days = reading?.lpgKg != null ? estimateDaysLeft(reading.lpgKg, SAMPLE_DAILY) : null;
  const ago = reading?.ts ? Math.max(0, Math.round((now - reading.ts) / 1000)) : null;

  // Auto-trigger browser audible alarm when critical leak occurs
  useEffect(() => {
    if (level === "alarm" && !isSirenActive) {
      startEmergencySiren();
      setIsSirenActive(true);
    } else if (level !== "alarm" && isSirenActive) {
      stopEmergencySiren();
      setIsSirenActive(false);
    }
  }, [level, isSirenActive]);

  const toggleSiren = () => {
    if (isSirenActive) {
      stopEmergencySiren();
      setIsSirenActive(false);
    } else {
      startEmergencySiren();
      setIsSirenActive(true);
    }
  };

  const status = getHinglishStatus(pct, level, reading?.source ?? "offline", reading?.leakState);
  const activePreset = CYLINDER_PRESETS.find((p) => p.capacityKg === cfg.capacityKg) ?? CYLINDER_PRESETS[0]!;

  const netLpgKg = reading?.lpgKg ?? null;
  const approxChaiCups = netLpgKg !== null ? Math.max(0, Math.round(netLpgKg * 58)) : null;
  const approxMeals = netLpgKg !== null ? Math.max(0, Math.round(netLpgKg * 2.6)) : null;
  const approxBurnHours = netLpgKg !== null ? Math.max(0, netLpgKg * 3.3).toFixed(1) : null;

  return (
    <Screen
      kicker={`${status.greeting} • Kitchen Cylinder`}
      title="OneGuard Live"
      right={
        <div className="flex items-center gap-2">
          {level === "alarm" && (
            <button
              onClick={toggleSiren}
              title="Browser Web Audio Siren (Physical buzzer is not installed on hardware)"
              className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-destructive px-3 py-1.5 font-mono text-xs font-bold text-destructive-foreground shadow-[2px_2px_0px_var(--ink)] press"
            >
              {isSirenActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isSirenActive ? "Mute Browser Siren" : "Test Browser Siren"}
            </button>
          )}
          <SourceBadge source={reading?.source ?? "connecting"} />
        </div>
      }
    >
      {/* Critical Emergency Banner */}
      <AnimatePresence>
        {level === "alarm" && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-4 overflow-hidden rounded-2xl border-3 border-ink bg-destructive p-4 text-destructive-foreground shadow-[4px_4px_0px_var(--ink)]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-8 w-8 shrink-0 animate-bounce" />
                <div>
                  <p className="font-display text-xl font-black uppercase tracking-tight md:text-2xl">
                    🚨 Gas Leak Detected! {reading?.gasDo === 0 ? "(DO Triggered)" : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-destructive-foreground/90">
                    Regulator knob band karein • Khidkiyan kholo • Electrical switches mat chhuyein • Call 1906 immediately.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href="tel:1906"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-black text-ink shadow-[2px_2px_0px_var(--ink)] press"
                >
                  <Phone className="h-4 w-4" /> Call 1906 Helpline
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cultural Hinglish Context Card & Interactive Operating Mode Switcher */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border-2 border-ink bg-paper/90 px-3.5 py-2.5 shadow-[2px_2px_0px_var(--ink)]">
          <span className="text-xl" role="img" aria-label="Status icon">
            {status.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink">{status.headline}</p>
            <p className="font-mono text-xs text-muted-foreground">{status.subtext}</p>
          </div>
        </div>

        {/* Real Hardware Pairing Badge */}
        <div className="relative shrink-0">
          <Link
            to="/settings"
            onClick={() => playChirp("tap")}
            className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-ink bg-accent px-3 py-2 font-mono text-xs font-bold text-ink shadow-[2px_2px_0px_var(--ink)] press md:w-auto"
          >
            <Radio className={`h-3.5 w-3.5 ${reading?.source === "live" ? "text-safe animate-pulse" : "text-ink"}`} />
            <span>ID: {deviceId}</span>
            <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-black uppercase text-ink">
              {reading?.source ?? "offline"}
            </span>
          </Link>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-[auto_auto_auto]">
        {/* 3D Cylinder Hero Tile */}
        <motion.section
          variants={rise}
          className="glass tile relative col-span-2 row-span-2 flex min-h-[420px] flex-col justify-between overflow-hidden border-3 border-ink shadow-[4px_4px_0px_var(--ink)] md:min-h-[480px]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="label-xs">LPG Gas Remaining</p>
              <div className="flex items-baseline gap-1">
                <p className="font-display text-6xl font-black leading-none tabular-nums text-ink md:text-7xl">
                  {pct !== null ? Math.round(pct) : "--"}
                </p>
                <span className="font-display text-3xl font-black text-ink">%</span>
              </div>
              <p className="mt-1 font-mono text-sm">
                {netLpgKg !== null ? (
                  <>
                    <span className="font-bold text-ink">{netLpgKg.toFixed(2)} kg</span> net LPG of {cfg.capacityKg} kg
                  </>
                ) : (
                  <span className="font-bold text-destructive">Weight Sensor Disconnected / Fault</span>
                )}
              </p>
            </div>

            <Link
              to="/settings"
              onClick={() => playChirp("tap")}
              className="rounded-md border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper transition-transform active:scale-95"
            >
              {activePreset.shortName}
            </Link>
          </div>

          {/* Cultural Metric Chips */}
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-ink/20 bg-paper/90 px-2 py-1 text-ink shadow-[1px_1px_0px_var(--ink)]">
              <Coffee className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-mono text-[10px] font-bold leading-tight">
                {approxChaiCups !== null ? `~${approxChaiCups} Chai ☕` : "-- Chai"}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-ink/20 bg-paper/90 px-2 py-1 text-ink shadow-[1px_1px_0px_var(--ink)]">
              <Utensils className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="font-mono text-[10px] font-bold leading-tight">
                {approxMeals !== null ? `~${approxMeals} Meals 🍲` : "-- Meals"}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-ink/20 bg-paper/90 px-2 py-1 text-ink shadow-[1px_1px_0px_var(--ink)]">
              <Flame className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="font-mono text-[10px] font-bold leading-tight">
                {approxBurnHours !== null ? `~${approxBurnHours}h Burn 🔥` : "--h Burn"}
              </span>
            </div>
          </div>

          {/* 3D Model Viewport with Interactive HUD Overlay */}
          <div className="relative -mx-4 my-auto h-64 md:h-72">
            {mounted && (
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center font-mono text-xs">Loading 3D Engine...</div>}>
                <Cylinder3D fill={pct !== null ? pct / 100 : 0} shellColor={activePreset.color} isAlarm={level === "alarm"} />
              </Suspense>
            )}

            {/* Quick 3D Angle Switcher HUD */}
            <div className="absolute bottom-2 right-4 flex items-center gap-1 rounded-lg border-2 border-ink bg-paper/90 p-1 shadow-[2px_2px_0px_var(--ink)] backdrop-blur-sm">
              <span className="px-1 font-mono text-[9px] font-bold uppercase text-muted-foreground">Angle</span>
              {(["front", "iso", "top"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    playChirp("tap");
                    setModelAngle(a);
                  }}
                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase transition-colors ${
                    modelAngle === a ? "bg-accent text-ink" : "text-muted-foreground hover:text-ink"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Progress gauge with level marks */}
          <div>
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>0% Empty</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% Full</span>
            </div>
            <div className="h-3.5 overflow-hidden rounded-md border-2 border-ink bg-ink/10 shadow-[1px_1px_0px_var(--ink)]">
              <motion.div
                className={`h-full ${
                  level === "alarm"
                    ? "bg-destructive"
                    : pct !== null && pct < 15
                    ? "bg-destructive"
                    : pct !== null && pct < 25
                    ? "bg-warn"
                    : "bg-primary"
                }`}
                animate={{ width: `${pct ?? 0}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </motion.section>

        {/* MQ-6 Gas Sensor Tile: Separate AO & DO states */}
        <motion.section
          variants={rise}
          className={`tile col-span-2 flex flex-col justify-between border-3 border-ink shadow-[4px_4px_0px_var(--ink)] ${
            reading?.leakState === "SENSOR_FAULT"
              ? "!bg-muted text-ink"
              : level === "alarm"
              ? "!bg-destructive text-destructive-foreground animate-pulse"
              : level === "warn"
              ? "!bg-warn text-ink"
              : "!bg-safe text-ink"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-paper shadow-[2px_2px_0px_var(--ink)]">
              {reading?.leakState === "SENSOR_FAULT" ? (
                <AlertTriangle className="h-7 w-7 text-ink" strokeWidth={2.4} />
              ) : level === "alarm" ? (
                <ShieldAlert className="h-7 w-7 text-destructive" strokeWidth={2.4} />
              ) : level === "warn" ? (
                <AlertTriangle className="h-7 w-7 text-ink" strokeWidth={2.4} />
              ) : (
                <ShieldCheck className="h-7 w-7 text-safe" strokeWidth={2.4} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider">MQ-6 Gas Sensor</span>
                <span className="rounded border border-ink/30 bg-paper/80 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-ink">
                  {reading?.leakState ?? "SAFE"}
                </span>
              </div>
              <p className="font-display text-xl font-black leading-tight md:text-2xl">
                {reading?.leakState === "SENSOR_FAULT"
                  ? "Sensor Fault / Check MQ-6"
                  : level === "alarm"
                  ? "Gas Leak! Khidkiyan Kholo"
                  : level === "warn"
                  ? "Gas Smell Detected"
                  : "Sab Theek Hai"}
              </p>
              <p className="font-mono text-[10px] opacity-90">
                {reading?.leakState === "SENSOR_FAULT"
                  ? "Analog/Digital connection fault on GPIO 34/27"
                  : level === "alarm"
                  ? "Immediate leak trip (DO Low or AO >2000 ppm)"
                  : level === "warn"
                  ? "Above warning threshold (>1000 ppm)"
                  : "Sensor indication normal & clean"}
              </p>
            </div>
          </div>

          {/* Separate AO Analog & DO Digital Sensor Panels */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border-2 border-ink bg-paper/90 p-2 shadow-[1px_1px_0px_var(--ink)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">Analog (AO)</span>
                <span className="font-mono text-[9px] text-ink font-bold">GPIO 34</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <p className="font-mono text-lg font-black text-ink tabular-nums">
                  {reading?.gasRaw !== null && reading?.gasRaw !== undefined ? reading.gasRaw : "--"}
                </p>
                <span className="font-mono text-[10px] text-muted-foreground">/ 4095</span>
              </div>
              <p className="font-mono text-[9px] text-muted-foreground truncate">
                {reading?.gasPpm !== null && reading?.gasPpm !== undefined ? `~${reading.gasPpm} PPM equiv` : "Awaiting ADC"}
              </p>
            </div>

            <div className="rounded-lg border-2 border-ink bg-paper/90 p-2 shadow-[1px_1px_0px_var(--ink)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase text-muted-foreground">Digital (DO)</span>
                <span className="font-mono text-[9px] text-ink font-bold">GPIO 27</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <p
                  className={`font-mono text-base font-black truncate ${
                    reading?.gasDo === 0 ? "text-destructive" : reading?.gasDo === 1 ? "text-safe" : "text-ink"
                  }`}
                >
                  {reading?.gasDo === 0 ? "TRIP (0)" : reading?.gasDo === 1 ? "SAFE (1)" : "--"}
                </p>
              </div>
              <p className="font-mono text-[9px] text-muted-foreground truncate">
                LM393 Active-LOW
              </p>
            </div>
          </div>

          <p className="mt-1.5 text-center font-mono text-[9px] text-ink/70">
            Relative sensor response indication • Not certified laboratory PPM
          </p>
        </motion.section>

        {/* Stat: Refill in */}
        <Stat
          icon={Clock}
          label="Refill in"
          value={days !== null ? `~${days}` : "--"}
          unit="days"
          note={days !== null ? `Runout: Day ${days}` : "Need 3+ days history"}
        />

        {/* Stat: Gross weight */}
        <Stat
          icon={Scale}
          label="Gross weight"
          value={reading?.grossKg !== null && reading?.grossKg !== undefined ? reading.grossKg.toFixed(2) : "--"}
          unit="kg"
          note={
            reading?.grossKg !== null && reading?.grossKg !== undefined
              ? `Tare: ${cfg.tareKg} kg • Net: ${reading.lpgKg !== null ? reading.lpgKg.toFixed(2) : "--"} kg`
              : "HX711 Disconnected / Check GPIO 25 & 26"
          }
        />

        {/* Device Health & Connectivity Bar */}
        <motion.section variants={rise} className="glass tile col-span-2 grid grid-cols-3 gap-2 border-2 border-ink shadow-[3px_3px_0px_var(--ink)] md:col-span-3">
          <Mini
            icon={online && reading?.source !== "offline" ? Wifi : WifiOff}
            label="Network"
            value={online && reading?.source !== "offline" ? `${reading?.rssi ?? "--"} dBm` : "Offline"}
            sub={reading?.source === "live" ? "ESP32 Live" : reading?.source === "stale" ? "Data Stale (>60s)" : reading?.source === "fault" ? "Sensor Fault" : "ESP32 Offline"}
          />
          <Mini
            icon={reading && reading.batteryPct > 90 ? BatteryCharging : BatteryMedium}
            label="Battery"
            value={reading ? `${reading.batteryPct}%` : "--"}
            sub="3.7V Li-ion"
          />
          <Mini
            icon={Flame}
            label="Last sync"
            value={ago !== null ? `${ago}s ago` : "--"}
            sub={ago !== null && ago < 10 ? "Live Streaming" : "Waiting for ping"}
          />
        </motion.section>

        {/* Emergency SOS Contact Direct Action */}
        <motion.div variants={rise} className="col-span-2 md:col-span-1">
          <Link
            to="/alerts"
            onClick={() => playChirp("tap")}
            className="tile flex h-full items-center justify-between gap-3 border-2 border-ink bg-primary shadow-[4px_4px_0px_var(--ink)] press"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-paper">
                <Phone className="h-5 w-5 text-ink" strokeWidth={2.4} />
              </div>
              <div>
                <p className="font-display text-base font-black leading-tight text-paper">Emergency Hub</p>
                <p className="font-mono text-[11px] text-paper/80">Helpline & Contacts</p>
              </div>
            </div>
            <span className="font-mono text-lg font-bold text-paper">→</span>
          </Link>
        </motion.div>
      </motion.div>
    </Screen>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  note,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  unit: string;
  note: string;
}) {
  return (
    <motion.section variants={rise} className="glass tile flex flex-col justify-between gap-4 border-2 border-ink shadow-[3px_3px_0px_var(--ink)]">
      <div className="flex items-center justify-between">
        <p className="label-xs">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-ink bg-paper/60">
          <Icon className="h-4 w-4 text-ink" />
        </div>
      </div>
      <div>
        <p className="font-display text-4xl font-black leading-none tabular-nums text-ink">
          {value}
          <span className="ml-1 text-base font-bold">{unit}</span>
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{note}</p>
      </div>
    </motion.section>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border-2 border-ink bg-paper/80 p-3 shadow-[2px_2px_0px_var(--ink)]">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-ink" />
        <span className="label-xs">{label}</span>
      </div>
      <p className="mt-2 font-mono text-base font-black tabular-nums text-ink">{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
