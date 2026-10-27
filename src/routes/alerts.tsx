import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  Check,
  CheckCircle2,
  Flame,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  Radio,
  Send,
  ShieldAlert,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Screen, rise, stagger } from "@/components/app/AppShell";
import { playChirp, startEmergencySiren, stopEmergencySiren } from "@/lib/alarm-audio";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Emergency | OneGuard LPG" },
      { name: "description", content: "Instant leak alerts, SOP checklist, and 1-click emergency dispatch." },
      { property: "og:title", content: "Alerts & Emergency | OneGuard LPG" },
      { property: "og:description", content: "Instant leak alerts, SOP checklist, and 1-click emergency dispatch." },
    ],
  }),
  component: Alerts,
});

type Alert = {
  id: number;
  kind: "Critical Leak" | "Low Gas" | "Sensor Check" | "Battery Warning";
  severity: "critical" | "warning" | "info";
  detail: string;
  time: string;
  acked: boolean;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  tag: "Family" | "Neighbor" | "Agency" | "Official";
};

const STORAGE_KEY_CONTACTS = "oneguard_contacts_v1";

const DEFAULT_CONTACTS: Contact[] = [
  { id: "c1", name: "LPG Emergency Helpline", phone: "1906", tag: "Official" },
  { id: "c2", name: "Fire & Rescue Service", phone: "101", tag: "Official" },
  { id: "c3", name: "Home / Family Member", phone: "+919876543210", tag: "Family" },
];

function loadSavedContacts(): Contact[] {
  if (typeof window === "undefined") return DEFAULT_CONTACTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTACTS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return DEFAULT_CONTACTS;
}

function saveContacts(c: Contact[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(c));
  } catch {
    // ignore
  }
}

function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 1,
      kind: "Low Gas",
      severity: "warning",
      detail: "Cylinder reached below 15% (2.1 kg left). Please book refill.",
      time: "10:15 AM today",
      acked: false,
    },
    {
      id: 2,
      kind: "Sensor Check",
      severity: "info",
      detail: "MQ-6 gas sensor auto-calibration completed successfully.",
      time: "Yesterday",
      acked: true,
    },
    {
      id: 3,
      kind: "Critical Leak",
      severity: "critical",
      detail: "Safety drill: threshold detection and emergency notification dispatch.",
      time: "3 days ago",
      acked: true,
    },
  ]);

  const [contacts, setContacts] = useState<Contact[]>(loadSavedContacts);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tag, setTag] = useState<Contact["tag"]>("Family");
  const [isTestingSiren, setIsTestingSiren] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    saveContacts(contacts);
  }, [contacts]);

  const toggleTestSiren = () => {
    if (isTestingSiren) {
      stopEmergencySiren();
      setIsTestingSiren(false);
    } else {
      startEmergencySiren();
      setIsTestingSiren(true);
      setTimeout(() => {
        stopEmergencySiren();
        setIsTestingSiren(false);
      }, 5000);
    }
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    playChirp("success");
    const newContact: Contact = {
      id: `c_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      tag,
    };
    setContacts((prev) => [...prev, newContact]);
    setName("");
    setPhone("");
  };

  const handleRemoveContact = (id: string) => {
    playChirp("tap");
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const sendWhatsAppSOS = (c: Contact) => {
    playChirp("tap");
    const text = encodeURIComponent(
      `🚨 ONEGUARD EMERGENCY ALERT: Potential LPG Gas Leak detected at my kitchen! The MQ-6 sensor reported gas concentration above safety threshold. Please assist or call 1906 helpline immediately.`
    );
    window.open(`https://wa.me/${c.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
  };

  const handleBroadcastSOS = () => {
    playChirp("warn");
    setSosSent(true);
    setTimeout(() => setSosSent(false), 3000);
    // Open primary emergency contact
    const firstNonOfficial = contacts.find((c) => c.phone !== "1906" && c.phone !== "101") ?? contacts[0];
    if (firstNonOfficial) {
      sendWhatsAppSOS(firstNonOfficial);
    }
  };

  return (
    <Screen
      kicker="Safety & Quick Dispatch"
      title="Emergency Hub"
      right={
        <button
          onClick={toggleTestSiren}
          className={`flex items-center gap-2 rounded-xl border-2 border-ink px-3 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0px_var(--ink)] press ${
            isTestingSiren ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-accent text-ink"
          }`}
        >
          {isTestingSiren ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {isTestingSiren ? "Stop Test Siren (5s)" : "Test Phone Siren"}
        </button>
      }
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
        {/* Direct National Emergency Hotline */}
        <motion.a
          variants={rise}
          href="tel:1906"
          onClick={() => playChirp("warn")}
          className="tile col-span-2 flex items-center justify-between gap-4 border-3 border-ink bg-destructive p-5 text-destructive-foreground shadow-[4px_4px_0px_var(--ink)] press"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-paper text-destructive shadow-[2px_2px_0px_var(--ink)]">
              <PhoneCall className="h-7 w-7" strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-display text-2xl font-black tracking-tight">Call LPG Helpline 1906</p>
              <p className="font-mono text-xs text-destructive-foreground/90">
                24x7 All-India Emergency Service (Free Toll-Free)
              </p>
            </div>
          </div>
          <span className="rounded-xl border-2 border-ink bg-paper px-4 py-2 font-display text-sm font-black text-ink shadow-[2px_2px_0px_var(--ink)]">
            CALL NOW
          </span>
        </motion.a>

        {/* Audio Equalizer Visualizer during Siren */}
        <AnimatePresence>
          {isTestingSiren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="col-span-2 overflow-hidden rounded-2xl border-3 border-ink bg-paper p-4 shadow-[4px_4px_0px_var(--ink)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-destructive animate-pulse" />
                  <p className="font-mono text-xs font-black uppercase text-ink">
                    Emergency Dual-Tone Siren Synthesizer Active (880Hz - 1200Hz)
                  </p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">Local Web Audio API</span>
              </div>
              <div className="mt-3 flex h-8 items-end justify-center gap-1.5">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-t-sm border border-ink bg-destructive eq-bar"
                    style={{ animationDelay: `${(i % 5) * 0.1}s`, height: `${Math.random() * 20 + 8}px` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emergency SOP Protocol Checklist with Hazard Accent */}
        <motion.section variants={rise} className="glass tile col-span-2 border-3 border-ink shadow-[4px_4px_0px_var(--ink)]">
          <p className="label-xs mb-2">Emergency Standard Operating Procedure (SOP)</p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "01", title: "Regulator Knob Band Karein", desc: "Turn cylinder valve OFF clockwise immediately." },
              { step: "02", title: "Khidkiyan & Darwaze Kholo", desc: "Open all windows and doors for natural ventilation." },
              { step: "03", title: "No Flames or Switches", desc: "Do not touch electrical switches, fans, or matches." },
              { step: "04", title: "Evacuate & Call 1906", desc: "Move outside to fresh air and call emergency helpline." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border-2 border-ink bg-paper/90 p-3 shadow-[2px_2px_0px_var(--ink)]">
                <span className="font-mono text-xs font-black text-primary">{item.step}</span>
                <p className="font-display text-sm font-black text-ink">{item.title}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Emergency Contacts Management */}
        <motion.section variants={rise} className="glass tile flex flex-col justify-between border-2 border-ink shadow-[3px_3px_0px_var(--ink)]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="label-xs">Trusted Emergency Contacts</p>
              <button
                onClick={handleBroadcastSOS}
                className="flex items-center gap-1 rounded bg-accent px-2 py-1 font-mono text-[10px] font-bold text-ink shadow-[1px_1px_0px_var(--ink)] press"
              >
                <Send className="h-3 w-3" />
                {sosSent ? "SOS Triggered!" : "1-Tap SOS Broadcast"}
              </button>
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddContact} className="mb-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (e.g. Papa, Sunita)"
                  className="rounded-lg border-2 border-ink bg-paper px-3 py-2 text-xs font-medium outline-none shadow-[2px_2px_0px_var(--ink)] focus:ring-2 focus:ring-ring"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number (+91...)"
                  className="rounded-lg border-2 border-ink bg-paper px-3 py-2 font-mono text-xs font-medium outline-none shadow-[2px_2px_0px_var(--ink)] focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value as Contact["tag"])}
                  className="rounded-lg border-2 border-ink bg-paper px-2 py-2 text-xs font-bold shadow-[2px_2px_0px_var(--ink)]"
                >
                  <option value="Family">Family</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Agency">Agency</option>
                  <option value="Official">Official</option>
                </select>
                <button
                  type="submit"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-ink bg-primary px-3 py-2 text-xs font-black text-paper shadow-[2px_2px_0px_var(--ink)] press"
                >
                  <Plus className="h-4 w-4" /> Add Trusted Contact
                </button>
              </div>
            </form>

            {/* Contacts List */}
            <ul className="space-y-2">
              <AnimatePresence>
                {contacts.map((c) => (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="flex items-center justify-between rounded-xl border-2 border-ink bg-paper p-3 shadow-[2px_2px_0px_var(--ink)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-accent">
                        <UserRound className="h-4 w-4 text-ink" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-black text-ink">{c.name}</p>
                          <span className="rounded bg-ink/10 px-1 py-0.5 font-mono text-[9px] font-bold uppercase">
                            {c.tag}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* WhatsApp SOS */}
                      <button
                        title="Send WhatsApp SOS Alert"
                        onClick={() => sendWhatsAppSOS(c)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-safe text-ink shadow-[1px_1px_0px_var(--ink)] press"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      {/* Phone Call */}
                      <a
                        title="Call Contact"
                        href={`tel:${c.phone}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-accent text-ink shadow-[1px_1px_0px_var(--ink)] press"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      {/* Remove (skip deleting 1906) */}
                      {c.phone !== "1906" && (
                        <button
                          title="Delete contact"
                          onClick={() => handleRemoveContact(c.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </motion.section>

        {/* Recent Sensor Alerts & Audit Trail */}
        <motion.section variants={rise} className="glass tile border-2 border-ink shadow-[3px_3px_0px_var(--ink)]">
          <div className="flex items-center justify-between mb-3">
            <p className="label-xs">Alert & Incident Log</p>
            <span className="font-mono text-[11px] text-muted-foreground">Auto-saved</span>
          </div>

          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {alerts.map((a) => (
                <motion.li
                  layout
                  key={a.id}
                  className={`flex items-start gap-3 rounded-xl p-3 border-2 border-ink ${
                    a.acked ? "bg-paper/60 opacity-80" : "bg-paper shadow-[2px_2px_0px_var(--ink)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border-2 border-ink ${
                      a.severity === "critical"
                        ? "bg-destructive animate-ping"
                        : a.severity === "warning"
                        ? "bg-warn"
                        : "bg-safe"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-black text-ink">{a.kind}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{a.time}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{a.detail}</p>
                  </div>
                  {a.acked ? (
                    <span title="Acknowledged">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        playChirp("success");
                        setAlerts((x) => x.map((y) => (y.id === a.id ? { ...y, acked: true } : y)));
                      }}
                      className="rounded-lg border-2 border-ink bg-accent px-3 py-1 font-display text-xs font-black shadow-[2px_2px_0px_var(--ink)] press"
                    >
                      Acknowledge
                    </button>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
      </motion.div>
    </Screen>
  );
}
