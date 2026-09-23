"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, QrCode, RotateCcw, Utensils, ArrowRight } from "lucide-react";

interface TextZoomSplashProps {
  tableNumber?: string | null;
  cafeName?: string;
  subtitle?: string;
  bgImageUrl?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export default function TextZoomSplash({
  tableNumber = null,
  cafeName = "JAADOO",
  subtitle = "UDAIPUR • ARTISANAL CAFÉ & WOODFIRED PIZZERIA",
  bgImageUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=90",
  onComplete,
  autoPlay = true,
}: TextZoomSplashProps) {
  const [phase, setPhase] = useState<"idle" | "entering" | "zooming" | "finished">("entering");

  useEffect(() => {
    if (!autoPlay) return;

    // Timeline: 
    // 0s - 1.8s: Reveal masked text
    // 1.8s - 3.2s: Zoom through text into viewport
    // 3.2s: Complete splash
    const zoomTimer = setTimeout(() => {
      setPhase("zooming");
    }, 1800);

    const finishTimer = setTimeout(() => {
      setPhase("finished");
      if (onComplete) onComplete();
    }, 3200);

    return () => {
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [autoPlay, onComplete]);

  const handleReplay = () => {
    setPhase("entering");
    setTimeout(() => {
      setPhase("zooming");
    }, 1800);

    setTimeout(() => {
      setPhase("finished");
    }, 3200);
  };

  if (phase === "finished") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="zoom-splash-screen"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden select-none font-sans"
      >
        {/* Subdued radial backdrop glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,138,72,0.15)_0%,transparent_70%)] pointer-events-none" />

        {/* Top Header Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? -40 : 0,
          }}
          transition={{ duration: 0.6 }}
          className="absolute top-8 left-0 right-0 flex items-center justify-center px-4"
        >
          <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold tracking-widest uppercase">
              {tableNumber ? `TABLE #${tableNumber} • SCANNED & CONNECTED` : "JAADOO UDAIPUR • ARTISANAL CAFÉ & PIZZERIA"}
            </span>
          </div>
        </motion.div>

        {/* Main Text Zoom Container */}
        <div className="relative flex flex-col items-center justify-center w-full px-4 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: phase === "zooming" ? 45 : 1,
              opacity: phase === "zooming" ? 0.95 : 1,
            }}
            transition={{
              duration: phase === "zooming" ? 1.4 : 1.0,
              ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : [0.16, 1, 0.3, 1],
            }}
            className="relative transform-gpu"
          >
            {/* Masked Text Effect matching user image */}
            <h1
              className="text-[20vw] sm:text-[18vw] md:text-[15vw] font-extrabold tracking-tighter leading-none uppercase font-serif"
              style={{
                backgroundImage: `url(${bgImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.8))",
              }}
            >
              {cafeName}
            </h1>
          </motion.div>

          {/* Subtitle Below Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: phase === "zooming" ? 0 : 1,
              y: phase === "zooming" ? 30 : 0,
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <p className="text-sm md:text-base tracking-[0.25em] font-semibold text-amber-200 uppercase drop-shadow-md">
              {subtitle}
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400 font-mono tracking-widest mt-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>WOOD-FIRED PIZZAS • ARTISANAL COFFEE • TISANES</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Interactive Trigger Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? 40 : 0,
          }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-4 px-4"
        >
          <button
            onClick={() => setPhase("zooming")}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(200,138,72,0.4)] transition-all transform hover:scale-105 active:scale-95"
          >
            <Utensils className="w-4 h-4" />
            <span>{tableNumber ? "Enter Table Menu" : "Explore Cafe Menu"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={handleReplay}
            title="Replay Zoom Animation"
            className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md transition-all transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
