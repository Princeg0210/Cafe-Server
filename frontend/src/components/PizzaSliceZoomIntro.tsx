"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Sparkles, RotateCcw, Utensils, ArrowRight, Pizza } from "lucide-react";

interface PizzaSliceZoomIntroProps {
  cafeName?: string;
  subtitle?: string;
  bgImageUrl?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
}

export default function PizzaSliceZoomIntro({
  cafeName = "JAADOO UDAIPUR",
  subtitle = "AUTHENTIC WOOD-FIRED NEAPOLITAN PIZZERIA",
  bgImageUrl = "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=90",
  onComplete,
  autoPlay = true,
}: PizzaSliceZoomIntroProps) {
  const [phase, setPhase] = useState<"idle" | "assembled" | "slicing" | "zooming" | "finished">("assembled");

  useEffect(() => {
    if (!autoPlay) return;

    // Timeline:
    // 0s - 1.4s: Assembled pizza floating with steam & embers
    // 1.4s - 2.4s: Pizza cutter glow lines slice into 4 pieces
    // 2.4s - 3.8s: Slices split into 4 corners & camera zooms through center aperture
    // 3.8s: Complete splash intro
    const sliceTimer = setTimeout(() => {
      setPhase("slicing");
    }, 1400);

    const zoomTimer = setTimeout(() => {
      setPhase("zooming");
    }, 2400);

    const finishTimer = setTimeout(() => {
      setPhase("finished");
      if (onComplete) onComplete();
    }, 3800);

    return () => {
      clearTimeout(sliceTimer);
      clearTimeout(zoomTimer);
      clearTimeout(finishTimer);
    };
  }, [autoPlay, onComplete]);

  const handleReplay = () => {
    setPhase("assembled");
    setTimeout(() => setPhase("slicing"), 1400);
    setTimeout(() => setPhase("zooming"), 2400);
    setTimeout(() => setPhase("finished"), 3800);
  };

  if (phase === "finished") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pizza-slice-intro"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0705] text-stone-100 overflow-hidden select-none font-sans"
      >
        {/* Ambient Wood-fired Oven Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.25)_0%,rgba(185,28,28,0.1)_40%,transparent_75%)] pointer-events-none" />

        {/* Floating Ember Particles */}
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * 100 - 50 + "%",
                y: "110%",
                scale: Math.random() * 0.5 + 0.5,
                opacity: 0.8,
              }}
              animate={{
                y: "-10%",
                x: `calc(${Math.random() * 100 - 50}% + ${Math.sin(i) * 40}px)`,
                opacity: [0, 0.9, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "linear",
              }}
              className="absolute w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
            />
          ))}
        </div>

        {/* Top Header Branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? -40 : 0,
          }}
          transition={{ duration: 0.5 }}
          className="absolute top-8 left-0 right-0 flex items-center justify-center px-4 z-20"
        >
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-stone-900/80 backdrop-blur-md border border-amber-500/30 text-amber-200 shadow-2xl">
            <Flame className="w-4 h-4 text-amber-500 animate-pulse fill-amber-500/30" />
            <span className="text-xs font-bold tracking-widest uppercase font-mono">
              {cafeName} • FRESHLY SLICING OVEN SPECIALTY
            </span>
          </div>
        </motion.div>

        {/* Center Pizza Slicing Stage Container */}
        <div className="relative flex items-center justify-center w-[85vw] max-w-[500px] aspect-square my-auto">
          
          {/* Laser Cut/Slice Lines Overlay */}
          <AnimatePresence>
            {(phase === "slicing" || phase === "zooming") && (
              <>
                {/* Vertical Slice Line */}
                <motion.div
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: [0, 1, 0.8] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-y-0 left-1/2 -ml-0.5 w-1 bg-gradient-to-b from-transparent via-amber-400 to-transparent shadow-[0_0_20px_#f59e0b] z-30"
                />
                {/* Horizontal Slice Line */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 0.8] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="absolute inset-x-0 top-1/2 -mt-0.5 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_20px_#f59e0b] z-30"
                />
              </>
            )}
          </AnimatePresence>

          {/* 4 Quadrant Slices Container */}
          <div className="relative w-full h-full rounded-full shadow-[0_0_60px_rgba(245,158,11,0.3)]">
            
            {/* Quadrant 1: Top-Left Slice */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "-180%" : phase === "slicing" ? "-6px" : 0,
                y: phase === "zooming" ? "-180%" : phase === "slicing" ? "-6px" : 0,
                rotate: phase === "zooming" ? -25 : 0,
                scale: phase === "zooming" ? 4 : 1,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(0 0, 50% 0, 50% 50%, 0 50%)" }}
            >
              <img
                src={bgImageUrl}
                alt="Pizza Slice Top-Left"
                className="w-full h-full object-cover rounded-full transform scale-105"
              />
            </motion.div>

            {/* Quadrant 2: Top-Right Slice */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "180%" : phase === "slicing" ? "6px" : 0,
                y: phase === "zooming" ? "-180%" : phase === "slicing" ? "-6px" : 0,
                rotate: phase === "zooming" ? 25 : 0,
                scale: phase === "zooming" ? 4 : 1,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%, 50% 50%)" }}
            >
              <img
                src={bgImageUrl}
                alt="Pizza Slice Top-Right"
                className="w-full h-full object-cover rounded-full transform scale-105"
              />
            </motion.div>

            {/* Quadrant 3: Bottom-Right Slice */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "180%" : phase === "slicing" ? "6px" : 0,
                y: phase === "zooming" ? "180%" : phase === "slicing" ? "6px" : 0,
                rotate: phase === "zooming" ? -25 : 0,
                scale: phase === "zooming" ? 4 : 1,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)" }}
            >
              <img
                src={bgImageUrl}
                alt="Pizza Slice Bottom-Right"
                className="w-full h-full object-cover rounded-full transform scale-105"
              />
            </motion.div>

            {/* Quadrant 4: Bottom-Left Slice */}
            <motion.div
              animate={{
                x: phase === "zooming" ? "-180%" : phase === "slicing" ? "-6px" : 0,
                y: phase === "zooming" ? "180%" : phase === "slicing" ? "6px" : 0,
                rotate: phase === "zooming" ? 25 : 0,
                scale: phase === "zooming" ? 4 : 1,
              }}
              transition={{
                duration: phase === "zooming" ? 1.2 : 0.4,
                ease: phase === "zooming" ? [0.7, 0, 0.84, 0] : "easeInOut",
              }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: "polygon(0 50%, 50% 50%, 50% 100%, 0 100%)" }}
            >
              <img
                src={bgImageUrl}
                alt="Pizza Slice Bottom-Left"
                className="w-full h-full object-cover rounded-full transform scale-105"
              />
            </motion.div>

          </div>
        </div>

        {/* Subtitle Caption */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? 30 : 0,
          }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center px-4 mb-16 z-20"
        >
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-wider text-amber-100 uppercase font-serif drop-shadow-xl">
            {cafeName}
          </h2>
          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase mt-2 font-mono">
            {subtitle}
          </p>
        </motion.div>

        {/* Bottom Trigger Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: phase === "zooming" ? 0 : 1,
            y: phase === "zooming" ? 40 : 0,
          }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-4 px-4 z-20"
        >
          <button
            onClick={() => {
              setPhase("slicing");
              setTimeout(() => setPhase("zooming"), 400);
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-red-600 hover:from-amber-400 hover:to-red-500 text-stone-950 font-extrabold text-sm tracking-wider uppercase shadow-[0_0_35px_rgba(245,158,11,0.5)] transition-all transform hover:scale-105 active:scale-95"
          >
            <Pizza className="w-5 h-5" />
            <span>SLICE & ENTER MENU</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={handleReplay}
            title="Replay Pizza Slicing Animation"
            className="p-3.5 rounded-full bg-stone-900/80 hover:bg-stone-800 border border-amber-500/30 text-amber-200 backdrop-blur-md transition-all transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
