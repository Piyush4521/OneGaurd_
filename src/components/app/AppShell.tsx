import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Bell, Home, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { playChirp } from "@/lib/alarm-audio";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/usage", label: "Usage", icon: Activity },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Setup", icon: SlidersHorizontal },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="app-backdrop min-h-dvh">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-4 md:px-6 md:pb-10">
        {/* Desktop sidebar rail */}
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-20 shrink-0 flex-col items-center justify-between rounded-2xl border-2 border-ink bg-paper/90 py-5 shadow-[4px_4px_0px_#1d1a17] md:flex">
          <div className="flex flex-col items-center">
            <Link to="/" onClick={() => playChirp("tap")} className="transition-transform hover:scale-105 active:scale-95">
              <Logo size={42} />
            </Link>
            <nav className="mt-8 flex flex-col gap-3">
              {TABS.map((t) => {
                const active = path === t.to;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    onClick={() => playChirp("tap")}
                    aria-label={t.label}
                    className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-transform active:scale-95 ${
                      active ? "border-2 border-ink text-ink shadow-[2px_2px_0px_#1d1a17]" : "text-muted-foreground hover:text-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="rail"
                        className="absolute inset-0 rounded-xl bg-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <t.icon className="relative h-5 w-5" strokeWidth={2.4} />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="font-mono text-[9px] font-bold text-muted-foreground tracking-tighter text-center">
            V1.0
            <br />
            IOT
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile Tab Bar */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border-2 border-ink bg-paper/95 p-1.5 shadow-[4px_4px_0px_#1d1a17] backdrop-blur-md md:hidden"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {TABS.map((t) => {
          const active = path === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={() => playChirp("tap")}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2 transition-transform active:scale-95 ${
                active ? "text-ink font-black" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="tab"
                  className="absolute inset-0 rounded-xl border-2 border-ink bg-accent shadow-[2px_2px_0px_#1d1a17]"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <t.icon className="relative h-5 w-5" strokeWidth={2.4} />
              <span className="relative text-[11px] font-bold">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Screen({
  title,
  kicker,
  right,
  children,
}: {
  title: string;
  kicker?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {kicker && <p className="label-xs">{kicker}</p>}
          <h1 className="font-display text-3xl font-black tracking-tight text-ink md:text-4xl">{title}</h1>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      {children}
    </motion.div>
  );
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const rise = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export function SourceBadge({ source }: { source: string }) {
  const tone =
    source === "live"
      ? "bg-safe text-ink"
      : source === "offline" || source === "fault"
      ? "bg-destructive text-destructive-foreground"
      : "bg-warn text-ink";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border-2 border-ink px-2.5 py-1 font-mono text-[11px] font-bold uppercase shadow-[2px_2px_0px_#1d1a17] ${
        source === "offline" || source === "fault" ? "bg-destructive text-destructive-foreground" : "bg-paper text-ink"
      }`}
    >
      <span className={`live-dot h-2 w-2 rounded-full ${tone}`} />
      {source}
    </span>
  );
}
