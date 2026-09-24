"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Utensils, ArrowRight, Zap } from "lucide-react";

interface TextZoomSplashProps {
  tableNumber?: string | null;
  cafeName?: string;
  subtitle?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export default function TextZoomSplash({
  tableNumber = null,
  subtitle = "UDAIPUR • ARTISANAL CAFÉ & WOODFIRED PIZZERIA",
  onComplete,
  autoPlay = true,
}: TextZoomSplashProps) {
  const [phase, setPhase] = useState<"idle" | "entering" | "zooming" | "finished">("entering");

  useEffect(() => {
    if (!autoPlay) return;

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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0e0c0b] overflow-hidden select-none font-sans"
      >
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,140,40,0.14)_0%,transparent_75%)] pointer-events-none" />

        {/* Top Floating Badge matching photo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? -40 : 0,
          }}
          transition={{ duration: 0.6 }}
          className="absolute top-6 left-0 right-0 flex items-center justify-center px-4"
        >
          <div className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1a1715]/90 backdrop-blur-md border border-amber-500/30 text-amber-200 shadow-2xl">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-sans font-bold tracking-[0.2em] uppercase">
              {tableNumber ? `TABLE #${tableNumber} • SCANNED & CONNECTED` : "JAADOO UDAIPUR • ARTISANAL CAFÉ & PIZZERIA"}
            </span>
          </div>
        </motion.div>

        {/* Main Stadium/Capsule Pizza Frame Zoom Container */}
        <div className="relative flex flex-col items-center justify-center w-full px-4 text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: phase === "zooming" ? 45 : 1,
              opacity: phase === "zooming" ? 0.95 : 1,
            }}
            transition={{
              duration: phase === "zooming" ? 1.4 : 1.0,
              ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : [0.16, 1, 0.3, 1],
            }}
            className="relative transform-gpu will-change-transform"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Stadium/Capsule Horizontal Pizza Frame matching exact photo */}
            <div className="relative w-[85vw] max-w-[820px] h-[180px] sm:h-[230px] md:h-[270px] rounded-full overflow-hidden shadow-[0_0_100px_rgba(234,140,40,0.3)] border-[3px] border-amber-500/50 bg-[#1a1715] p-1">
              <img
                src="/pizza-zoom-intro.jpg"
                alt="Jaadoo Artisanal Woodfired Pizza"
                className="w-full h-full object-cover object-center rounded-full transform-gpu"
                style={{ imageRendering: "auto", backfaceVisibility: "hidden" }}
              />
            </div>
          </motion.div>

          {/* Golden Subtitle Text Below Capsule Frame matching photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: phase === "zooming" ? 0 : 1,
              y: phase === "zooming" ? 30 : 0,
            }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <h2 className="text-xs sm:text-sm md:text-base font-sans font-extrabold text-[#e0a84c] tracking-[0.25em] uppercase drop-shadow-md">
              {subtitle}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-amber-200/70 font-sans tracking-[0.2em] font-semibold uppercase">
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>WOOD-FIRED PIZZAS</span>
              <span>⚡</span>
              <span>ARTISANAL COFFEE</span>
              <span>⚡</span>
              <span>TISANES</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Glowing Orange CTA Button matching photo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? 40 : 0,
          }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-3 px-4"
        >
          <button
            onClick={() => setPhase("zooming")}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-extrabold text-xs tracking-widest uppercase shadow-[0_0_35px_rgba(245,158,11,0.45)] transition-all transform hover:scale-105 active:scale-95 border border-amber-300/40"
          >
            <Utensils className="w-4 h-4 fill-stone-950" />
            <span>{tableNumber ? "ENTER TABLE MENU" : "EXPLORE CAFE MENU"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={handleReplay}
            title="Replay Zoom Animation"
            className="p-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
