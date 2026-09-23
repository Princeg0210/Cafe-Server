"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, RotateCcw, ArrowRight, Pizza } from "lucide-react";

interface PizzaSliceZoomIntroProps {
  cafeName?: string;
  subtitle?: string;
  bgImageUrl?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export default function PizzaSliceZoomIntro({
  cafeName = "JAADOO UDAIPUR",
  subtitle = "WOOD-FIRED NEAPOLITAN PIZZERIA & SPECIALTY ARABICA",
  bgImageUrl = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85",
  onComplete,
  autoPlay = true,
}: PizzaSliceZoomIntroProps) {
  const [phase, setPhase] = useState<"assembled" | "slicing" | "zooming" | "finished">("assembled");

  useEffect(() => {
    if (!autoPlay) return;

    // Auto timeline
    // 0s - 1.3s: Assembled floating pizza
    // 1.3s - 2.1s: Slicing cutter glow & slice separation
    // 2.1s - 3.4s: Slices split to 4 corners & backdrop fades out to reveal site
    // 3.4s: Complete intro
    const sliceTimer = setTimeout(() => {
      setPhase("slicing");
    }, 1300);

    const zoomTimer = setTimeout(() => {
      setPhase("zooming");
    }, 2100);

    const finishTimer = setTimeout(() => {
      setPhase("finished");
      if (onComplete) onComplete();
    }, 3400);

    return () => {
      clearTimeout(sliceTimer);
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [autoPlay, onComplete]);

  const triggerSliceZoom = () => {
    if (phase === "zooming" || phase === "finished") return;
    setPhase("slicing");
    setTimeout(() => {
      setPhase("zooming");
    }, 400);
    setTimeout(() => {
      setPhase("finished");
      if (onComplete) onComplete();
    }, 1700);
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhase("assembled");
    setTimeout(() => setPhase("slicing"), 1300);
    setTimeout(() => setPhase("zooming"), 2100);
    setTimeout(() => {
      setPhase("finished");
      if (onComplete) onComplete();
    }, 3400);
  };

  if (phase === "finished") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pizza-slice-intro"
        initial={{ opacity: 1 }}
        animate={{
          opacity: phase === "zooming" ? 0 : 1,
        }}
        exit={{ opacity: 0 }}
        transition={{
          duration: phase === "zooming" ? 1.2 : 0.4,
          ease: "easeInOut",
        }}
        onClick={triggerSliceZoom}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0705] text-stone-100 overflow-hidden select-none font-sans cursor-pointer"
      >
        {/* Ambient Wood-fired Oven Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.28)_0%,rgba(185,28,28,0.15)_45%,transparent_80%)] pointer-events-none" />

        {/* Floating Ember Particles */}
        <div className="absolute inset-0 pointer-events-none opacity-50 overflow-hidden">
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: (i % 4) * 25 + Math.random() * 15 + "%",
                y: "110%",
                scale: Math.random() * 0.6 + 0.4,
                opacity: 0.8,
              }}
              animate={{
                y: "-10%",
                x: `calc(${(i % 4) * 25}% + ${Math.sin(i) * 50}px)`,
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2.5 + (i % 3),
                repeat: Infinity,
                delay: i * 0.2,
                ease: "linear",
              }}
              className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_12px_#f59e0b]"
            />
          ))}
        </div>

        {/* Top Header Branding */}
        <motion.div
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? -50 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="absolute top-6 left-0 right-0 flex items-center justify-center px-4 z-20 pointer-events-none"
        >
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-stone-900/90 backdrop-blur-md border border-amber-500/40 text-amber-200 shadow-2xl">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse fill-amber-500/30" />
            <span className="text-xs font-bold tracking-widest uppercase font-mono">
              {cafeName} • FRESHLY SLICING OVEN SPECIALTY
            </span>
          </div>
        </motion.div>

        {/* Center Pizza Slicing Stage */}
        <motion.div 
          animate={{
            scale: phase === "zooming" ? 3.5 : 1,
          }}
          transition={{
            duration: 1.3,
            ease: [0.7, 0, 0.84, 0],
          }}
          className="relative flex items-center justify-center w-[78vw] max-w-[460px] aspect-square my-auto z-10"
        >
          {/* Laser Cut/Slice Lines Overlay */}
          <AnimatePresence>
            {(phase === "slicing" || phase === "zooming") && (
              <>
                {/* Vertical Slice Line */}
                <motion.div
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: [0, 1, 0.9] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-y-0 left-1/2 -ml-0.5 w-1 bg-gradient-to-b from-amber-200 via-amber-400 to-red-500 shadow-[0_0_25px_#f59e0b] z-30 pointer-events-none"
                />
                {/* Horizontal Slice Line */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 0.9] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.08 }}
                  className="absolute inset-x-0 top-1/2 -mt-0.5 h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-red-500 shadow-[0_0_25px_#f59e0b] z-30 pointer-events-none"
                />
              </>
            )}
          </AnimatePresence>

          {/* 4 Quadrant Slices Container */}
          <div className="relative w-full h-full rounded-full shadow-[0_0_70px_rgba(245,158,11,0.4)]">
            
            {/* Slice 1: Top-Left (Quadrant 1) */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "-140vw" : phase === "slicing" ? "-12px" : 0,
                y: phase === "zooming" ? "-140vh" : phase === "slicing" ? "-12px" : 0,
                rotate: phase === "zooming" ? -35 : 0,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(0 0, 50% 0, 50% 50%, 0 50%)" }}
            >
              <PizzaArtwork bgImageUrl={bgImageUrl} />
            </motion.div>

            {/* Slice 2: Top-Right (Quadrant 2) */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "140vw" : phase === "slicing" ? "12px" : 0,
                y: phase === "zooming" ? "-140vh" : phase === "slicing" ? "-12px" : 0,
                rotate: phase === "zooming" ? 35 : 0,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%, 50% 50%)" }}
            >
              <PizzaArtwork bgImageUrl={bgImageUrl} />
            </motion.div>

            {/* Slice 3: Bottom-Right (Quadrant 3) */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "140vw" : phase === "slicing" ? "12px" : 0,
                y: phase === "zooming" ? "140vh" : phase === "slicing" ? "12px" : 0,
                rotate: phase === "zooming" ? -35 : 0,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)" }}
            >
              <PizzaArtwork bgImageUrl={bgImageUrl} />
            </motion.div>

            {/* Slice 4: Bottom-Left (Quadrant 4) */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "-140vw" : phase === "slicing" ? "-12px" : 0,
                y: phase === "zooming" ? "140vh" : phase === "slicing" ? "12px" : 0,
                rotate: phase === "zooming" ? 35 : 0,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(0 50%, 50% 50%, 50% 100%, 0 100%)" }}
            >
              <PizzaArtwork bgImageUrl={bgImageUrl} />
            </motion.div>

          </div>
        </motion.div>

        {/* Subtitle Caption */}
        <motion.div
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? 40 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="text-center px-4 mb-16 z-20 pointer-events-none"
        >
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-wider text-amber-100 uppercase font-serif drop-shadow-2xl">
            {cafeName}
          </h2>
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase mt-2 font-mono">
            {subtitle}
          </p>
        </motion.div>

        {/* Bottom Interactive Controls */}
        <motion.div
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? 50 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4 px-4 z-30"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerSliceZoom();
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-stone-950 font-extrabold text-sm tracking-wider uppercase shadow-[0_0_35px_rgba(245,158,11,0.6)] transition-all transform hover:scale-105 active:scale-95"
          >
            <Pizza className="w-5 h-5" />
            <span>SLICE & ENTER MENU</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={handleReplay}
            title="Replay Pizza Slicing Animation"
            className="p-3.5 rounded-full bg-stone-900/90 hover:bg-stone-800 border border-amber-500/40 text-amber-200 backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 shadow-xl"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Tap Anywhere Hint */}
        <p className="absolute bottom-3 text-[10px] text-amber-200/50 uppercase font-mono tracking-widest pointer-events-none">
          Click anywhere or wait to enter
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * PizzaArtwork Component
 * Renders a guaranteed, instantly-visible Wood-Fired Neapolitan Pizza artwork
 * with photo texture, crust charred spots, mozzarella pools, basil leaves & pepperoni.
 */
function PizzaArtwork({ bgImageUrl }: { bgImageUrl: string }) {
  return (
    <div className="relative w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#c88a48] via-[#a35e29] to-[#592a10] p-3 shadow-inner">
      
      {/* Photo Background Texture */}
      <img
        src={bgImageUrl}
        alt="Woodfired Pizza"
        className="w-full h-full object-cover rounded-full transform scale-105 opacity-90"
        onError={(e) => {
          // Fallback if image network fails
          (e.target as HTMLElement).style.display = "none";
        }}
      />

      {/* SVG Woodfired Details Layer for instant 0ms visual fidelity */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none rounded-full"
        viewBox="0 0 400 400"
        fill="none"
      >
        {/* Outer Crust Ring with Char Marks */}
        <circle cx="200" cy="200" r="190" stroke="#8c431d" strokeWidth="20" opacity="0.6" />
        <circle cx="200" cy="200" r="185" stroke="#4a1e0b" strokeWidth="8" strokeDasharray="30 20 50 15 40 25" opacity="0.7" />

        {/* Sauce Base */}
        <circle cx="200" cy="200" r="172" fill="#b91c1c" opacity="0.35" />

        {/* Melted Fior di Latte Mozzarella Spots */}
        <circle cx="140" cy="130" r="28" fill="#fef3c7" opacity="0.85" />
        <circle cx="260" cy="150" r="32" fill="#fffbeb" opacity="0.85" />
        <circle cx="160" cy="260" r="35" fill="#fef3c7" opacity="0.85" />
        <circle cx="270" cy="270" r="26" fill="#fffbeb" opacity="0.85" />
        <circle cx="200" cy="190" r="38" fill="#fef3c7" opacity="0.9" />

        {/* Spicy Pepperoni Slices */}
        <circle cx="120" cy="190" r="22" fill="#991b1b" stroke="#7f1d1d" strokeWidth="3" opacity="0.9" />
        <circle cx="220" cy="120" r="24" fill="#991b1b" stroke="#7f1d1d" strokeWidth="3" opacity="0.9" />
        <circle cx="290" cy="200" r="22" fill="#991b1b" stroke="#7f1d1d" strokeWidth="3" opacity="0.9" />
        <circle cx="210" cy="280" r="25" fill="#991b1b" stroke="#7f1d1d" strokeWidth="3" opacity="0.9" />
        <circle cx="140" cy="300" r="20" fill="#991b1b" stroke="#7f1d1d" strokeWidth="3" opacity="0.9" />

        {/* Fresh Basil Leaves */}
        <path d="M 180 150 C 170 130, 200 120, 190 140 Z" fill="#15803d" opacity="0.9" />
        <path d="M 230 230 C 240 210, 260 240, 245 250 Z" fill="#166534" opacity="0.9" />
        <path d="M 130 230 C 120 220, 140 200, 150 220 Z" fill="#15803d" opacity="0.9" />

        {/* Wood-fired Oven Char Flakes */}
        <circle cx="180" cy="80" r="3" fill="#1c1917" />
        <circle cx="310" cy="160" r="4" fill="#1c1917" />
        <circle cx="90" cy="220" r="3" fill="#1c1917" />
        <circle cx="240" cy="330" r="4" fill="#1c1917" />
      </svg>

      {/* Glossy Heat Shimmer Rim */}
      <div className="absolute inset-0 rounded-full border-4 border-amber-400/30 pointer-events-none" />
    </div>
  );
}
