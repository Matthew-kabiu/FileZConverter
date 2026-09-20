"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUp, uiSpring } from "./variants";
import type { ReactNode } from "react";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeUp}
      initial={reduce ? undefined : "hidden"}
      animate={reduce ? undefined : "visible"}
      transition={{ ...uiSpring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
