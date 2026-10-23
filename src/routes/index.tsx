import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  BatteryCharging,
  BatteryMedium,
  CheckCircle2,
  Clock,
  Flame,
  Phone,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
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
  SimulationScenario,
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
  const { reading, online, cfg, scenario, updateScenario } = useTelemetry();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const [isSirenActive, setIsSirenActive] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pct = reading?.percent ?? 0;
  const level = reading ? gasLevel(reading.gasPpm) : "safe";
  const days = reading ? estimateDaysLeft(reading.lpgKg, SAMPLE_DAILY) : null;
  const ago = reading ? Math.max(0, Math.round((now - reading.ts) / 1000)) : null;

  // Auto-trigger audible alarm when critical leak occurs
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

  const status = getHinglishStatus(pct, level, reading?.source ?? "simulated");

  // Find cylinder preset details
  const activePreset = CYLINDER_PRESETS.find((p) => p.capacityKg === cfg.capacityKg) ?? CYLINDER_PRESETS[0]!;

  return (
    <Screen
      kicker={`${status.greeting} • Kitchen Cylinder`}
      title="OneGuard Live"
      right={
        <div className="flex items-center gap-2">
          {level === "alarm" && (
            <button
              onClick={toggleSiren}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 font-mono text-xs font-bold text-destructive-foreground brutal-sm press"
            >
              {isSirenActive ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {isSirenActive ? "Mute Siren" : "Sound Siren"}
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
            className="mb-4 overflow-hidden rounded-2xl border-3 border-ink bg-destructive p-4 text-destructive-foreground shadow-[4px_4px_0px_#1d1a17]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-8 w-8 shrink-0 animate-bounce" />
                <div>
                  <p className="font-display text-xl font-black uppercase tracking-tight md:text-2xl">
                    🚨 Gas Leak Detected! ({reading?.gasPpm} PPM)
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-destructive-foreground/90">
                    Regulator knob band karein • Khidkiyan kholo • Electrical switch na chalayein • Immediate 1906 par call karein.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href="tel:1906"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-black text-ink shadow-[2px_2px_0px_#1d1a17] press"
                >
                  <Phone className="h-4 w-4" /> Call 1906 Helpline
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cultural Hinglish Context Card & Interactive Demo Switcher */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border-2 border-ink bg-paper/90 px-3.5 py-2.5 shadow-[2px_2px_0px_#1d1a17]">
          <span className="text-xl" role="img" aria-label="Status icon">
            {status.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink">{status.headline}</p>
            <p className="font-mono text-xs text-muted-foreground">{status.subtext}</p>
          </div>
        </div>

        {/* Demo Scenario Pill Selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => {
              playChirp("tap");
              setShowSimMenu((v) => !v);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-ink bg-accent px-3 py-2 font-mono text-xs font-bold text-ink shadow-[2px_2px_0px_#1d1a17] press md:w-auto"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Scenario: {scenario.toUpperCase().replace("_", " ")}</span>
            <span className="text-[10px]">▼</span>
          </button>

          <AnimatePresence>
            {showSimMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border-2 border-ink bg-paper p-1.5 shadow-[4px_4px_0px_#1d1a17]"
              >
                <p className="px-2 py-1 font-mono text-[10px] font-bold uppercase text-muted-foreground">Test Hardware States</p>
                {(
                  [
                    { id: "normal", label: "🟢 Normal (62% Safe)", desc: "Steady reading" },
                    { id: "low_gas", label: "🟡 Low Gas (12%)", desc: "Refill warning" },
                    { id: "leak_emergency", label: "🚨 Gas Leak (Alarm)", desc: ">2400 ppm alert" },
                    { id: "sensor_fault", label: "⚠️ Sensor Fault", desc: "HX711 disconnect" },
                    { id: "offline", label: "📡 Offline Mode", desc: "Network timeout" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      playChirp("success");
                      updateScenario(item.id as SimulationScenario);
                      setShowSimMenu(false);
                    }}
                    className={`flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                      scenario === item.id ? "bg-accent font-bold" : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{item.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-[auto_auto_auto]">
        {/* 3D Cylinder Hero Tile */}
        <motion.section
          variants={rise}
          className="glass tile relative col-span-2 row-span-2 flex min-h-[390px] flex-col justify-between overflow-hidden md:min-h-[460px]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="label-xs">LPG Gas Remaining</p>
              <div className="flex items-baseline gap-1">
                <p className="font-display text-6xl font-black leading-none tabular-nums md:text-7xl">
                  {reading ? Math.round(pct) : "--"}
                </p>
                <span className="font-display text-3xl font-black">%</span>
              </div>
              <p className="mt-1 font-mono text-sm">
                {reading ? (
                  <>
                    <span className="font-bold text-ink">{reading.lpgKg.toFixed(2)} kg</span> net LPG of {cfg.capacityKg} kg
                  </>
                ) : (
                  "Waiting for reading..."
                )}
              </p>
            </div>
            <Link
              to="/settings"
              className="rounded-md border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[11px] font-bold text-paper transition-transform active:scale-95"
            >
              {activePreset.shortName}
            </Link>
          </div>

          {/* 3D Model View */}
          <div className="relative -mx-4 my-auto h-64 md:h-72">
            {mounted && (
              <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center font-mono text-xs">Loading 3D Engine...</div>}>
                <Cylinder3D fill={pct / 100} shellColor={activePreset.color} isAlarm={level === "alarm"} />
              </Suspense>
            )}
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
            <div className="h-3.5 overflow-hidden rounded-md border-2 border-ink bg-ink/10 shadow-[1px_1px_0px_#1d1a17]">
              <motion.div
                className={`h-full ${
                  level === "alarm"
                    ? "bg-destructive"
                    : pct < 15
                    ? "bg-destructive"
                    : pct < 25
                    ? "bg-warn"
                    : "bg-primary"
                }`}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </motion.section>

        {/* Leak status tile */}
        <motion.section
          variants={rise}
          className={`tile col-span-2 flex items-center gap-4 border-3 border-ink shadow-[4px_4px_0px_#1d1a17] ${
            level === "alarm"
              ? "!bg-destructive text-destructive-foreground animate-pulse"
              : level === "warn"
              ? "!bg-warn text-ink"
              : "!bg-safe text-ink"
          }`}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-paper shadow-[2px_2px_0px_#1d1a17]">
            {level === "alarm" ? (
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
              {level === "safe" && <CheckCircle2 className="h-3.5 w-3.5" />}
            </div>
            <p className="font-display text-2xl font-black leading-tight">
              {level === "alarm" ? "Gas Leak! Khidkiyan Kholo" : level === "warn" ? "Gas Smell Detected" : "Sab Theek Hai"}
            </p>
            <p className="font-mono text-[11px] opacity-90">
              {level === "alarm"
                ? "Immediate hazard (>2000 ppm)"
                : level === "warn"
                ? "Above warning threshold (>1000 ppm)"
                : "Air quality clean & normal"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-black tabular-nums">{reading?.gasPpm ?? "--"}</p>
            <p className="font-mono text-[11px] uppercase">PPM</p>
          </div>
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
          value={reading ? reading.grossKg.toFixed(2) : "--"}
          unit="kg"
          note={`Tare: ${cfg.tareKg} kg • Net: ${reading ? reading.lpgKg.toFixed(2) : "--"} kg`}
        />

        {/* Device Health & Connectivity Bar */}
        <motion.section variants={rise} className="glass tile col-span-2 grid grid-cols-3 gap-2 md:col-span-3">
          <Mini
            icon={online && reading?.source !== "offline" ? Wifi : WifiOff}
            label="Network"
            value={online && reading?.source !== "offline" ? `${reading?.rssi ?? "--"} dBm` : "Offline"}
            sub={online ? "Wi-Fi Connected" : "Check Router"}
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
            className="tile flex h-full items-center justify-between gap-3 border-2 border-ink bg-primary shadow-[4px_4px_0px_#1d1a17] press"
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
    <motion.section variants={rise} className="glass tile flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <p className="label-xs">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-ink bg-paper/60">
          <Icon className="h-4 w-4 text-ink" />
        </div>
      </div>
      <div>
        <p className="font-display text-4xl font-black leading-none tabular-nums">
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
    <div className="rounded-xl border-2 border-ink bg-paper/80 p-3 shadow-[2px_2px_0px_#1d1a17]">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-ink" />
        <span className="label-xs">{label}</span>
      </div>
      <p className="mt-2 font-mono text-base font-black tabular-nums text-ink">{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
