"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface CinematicBrandIntroProps {
  onComplete?: () => void;
  durationMs?: number;
}

export default function CinematicBrandIntro({
  onComplete,
  durationMs = 1350,
}: CinematicBrandIntroProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // If user has reduced motion enabled, bypass immediately
    if (shouldReduceMotion) {
      setIsVisible(false);
      if (onComplete) onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [shouldReduceMotion, durationMs, onComplete]);

  if (shouldReduceMotion) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="cinematic-brand-intro"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#120D0A] overflow-hidden select-none pointer-events-auto"
          aria-hidden="true"
        >
          {/* Subtle warm ambient vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(200,138,72,0.12)_0%,rgba(18,13,10,0.95)_70%)] pointer-events-none" />

          {/* Centered Brand Composition: Smooth 0.90 -> 1.02 camera zoom */}
          <motion.div
            initial={{ scale: 0.90, opacity: 0 }}
            animate={{
              scale: [0.90, 0.94, 0.98, 1.02],
              opacity: [0, 1, 1, 0.95],
            }}
            transition={{
              duration: 1.35,
              times: [0, 0.25, 0.75, 1],
              ease: "easeInOut",
            }}
            className="relative z-10 text-center px-6 max-w-lg flex flex-col items-center justify-center transform-gpu"
          >
            {/* Minimalist Top Gold Accent */}
            <div className="w-12 h-[1px] bg-[#C88A48]/70 mb-6" />

            {/* Brand Titles */}
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-light tracking-[0.18em] text-[#FBF9F5] leading-none uppercase">
              JAADOO
            </h1>
            <span className="font-serif italic font-normal text-2xl sm:text-3xl md:text-4xl text-[#C88A48] mt-2 tracking-wide">
              Trattoria
            </span>

            {/* Subtle Divider */}
            <div className="w-16 h-[1px] bg-[#C88A48]/40 my-5" />

            {/* Supporting Subtext */}
            <p className="font-sans text-[10px] sm:text-xs tracking-[0.35em] text-[#D8C7B5] uppercase font-medium">
              CAFFÈ • PIZZERIA • UDAIPUR
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
