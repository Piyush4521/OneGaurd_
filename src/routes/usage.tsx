import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  MessageSquare,
  Milestone,
  Phone,
  ShoppingBag,
  Sliders,
  TrendingDown,
  Utensils,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Screen, rise, stagger } from "@/components/app/AppShell";
import { CYLINDER_PRESETS, SAMPLE_DAILY, estimateDaysLeft, useTelemetry } from "@/lib/telemetry";
import { playChirp } from "@/lib/alarm-audio";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "Usage & Refill Hub | OneGuard LPG" },
      { name: "description", content: "Daily LPG consumption history, meal analysis, and 1-click refill booking." },
      { property: "og:title", content: "Usage & Refill Hub | OneGuard LPG" },
      { property: "og:description", content: "Daily LPG consumption history, meal analysis, and 1-click refill booking." },
    ],
  }),
  component: Usage,
});

const DISTRIBUTORS = [
  {
    name: "Indane Gas",
    org: "Indian Oil Corporation",
    phone: "7718955555",
    whatsapp: "7588888824",
    smsBooking: "REFILL to 7718955555",
    color: "#ea580c",
  },
  {
    name: "Bharat Gas",
    org: "Bharat Petroleum (BPCL)",
    phone: "1800224344",
    whatsapp: "1800224344",
    smsBooking: "LPG to 7715012345",
    color: "#2563eb",
  },
  {
    name: "HP Gas",
    org: "Hindustan Petroleum (HPCL)",
    phone: "18002333555",
    whatsapp: "9222201122",
    smsBooking: "HPGAS to 9222201122",
    color: "#dc2626",
  },
];

function Usage() {
  const { reading, cfg } = useTelemetry();
  const [activeDayIdx, setActiveDayIdx] = useState(SAMPLE_DAILY.length - 1);
  const [cookingHoursDaily, setCookingHoursDaily] = useState(2.5); // Slider: hours per day

  const maxDaily = Math.max(...SAMPLE_DAILY);
  const avgDaily = SAMPLE_DAILY.reduce((a, b) => a + b, 0) / SAMPLE_DAILY.length;

  const currentLpgKg = reading?.lpgKg ?? 8.81;
  const pct = reading?.percent ?? 62;

  // What-If Dynamic Estimation:
  // Standard dual-burner stove burns ~175g (0.175 kg) LPG per hour on medium flame
  const simulatedBurnRatePerDay = Math.max(0.1, cookingHoursDaily * 0.175);
  const simulatedDaysLeft = Math.max(1, Math.floor(currentLpgKg / simulatedBurnRatePerDay));

  const projectedRunout = new Date();
  projectedRunout.setDate(projectedRunout.getDate() + simulatedDaysLeft);
  const runoutFormatted = projectedRunout.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const selectedConsumption = SAMPLE_DAILY[activeDayIdx] ?? 0.45;
  const costPerKg = 60; // Domestic standard ~₹850 for 14.2 kg
  const selectedCost = (selectedConsumption * costPerKg).toFixed(0);

  return (
    <Screen kicker="Analytics & Smart Forecast" title="Consumption Hub">
      {/* Top Refill Milestone Timeline Track */}
      <motion.div
        variants={rise}
        initial="hidden"
        animate="show"
        className="mb-4 rounded-2xl border-3 border-ink bg-paper p-4 shadow-[4px_4px_0px_var(--ink)]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Milestone className="h-4 w-4 text-primary" />
            <p className="font-display text-sm font-black text-ink">Cylinder Lifespan Journey</p>
          </div>
          <span className="font-mono text-xs font-bold text-ink">
            {pct > 20 ? "Safe Cooking Phase" : "⚠️ Reorder Window Active"}
          </span>
        </div>

        {/* Milestone Steps Bar */}
        <div className="relative mt-4">
          <div className="h-3 w-full rounded-full border-2 border-ink bg-ink/10 overflow-hidden">
            <motion.div
              className={`h-full ${pct < 20 ? "bg-destructive" : pct < 35 ? "bg-warn" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-[10px]">
            <div className="text-left">
              <span className="font-bold text-ink">100% Full</span>
              <p className="text-muted-foreground">{cfg.capacityKg} kg</p>
            </div>
            <div className="text-center font-bold text-primary">
              <span>Current: {Math.round(pct)}%</span>
              <p className="text-ink">{currentLpgKg.toFixed(1)} kg left</p>
            </div>
            <div className="text-center">
              <span className="font-bold text-warn">Reorder @ 20%</span>
              <p className="text-muted-foreground">~3 days buffer</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-destructive">0% Empty</span>
              <p className="text-muted-foreground">Day {simulatedDaysLeft}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Interactive 14-Day Bar Chart */}
        <motion.section variants={rise} className="glass tile col-span-2 border-3 border-ink shadow-[4px_4px_0px_var(--ink)] md:col-span-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="label-xs">Selected: Day {activeDayIdx + 1} of 14</p>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-5xl font-black tabular-nums leading-none text-ink">
                  {selectedConsumption.toFixed(2)}
                  <span className="ml-1 text-xl font-bold">kg</span>
                </p>
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  (Cooking cost: ₹{selectedCost})
                </span>
              </div>
            </div>
            <p className="font-mono text-xs text-muted-foreground">Tap any bar to inspect daily burn rate</p>
          </div>

          {/* Bar Chart */}
          <div className="mt-6 flex h-48 items-end gap-2">
            {SAMPLE_DAILY.map((d, i) => {
              const isSelected = i === activeDayIdx;
              const heightPct = (d / maxDaily) * 100;
              return (
                <button
                  key={i}
                  onClick={() => {
                    playChirp("tap");
                    setActiveDayIdx(i);
                  }}
                  aria-label={`Day ${i + 1}: ${d} kg`}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[9px] mb-1 font-bold text-ink">
                    {d}
                  </span>
                  <motion.div
                    className={`w-full rounded-t-lg border-2 border-ink ${
                      isSelected ? "bg-primary shadow-[2px_2px_0px_var(--ink)]" : "bg-paper hover:bg-accent"
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ delay: i * 0.02, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <span className={`mt-1 font-mono text-[10px] ${isSelected ? "font-black text-ink" : "text-muted-foreground"}`}>
                    D{i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>

        {/* What-If Cooking Lifespan Simulator Card */}
        <motion.section variants={rise} className="tile col-span-2 flex flex-col justify-between border-3 border-ink bg-accent shadow-[4px_4px_0px_var(--ink)]">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-ink">What-If Cooking Calculator</span>
              <Sliders className="h-4 w-4 text-ink" />
            </div>
            <p className="mt-2 font-display text-2xl font-black text-ink">
              Lifespan: ~{simulatedDaysLeft} Days
            </p>
            <p className="text-xs font-medium text-ink/85">
              Projected runout date: <strong>{runoutFormatted}</strong>
            </p>
          </div>

          <div className="my-4 rounded-xl border-2 border-ink bg-paper p-3 shadow-[2px_2px_0px_var(--ink)]">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span>Daily Stove Flame Time:</span>
              <span className="font-mono text-sm font-black text-primary">{cookingHoursDaily} hrs/day</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="6.0"
              step="0.5"
              value={cookingHoursDaily}
              onChange={(e) => {
                playChirp("tap");
                setCookingHoursDaily(parseFloat(e.target.value));
              }}
              className="mt-2 w-full accent-primary cursor-pointer"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>Light (30m)</span>
              <span>Average (2.5h)</span>
              <span>Heavy (6h)</span>
            </div>
          </div>

          <p className="font-mono text-[10px] text-ink/80">
            Based on dual-burner stove burn rate (~175g LPG/hr on medium flame).
          </p>
        </motion.section>

        {/* Meal-time breakdown estimated tile */}
        <motion.section variants={rise} className="glass tile col-span-2 border-2 border-ink shadow-[3px_3px_0px_var(--ink)]">
          <div className="flex items-center justify-between mb-3">
            <p className="label-xs">Cooking Session Allocation</p>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {[
              { meal: "Morning Tea & Nashta", share: "22%", kg: "0.10 kg", time: "7:00 AM - 9:30 AM" },
              { meal: "Lunch Preparation (Dal/Roti/Sabzi)", share: "40%", kg: "0.18 kg", time: "11:30 AM - 1:30 PM" },
              { meal: "Evening Chai & Snacks", share: "12%", kg: "0.05 kg", time: "5:00 PM - 6:00 PM" },
              { meal: "Dinner Cooking", share: "26%", kg: "0.12 kg", time: "7:30 PM - 9:30 PM" },
            ].map((m) => (
              <div key={m.meal} className="flex items-center justify-between rounded-lg border-2 border-ink bg-paper/85 p-2 shadow-[1px_1px_0px_var(--ink)]">
                <div>
                  <p className="text-xs font-black text-ink">{m.meal}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{m.time}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-black text-ink">{m.kg}</span>
                  <p className="font-mono text-[9px] text-primary font-bold">{m.share}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 1-Click Distributor Refill Booking Cards */}
        <motion.section variants={rise} className="glass tile col-span-2 border-3 border-ink shadow-[4px_4px_0px_var(--ink)] md:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="label-xs">1-Click Refill Booking Hub</p>
              <h3 className="font-display text-lg font-black text-ink">Official Indian LPG Distributors</h3>
            </div>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {DISTRIBUTORS.map((d) => (
              <div key={d.name} className="flex flex-col justify-between rounded-xl border-2 border-ink bg-paper p-4 shadow-[2px_2px_0px_var(--ink)]">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-base font-black text-ink">{d.name}</p>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-ink shadow-[1px_1px_0px_var(--ink)]" style={{ backgroundColor: d.color }} />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">{d.org}</p>
                  <span className="mt-2 inline-block rounded bg-ink/10 px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                    SMS: {d.smsBooking}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/${d.whatsapp}?text=REFILL`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => playChirp("tap")}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-ink bg-safe px-3 py-2 font-display text-xs font-black text-ink shadow-[2px_2px_0px_var(--ink)] press"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Book via WhatsApp
                  </a>
                  <a
                    href={`tel:${d.phone}`}
                    onClick={() => playChirp("tap")}
                    className="flex items-center justify-center gap-2 rounded-lg border-2 border-ink bg-paper px-3 py-2 font-mono text-xs font-bold text-ink shadow-[1px_1px_0px_var(--ink)] press"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call IVRS {d.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </motion.div>
    </Screen>
  );
}
