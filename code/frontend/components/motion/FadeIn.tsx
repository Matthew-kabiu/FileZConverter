"use client";

import { motion, useReducedMotion } from "motion/react";
import { fadeUp, uiSpring } from "./variants";
import type { ReactNode } from "react";

export function FadeIn({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={fadeUp}
      initial={reduce ? undefined : "hidden"}
      animate={reduce ? undefined : "visible"}
      transition={{ ...uiSpring, delay }}
    >
      {children}
    </motion.div>
  );
}
