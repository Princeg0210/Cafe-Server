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

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans relative">

      {/* Editorial Navbar */}
      <Navbar />

      {/* Luxury Fine Dining Hero Screen */}
      <header className="relative min-h-[70vh] sm:min-h-[78vh] md:min-h-[84vh] flex items-center justify-start overflow-hidden mx-3 md:mx-6 mt-3 rounded-3xl shadow-2xl border border-[#3A281E]/60 bg-[#120D0A]">
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Slow-motion background video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/hero-bg.jpg"
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000 brightness-[0.82] contrast-110"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/hero-bg-video.mp4" type="video/mp4" />
          </video>
          {/* Luxury dark vignette overlay - deeper on left for optimal text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/65 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#120D0A] via-transparent to-black/45" />
        </div>

        <div className="relative z-10 text-left px-6 sm:px-12 md:px-16 py-12 max-w-3xl">
          
          {/* Eyebrow with gold accent lines */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <span className="w-8 md:w-12 h-[1px] bg-[#C88A48]/80" />
            <span className="text-xs md:text-sm font-serif uppercase tracking-[0.35em] text-[#C88A48] font-medium">
              EXPERIENCE
            </span>
            <span className="w-8 md:w-12 h-[1px] bg-[#C88A48]/80" />
          </motion.div>

          {/* Luxury Serif Headline */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-light text-white tracking-tight uppercase leading-[1.08] drop-shadow-2xl"
          >
            JAADOO GOURMET <br />
            <span className="font-normal text-stone-100">WOOD-FIRED PIZZERIA</span>
          </motion.h1>

          {/* Refined Subtitle */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-4 text-sm sm:text-base md:text-lg font-serif italic text-stone-300 font-light tracking-wide max-w-xl leading-relaxed"
          >
            Discover An Artisanal Gastronomic Experience That Transports You To The Heart Of Italy, Crafted With Lake Pichola Views.
          </motion.p>

          {/* Attributes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42, duration: 0.5 }}
            className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] font-sans font-medium tracking-[0.2em] text-[#C88A48] uppercase"
          >
            <span>Udaipur Old City</span>
            <span>•</span>
            <span>48h Slow Fermentation</span>
            <span>•</span>
            <span>100% Vegetarian</span>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.55 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/menu"
              className="inline-flex items-center gap-2.5 border border-[#C88A48]/90 bg-black/45 hover:bg-[#C88A48] text-[#FBF9F5] hover:text-[#120D0A] px-8 py-3.5 rounded-lg font-serif text-xs tracking-[0.25em] uppercase transition-all duration-300 backdrop-blur-md shadow-lg active:scale-95"
            >
              <Utensils className="w-4 h-4" />
              <span>EXPLORE MENU</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/book-table"
              className="inline-flex items-center gap-2.5 bg-[#C88A48] hover:bg-[#D49856] text-[#120D0A] px-8 py-3.5 rounded-lg font-serif text-xs font-bold tracking-[0.25em] uppercase transition-all duration-300 shadow-xl active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>BOOK A TABLE</span>
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Main Landing Page Sections */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-12">

        {/* Feature 1: Specialty Beverage Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <SignatureBrewsShowcase />
        </motion.div>

        {/* Feature 2: Editorial Culinary Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <MorphingCardsShowcase />
        </motion.div>

        {/* Feature 3: Story & Heritage Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <TanStorySection />
        </motion.div>

        {/* Feature 4: Recreated Instagram Feed Grid */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <JaadooInstagramGrid />
        </motion.div>

        {/* Feature 5: Location & Station Finder */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <LocationBrewStation />
        </motion.div>
      </main>

      {/* Editorial Footer */}
      <TanFooter />
    </div>
  );
}
