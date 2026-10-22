import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Bell, Home, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

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
        {/* Desktop rail */}
        <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-20 shrink-0 flex-col items-center gap-3 rounded-2xl glass py-4 md:flex">
          <Logo size={40} />
          <nav className="mt-6 flex flex-col gap-2">
            {TABS.map((t) => {
              const active = path === t.to;
              return (
                <Link key={t.to} to={t.to} aria-label={t.label} className="relative flex h-12 w-12 items-center justify-center rounded-xl">
                  {active && <motion.span layoutId="rail" className="absolute inset-0 rounded-xl bg-accent brutal-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <t.icon className="relative h-5 w-5" strokeWidth={2.2} />
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl glass p-1.5 md:hidden" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
        {TABS.map((t) => {
          const active = path === t.to;
          return (
            <Link key={t.to} to={t.to} className="relative flex flex-col items-center gap-0.5 rounded-xl py-2">
              {active && <motion.span layoutId="tab" className="absolute inset-0 rounded-xl bg-accent brutal-sm" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <t.icon className="relative h-5 w-5" strokeWidth={2.2} />
              <span className="relative text-[11px] font-semibold">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Screen({ title, kicker, right, children }: { title: string; kicker?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          {kicker && <p className="label-xs">{kicker}</p>}
          <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
        </div>
        {right}
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
  const tone = source === "live" ? "bg-safe" : source === "offline" || source === "fault" ? "bg-destructive" : "bg-warn";
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-paper px-2.5 py-1 font-mono text-[11px] font-bold uppercase brutal-sm">
      <span className={`live-dot h-2 w-2 rounded-full ${tone}`} />
      {source}
    </span>
  );
}
