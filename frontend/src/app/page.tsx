"use client";

import { motion } from "framer-motion";
import { Utensils, ArrowRight, Calendar } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SignatureBrewsShowcase from "@/components/SignatureBrewsShowcase";
import MorphingCardsShowcase from "@/components/MorphingCardsShowcase";
import LocationBrewStation from "@/components/LocationBrewStation";
import TanStorySection from "@/components/TanStorySection";
import JaadooInstagramGrid from "@/components/JaadooInstagramGrid";
import TanFooter from "@/components/TanFooter";
import TextZoomSplash from "@/components/TextZoomSplash";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans relative">

      {/* Site Load Pizza Zoom Intro Splash */}
      <TextZoomSplash autoPlay={true} />

      {/* Editorial Navbar */}
      <Navbar />

      {/* Contemporary Editorial Landing Hero Banner */}
      <header className="relative min-h-[55vh] md:min-h-[66vh] flex items-center justify-center overflow-hidden mx-3 md:mx-6 mt-4 rounded-3xl shadow-lg border border-[#E4DCD0] bg-[#261C18]">
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Subtle slow-motion background video with poster fallback */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-bg.jpg"
            className="w-full h-full object-cover object-center"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
          </video>
          {/* Refined cinematic warm-dark tint overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#261C18]/85 via-[#261C18]/35 to-black/25" />
        </div>

        <div className="relative z-10 text-center px-6 py-12 max-w-4xl mx-auto">


          <motion.h1
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.55 }}
            className="text-5xl sm:text-7xl md:text-8xl font-serif font-extrabold text-[#FBF9F5] tracking-tight leading-none drop-shadow-lg"
          >
            JAADOO <span className="font-serif italic font-normal text-[#B85B43]">Trattoria</span>
          </motion.h1>

          <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.55 }}
            className="mt-3 text-sm md:text-base font-serif italic text-stone-200 tracking-wide max-w-xl mx-auto"
          >
            Artisanal Neapolitan Pizza • Mountain Arabica Coffee • Wild Tisanes
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-3 flex items-center justify-center gap-3 text-[10px] font-sans font-semibold tracking-widest text-[#E4DCD0] uppercase"
          >
            <span>Udaipur Old City</span>
            <span>•</span>
            <span>48h Slow Fermentation</span>
            <span>•</span>
            <span>100% Vegetarian</span>
          </motion.div>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.55 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/menu"
              className="inline-flex items-center gap-2.5 bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] px-8 py-3.5 rounded-full font-sans font-semibold text-xs tracking-widest uppercase transition-all shadow-lg active:scale-95 border border-[#E4DCD0]/30"
            >
              <Utensils className="w-4 h-4" />
              <span>EXPLORE OUR MENU</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/book-table"
              className="inline-flex items-center gap-2.5 bg-[#261C18]/90 hover:bg-[#261C18] text-[#FBF9F5] px-7 py-3.5 rounded-full font-sans font-semibold text-xs tracking-widest uppercase transition-all backdrop-blur-md border border-[#E4DCD0]/30 shadow-md active:scale-95"
            >
              <Calendar className="w-4 h-4 text-[#B85B43]" />
              <span>BOOK A TABLE</span>
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Main Landing Page Sections with Scroll Morphing Animations */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-12">

        {/* Feature 1: Specialty Beverage Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <SignatureBrewsShowcase />
        </motion.div>

        {/* Feature 2: Interactive 3D Morphing Cards Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <MorphingCardsShowcase />
        </motion.div>

        {/* Feature 3: Story & Heritage Section */}
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <TanStorySection />
        </motion.div>

        {/* Feature 4: Recreated Instagram Feed Grid */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <JaadooInstagramGrid />
        </motion.div>

        {/* Feature 5: Location & Station Finder */}
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <LocationBrewStation />
        </motion.div>
      </main>

      {/* Editorial Footer */}
      <TanFooter />
    </div>
  );
}
