"use client";

import { motion } from "framer-motion";
import { Utensils, ArrowRight, Calendar, MapPin, Flame, Leaf } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CinematicBrandIntro from "@/components/CinematicBrandIntro";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans flex flex-col justify-between">
      {/* 1.35s Cinematic Brand Opening Sequence */}
      <CinematicBrandIntro />

      {/* Editorial Navbar with Left-Aligned Links */}
      <Navbar />

      {/* Single-Screen Fine Dining Hero Screen */}
      <header className="relative flex-1 min-h-[calc(100vh-5.5rem)] flex items-center justify-start overflow-hidden mx-3 md:mx-6 my-3 rounded-2xl shadow-2xl border border-[#3A281E]/60 bg-[#120D0A]">
        {/* Animated Hero Media: 1.04 -> 1.00 scale, 0.85 -> 1 opacity, 700ms ease-out */}
        <motion.div
          initial={{ scale: 1.04, opacity: 0.85 }}
          animate={{ scale: 1.0, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute inset-0 z-0 overflow-hidden"
        >
          {/* Slow-motion background video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-bg.jpg"
            className="w-full h-full object-cover object-center brightness-[0.88] contrast-110"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/hero-bg-video.mp4" type="video/mp4" />
          </video>
          {/* Luxury dark vignette overlay - deeper on left for optimal text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/65 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120D0A] via-transparent to-black/45" />
        </motion.div>

        <div className="relative z-10 text-left px-6 sm:px-12 md:px-16 py-12 max-w-3xl">
          
          {/* Authentic Italian editorial eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
            className="mb-4"
          >
            <span className="text-xs md:text-sm font-serif uppercase tracking-[0.35em] text-[#E8AA62] font-semibold">
              EST. 2023 · UDAIPUR OLD CITY · LAKE PICHOLA
            </span>
          </motion.div>

          {/* Luxury Serif Headline - High Contrast Pure White */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-white tracking-tight uppercase leading-[1.06] drop-shadow-2xl"
          >
            <span className="text-white block font-bold drop-shadow-2xl">JAADOO GOURMET</span>
            <span className="font-extrabold text-[#FBF9F5] drop-shadow-lg">WOOD-FIRED PIZZERIA</span>
          </motion.h1>

          {/* Refined High-Contrast Subtitle (Clean & Highly Legible) */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-base sm:text-lg md:text-xl font-sans font-normal text-stone-100 max-w-2xl leading-relaxed drop-shadow-md"
          >
            Discover an artisanal gastronomic experience that transports you to the heart of Italy, crafted with 48-hour fermented sourdough and panoramic Lake Pichola views.
          </motion.p>

          {/* Anti-AI Editorial Feature Band */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5, ease: "easeOut" }}
            className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-white/15"
          >
            <div className="inline-flex items-center gap-2 text-stone-200 text-xs sm:text-sm font-sans font-medium">
              <MapPin className="w-4 h-4 text-[#E8AA62] shrink-0" />
              <span>Gangaur Ghat Waterfront</span>
            </div>
            <span className="hidden sm:inline text-white/30">•</span>
            <div className="inline-flex items-center gap-2 text-stone-200 text-xs sm:text-sm font-sans font-medium">
              <Flame className="w-4 h-4 text-[#E8AA62] shrink-0" />
              <span>48h Natural Fermentation</span>
            </div>
            <span className="hidden sm:inline text-white/30">•</span>
            <div className="inline-flex items-center gap-2 text-stone-200 text-xs sm:text-sm font-sans font-medium">
              <Leaf className="w-4 h-4 text-[#E8AA62] shrink-0" />
              <span>100% Pure Vegetarian</span>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 0.5, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/menu"
              className="inline-flex items-center gap-2.5 border-2 border-[#E8AA62] bg-black/60 hover:bg-[#E8AA62] text-white hover:text-[#120D0A] px-8 py-3.5 rounded-xl font-sans text-xs sm:text-sm font-bold tracking-[0.2em] uppercase transition-all duration-300 backdrop-blur-md shadow-xl active:scale-95"
            >
              <Utensils className="w-4 h-4" />
              <span>EXPLORE MENU</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/book-table"
              className="inline-flex items-center gap-2.5 bg-[#C88A48] hover:bg-[#DE9B52] text-[#120D0A] px-8 py-3.5 rounded-xl font-sans text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase transition-all duration-300 shadow-2xl active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>BOOK A TABLE</span>
            </Link>
          </motion.div>
        </div>
      </header>
    </div>
  );
}
