"use client";

import { motion, useReducedMotion } from "framer-motion";

interface SectionLabelProps {
  text: string;
  onDark?: boolean;
}

export function SectionLabel({ text, onDark = false }: SectionLabelProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`ds-section-label ${
        onDark ? "ds-section-label--on-dark" : ""
      }`}
    >
      {reduceMotion ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
      ) : (
        <motion.span
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
          aria-hidden
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="ds-section-label__text">{text}</span>
    </div>
  );
}
