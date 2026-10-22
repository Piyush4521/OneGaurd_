import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Phone, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { Screen, rise, stagger } from "@/components/app/AppShell";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts | OneGuard LPG" },
      { name: "description", content: "Leak and low gas alerts with emergency contacts." },
      { property: "og:title", content: "Alerts | OneGuard LPG" },
      { property: "og:description", content: "Leak and low gas alerts with emergency contacts." },
    ],
  }),
  component: Alerts,
});

type Alert = { id: number; kind: "Low gas" | "Sensor check"; detail: string; acked: boolean };

function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: 1, kind: "Low gas", detail: "Below 25% sample alert", acked: false },
    { id: 2, kind: "Sensor check", detail: "MQ-6 warm-up complete", acked: true },
  ]);
  const [contacts, setContacts] = useState<string[]>([]);
  const [name, setName] = useState("");

  return (
    <Screen kicker="Notifications" title="Alerts">
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
        <motion.section variants={rise} className="glass tile">
          <p className="label-xs mb-3">Recent</p>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {alerts.map((a) => (
                <motion.li layout key={a.id} className={`flex items-center gap-3 rounded-xl p-3 ${a.acked ? "bg-paper/50" : "bg-paper brutal-sm"}`}>
                  <span className={`h-3 w-3 shrink-0 rounded-sm border-2 border-ink ${a.acked ? "bg-muted" : "bg-warn"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{a.kind}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  {a.acked ? (
                    <Check className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <button onClick={() => setAlerts((x) => x.map((y) => (y.id === a.id ? { ...y, acked: true } : y)))} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold brutal-sm press">
                      Got it
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>

        <motion.section variants={rise} className="glass tile">
          <p className="label-xs mb-3">Who gets alerted</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) setContacts((c) => [...c, name.trim()]);
              setName("");
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name or phone" className="min-w-0 flex-1 rounded-lg bg-paper px-3 py-2 text-sm outline-none brutal-sm focus:ring-2 focus:ring-ring" />
            <button aria-label="Add contact" className="rounded-lg bg-primary px-3 brutal-sm press"><Plus className="h-5 w-5" /></button>
          </form>
          <ul className="mt-3 space-y-2">
            {contacts.length === 0 && <li className="py-6 text-center font-mono text-xs text-muted-foreground">No contacts yet</li>}
            <AnimatePresence>
              {contacts.map((c, i) => (
                <motion.li key={c + i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-xl bg-paper/70 p-3">
                  <UserRound className="h-5 w-5" />
                  <span className="flex-1 font-semibold">{c}</span>
                  <button onClick={() => setContacts((x) => x.filter((_, j) => j !== i))} className="font-mono text-xs underline">Remove</button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>

        <motion.a variants={rise} href="tel:1906" className="tile flex items-center gap-4 bg-destructive text-destructive-foreground brutal press md:col-span-2">
          <Phone className="h-7 w-7" strokeWidth={2.4} />
          <div>
            <p className="font-display text-xl font-black">LPG Emergency 1906</p>
            <p className="font-mono text-xs">Smell gas? Stop flames, open windows, then call.</p>
          </div>
        </motion.a>
      </motion.div>
    </Screen>
  );
}
