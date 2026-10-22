import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Screen, rise, stagger } from "@/components/app/AppShell";
import { SAMPLE_DAILY } from "@/lib/telemetry";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "Usage | OneGuard LPG" },
      { name: "description", content: "Daily LPG consumption and refill estimate." },
      { property: "og:title", content: "Usage | OneGuard LPG" },
      { property: "og:description", content: "Daily LPG consumption and refill estimate." },
    ],
  }),
  component: Usage,
});

function Usage() {
  const [active, setActive] = useState(SAMPLE_DAILY.length - 1);
  const max = Math.max(...SAMPLE_DAILY);
  const avg = SAMPLE_DAILY.reduce((a, b) => a + b, 0) / SAMPLE_DAILY.length;
  const week = SAMPLE_DAILY.slice(-7).reduce((a, b) => a + b, 0);

  return (
    <Screen kicker="Last 14 days" title="Usage">
      <p className="mb-4 rounded-lg bg-paper px-3 py-2 font-mono text-xs brutal-sm">Demo data shown until your device syncs history.</p>
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <motion.section variants={rise} className="glass tile col-span-2 md:col-span-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="label-xs">Day {active + 1}</p>
              <p className="font-display text-5xl font-black tabular-nums">{(SAMPLE_DAILY[active] ?? 0).toFixed(2)}<span className="ml-1 text-lg">kg</span></p>
            </div>
            <p className="font-mono text-xs text-muted-foreground">Tap a bar</p>
          </div>
          <div className="mt-6 flex h-48 items-end gap-1.5">
            {SAMPLE_DAILY.map((d, i) => (
              <button key={i} onClick={() => setActive(i)} aria-label={`Day ${i + 1}: ${d} kg`} className="flex h-full flex-1 items-end">
                <motion.span
                  className={`w-full rounded-t-md border-2 border-ink ${i === active ? "bg-primary" : "bg-paper"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${(d / max) * 100}%` }}
                  transition={{ delay: i * 0.03, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </button>
            ))}
          </div>
        </motion.section>
        <Tile label="Daily average" value={avg.toFixed(2)} unit="kg" />
        <Tile label="This week" value={week.toFixed(2)} unit="kg" />
        <motion.section variants={rise} className="tile col-span-2 bg-accent brutal">
          <p className="font-mono text-[11px] font-bold uppercase">How we estimate</p>
          <p className="mt-1 text-sm font-medium">Remaining gas divided by your average daily use. Cooking patterns change, so treat it as a guide, not a guarantee.</p>
        </motion.section>
      </motion.div>
    </Screen>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <motion.section variants={rise} className="glass tile">
      <p className="label-xs">{label}</p>
      <p className="mt-3 font-display text-3xl font-black tabular-nums">{value}<span className="ml-1 text-sm">{unit}</span></p>
    </motion.section>
  );
}
