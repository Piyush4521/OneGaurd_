import { motion } from "framer-motion";
import { Logo } from "./Logo";

export function Splash() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
    >
      <motion.div
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 16 }}
        className="relative"
      >
        <motion.span
          className="absolute inset-0 rounded-2xl border-2 border-accent"
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
        <Logo size={84} />
      </motion.div>
      <motion.div
        className="mt-6 overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="font-display text-3xl font-black tracking-tight text-paper">OneGuard</p>
        <p className="label-xs mt-1 text-center !text-accent">LPG Safety Ring</p>
      </motion.div>
      <motion.div className="absolute bottom-16 h-1 w-40 overflow-hidden rounded-sm bg-paper/15">
        <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }} />
      </motion.div>
    </motion.div>
  );
}
