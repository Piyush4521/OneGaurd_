import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, Cpu, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Screen, rise, stagger } from "@/components/app/AppShell";
import { DEFAULT_CONFIG } from "@/lib/telemetry";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Setup | OneGuard LPG" },
      { name: "description", content: "Configure cylinder tare weight, capacity and device." },
      { property: "og:title", content: "Setup | OneGuard LPG" },
      { property: "og:description", content: "Configure cylinder tare weight, capacity and device." },
    ],
  }),
  component: Settings,
});

type BIPEvent = Event & { prompt: () => Promise<void> };

function Settings() {
  const [tare, setTare] = useState(String(DEFAULT_CONFIG.tareKg));
  const [cap, setCap] = useState(String(DEFAULT_CONFIG.capacityKg));
  const [saved, setSaved] = useState(false);
  const [install, setInstall] = useState<BIPEvent | null>(null);

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstall(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  return (
    <Screen kicker="Cylinder and device" title="Setup">
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
        <motion.form variants={rise} className="glass tile space-y-3" onSubmit={(e) => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 1600); }}>
          <p className="label-xs">Cylinder</p>
          <Field label="Tare weight (kg)" hint="Printed on the cylinder neck" value={tare} onChange={setTare} />
          <Field label="LPG capacity (kg)" hint="14.2 for domestic" value={cap} onChange={setCap} />
          <button className="w-full rounded-lg bg-accent py-3 font-bold brutal press">{saved ? "Saved" : "Save"}</button>
        </motion.form>

        <motion.section variants={rise} className="glass tile">
          <p className="label-xs mb-3">Device</p>
          <div className="flex items-center gap-3 rounded-xl bg-paper/70 p-3">
            <Cpu className="h-6 w-6" />
            <div className="flex-1">
              <p className="font-bold">OneGuard ring</p>
              <p className="font-mono text-xs text-muted-foreground">Not paired</p>
            </div>
            <span className="rounded-md bg-warn px-2 py-0.5 font-mono text-[11px] font-bold brutal-sm">DEMO</span>
          </div>
          <button
            disabled={!install}
            onClick={() => install?.prompt()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold brutal press disabled:opacity-50"
          >
            <Download className="h-5 w-5" /> Install app
          </button>
          {!install && <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">Use your browser menu: Add to Home Screen</p>}
        </motion.section>

        <motion.nav variants={rise} className="glass tile divide-y divide-ink/10 md:col-span-2">
          <Row to="/privacy" label="Privacy policy" />
          <Row to="/terms" label="Terms and conditions" />
        </motion.nav>

        <motion.p variants={rise} className="px-1 font-mono text-[11px] text-muted-foreground md:col-span-2">
          OneGuard supplements, and does not replace, certified LPG safety equipment.
        </motion.p>
      </motion.div>
    </Screen>
  );
}

function Field({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg bg-paper px-3 py-2.5 font-mono outline-none brutal-sm focus:ring-2 focus:ring-ring" />
      <span className="mt-1 block font-mono text-[11px] text-muted-foreground">{hint}</span>
    </label>
  );
}

function Row({ to, label }: { to: "/privacy" | "/terms"; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between py-3 font-semibold">
      {label} <ChevronRight className="h-4 w-4" />
    </Link>
  );
}
