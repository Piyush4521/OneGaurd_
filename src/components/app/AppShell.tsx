import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  Home,
  Moon,
  SlidersHorizontal,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { isAudioMuted, playChirp, setAudioMuted } from "@/lib/alarm-audio";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/usage", label: "Usage", icon: Activity },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/settings", label: "Setup", icon: SlidersHorizontal },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [isDark, setIsDark] = useState(false);
  const [isMuted, setIsMutedState] = useState(false);

  useEffect(() => {
    // Check initial dark mode from DOM or localStorage
    const savedTheme = localStorage.getItem("oneguard_theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    if (shouldDark) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
    setIsMutedState(isAudioMuted());

    const handleMuteChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setIsMutedState(custom.detail);
    };
    window.addEventListener("oneguard-audio-mute-change", handleMuteChange);
    return () => window.removeEventListener("oneguard-audio-mute-change", handleMuteChange);
  }, []);

  const toggleTheme = () => {
    playChirp("tap");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("oneguard_theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("oneguard_theme", "dark");
      setIsDark(true);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setAudioMuted(next);
    setIsMutedState(next);
    if (!next) playChirp("success");
  };

  return (
    <div className="app-backdrop min-h-dvh text-foreground transition-colors duration-200">
      {/* Top Ambient Kitchen Ribbon */}
      <div className="border-b-2 border-ink bg-accent/90 px-4 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-ink backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-safe" />
            <span>📍 Kitchen Ring #01 • ESP32 DevKit Active • 28°C Ambient</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              title={isMuted ? "Sound is Muted (Click to Unmute)" : "Sound is Active (Click to Mute)"}
              className="flex items-center gap-1 hover:underline active:scale-95"
            >
              {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              <span>{isMuted ? "Muted" : "Audio On"}</span>
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle Dark / Light Neo-Brutalist Theme"
              className="flex items-center gap-1 hover:underline active:scale-95"
            >
              {isDark ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              <span>{isDark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-4 md:px-6 md:pb-10">
        {/* Desktop Sidebar Rail */}
        <aside className="sticky top-4 hidden h-[calc(100dvh-4.5rem)] w-20 shrink-0 flex-col items-center justify-between rounded-2xl border-3 border-ink bg-paper/90 py-5 shadow-[4px_4px_0px_var(--ink)] md:flex">
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
                      active
                        ? "border-2 border-ink text-ink shadow-[2px_2px_0px_var(--ink)]"
                        : "text-muted-foreground hover:text-ink"
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

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-paper text-ink shadow-[2px_2px_0px_var(--ink)] press"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-ink bg-accent text-ink shadow-[2px_2px_0px_var(--ink)] press"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="font-mono text-[9px] font-bold text-muted-foreground tracking-tighter text-center mt-1">
              V1.0
            </span>
          </div>
        </aside>

        {/* Main App Content Viewport */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Mobile Tab Bar */}
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border-3 border-ink bg-paper/95 p-1.5 shadow-[4px_4px_0px_var(--ink)] backdrop-blur-md md:hidden"
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
                  className="absolute inset-0 rounded-xl border-2 border-ink bg-accent shadow-[2px_2px_0px_var(--ink)]"
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
      className={`inline-flex items-center gap-2 rounded-lg border-2 border-ink px-2.5 py-1 font-mono text-[11px] font-bold uppercase shadow-[2px_2px_0px_var(--ink)] ${
        source === "offline" || source === "fault" ? "bg-destructive text-destructive-foreground" : "bg-paper text-ink"
      }`}
    >
      <span className={`live-dot h-2 w-2 rounded-full ${tone}`} />
      {source}
    </span>
  );
}
