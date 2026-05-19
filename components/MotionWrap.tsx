"use client";
import { motion } from "framer-motion";

export const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

export const slideIn = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export function Motion({ children, variants = fadeIn, delay = 0 }: { children: React.ReactNode; variants?: any; delay?: number }) {
  return (
    <motion.div initial="initial" animate="animate" transition={{ ...variants.transition, delay }} variants={variants}>
      {children}
    </motion.div>
  );
}

export function MotionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, delay, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}