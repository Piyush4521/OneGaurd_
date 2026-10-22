import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BatteryMedium, Clock, Flame, Phone, Scale, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { Screen, SourceBadge, rise, stagger } from "@/components/app/AppShell";
import { DEFAULT_CONFIG, LEAK_ALARM_PPM, SAMPLE_DAILY, estimateDaysLeft, gasLevel, useTelemetry } from "@/lib/telemetry";

const Cylinder3D = lazy(() => import("@/components/app/Cylinder3D"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OneGuard LPG | Cylinder dashboard" },
      { name: "description", content: "Gas level, leak status and refill estimate for your LPG cylinder." },
      { property: "og:title", content: "OneGuard LPG | Cylinder dashboard" },
      { property: "og:description", content: "Gas level, leak status and refill estimate for your LPG cylinder." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { reading, online } = useTelemetry();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
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

  return (
    <Screen kicker="Kitchen cylinder" title="Namaste" right={<SourceBadge source={reading?.source ?? "connecting"} />}>
      {reading?.source === "simulated" && (
        <p className="mb-4 rounded-lg bg-paper px-3 py-2 font-mono text-xs brutal-sm">
          Demo data. Pair your OneGuard ring to see real readings.
        </p>
      )}

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-[auto_auto_auto]">
        {/* Cylinder hero tile */}
        <motion.section variants={rise} className="glass tile relative col-span-2 row-span-2 flex min-h-[380px] flex-col overflow-hidden md:min-h-[440px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="label-xs">Gas left</p>
              <p className="font-display text-6xl font-black leading-none tabular-nums md:text-7xl">
                {reading ? Math.round(pct) : "--"}<span className="text-3xl">%</span>
              </p>
              <p className="mt-1 font-mono text-sm">{reading ? `${reading.lpgKg.toFixed(2)} kg of ${DEFAULT_CONFIG.capacityKg} kg` : "Waiting for reading"}</p>
            </div>
            <span className="rounded-md bg-ink px-2 py-1 font-mono text-[11px] font-bold text-paper">14.2 KG DOMESTIC</span>
          </div>
          <div className="relative -mx-4 flex-1">
            {mounted && (
              <Suspense fallback={<div className="absolute inset-0 animate-pulse" />}>
                <Cylinder3D fill={pct / 100} />
              </Suspense>
            )}
          </div>
          <div className="h-3 overflow-hidden rounded-sm bg-ink/10 brutal-sm">
            <motion.div className="h-full bg-primary" animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </motion.section>

        {/* Leak status */}
        <motion.section
          variants={rise}
          className={`tile col-span-2 flex items-center gap-4 brutal ${level === "alarm" ? "!bg-destructive text-destructive-foreground" : level === "warn" ? "!bg-warn" : "!bg-safe"}`}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-paper brutal-sm">
            <ShieldCheck className="h-7 w-7" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-bold uppercase">Leak sensor MQ-6</p>
            <p className="font-display text-2xl font-black leading-tight">
              {level === "alarm" ? "Gas leak! Window kholo" : level === "warn" ? "Gas smell detected" : "Sab theek hai"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">{reading?.gasPpm ?? "--"}</p>
            <p className="font-mono text-[11px]">ppm / {LEAK_ALARM_PPM}</p>
          </div>
        </motion.section>

        <Stat icon={Clock} label="Refill in" value={days !== null ? `~${days}` : "--"} unit="days" note="Estimate" />
        <Stat icon={Scale} label="Gross weight" value={reading ? reading.grossKg.toFixed(2) : "--"} unit="kg" note={`Tare ${DEFAULT_CONFIG.tareKg} kg`} />

        <motion.section variants={rise} className="glass tile col-span-2 grid grid-cols-3 gap-2 md:col-span-3">
          <Mini icon={online ? Wifi : WifiOff} label="Network" value={online ? `${reading?.rssi ?? "--"} dBm` : "Offline"} />
          <Mini icon={BatteryMedium} label="Battery" value={reading ? `${reading.batteryPct}%` : "--"} />
          <Mini icon={Flame} label="Last sync" value={ago !== null ? `${ago}s ago` : "--"} />
        </motion.section>

        <motion.div variants={rise} className="col-span-2 md:col-span-1">
          <Link to="/alerts" className="tile flex h-full items-center gap-3 bg-primary brutal press">
            <Phone className="h-6 w-6" strokeWidth={2.4} />
            <span className="font-display text-lg font-black leading-tight">Emergency contacts</span>
          </Link>
        </motion.div>
      </motion.div>
    </Screen>
  );
}

function Stat({ icon: Icon, label, value, unit, note }: { icon: typeof Clock; label: string; value: string; unit: string; note: string }) {
  return (
    <motion.section variants={rise} className="glass tile flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <p className="label-xs">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="font-display text-4xl font-black leading-none tabular-nums">
          {value}<span className="ml-1 text-base font-bold">{unit}</span>
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{note}</p>
      </div>
    </motion.section>
  );
}

function Mini({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper/60 p-3">
      <Icon className="h-4 w-4" />
      <p className="label-xs mt-2">{label}</p>
      <p className="font-mono text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
