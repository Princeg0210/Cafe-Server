"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Mail, MapPin, Leaf, Utensils } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CinematicBrandIntro from "@/components/CinematicBrandIntro";

export default function Home() {
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans flex flex-col justify-between">
      {/* 1.35s Cinematic Brand Opening Sequence */}
      <CinematicBrandIntro />

      {/* Editorial Navbar with Left-Aligned Links */}
      <Navbar showNavigation={false} />

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
            className="w-full h-full object-cover object-center brightness-105 contrast-105"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
            <source src="/hero-bg-video.mp4" type="video/mp4" />
          </video>
          {/* Refined luminous overlay - balanced for maximum brightness while keeping text crisp */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
        </motion.div>

        <div className="relative z-10 text-left px-6 sm:px-12 md:px-16 py-12 max-w-3xl">

          {/* Authentic Italian editorial eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
            className="mb-4"
          >

          </motion.div>

          {/* Luxury Serif Headline - High Contrast Pure White */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold text-white tracking-tight uppercase leading-[1.06] drop-shadow-2xl"
          >
            <span className="text-white block font-bold drop-shadow-2xl">JAADOO</span>
            <span className="font-extrabold text-[#FBF9F5] drop-shadow-lg">PIZZA PROJECT</span>
          </motion.h1>

          {/* Refined High-Contrast Subtitle (Clean & Highly Legible) */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.5, ease: "easeOut" }}
            className="mt-5 text-base sm:text-lg md:text-xl font-sans font-normal text-stone-100 max-w-2xl leading-relaxed drop-shadow-md"
          >
            Jaadoo Pizza Project is an artisanal pizza destination nestled in the historic lanes of Old City, Udaipur. Known for handcrafted pizzas, thoughtfully curated ingredients, and a warm, intimate dining experience, Jaadoo offers a relaxed yet refined setting for pizza and Udaipur lovers.
          </motion.p>

          {/* Anti-AI Editorial Feature Band */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5, ease: "easeOut" }}
            className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 pt-5 border-t border-white/15"
          >
            <Link
              href="/location"
              className="inline-flex items-center gap-2 text-stone-200 hover:text-[#E8AA62] text-xs sm:text-sm font-sans font-medium transition-colors group"
            >
              <MapPin className="w-4 h-4 text-[#E8AA62] shrink-0 group-hover:scale-110 transition-transform" />
              <span>32 Sitaphal ki gali, Ganesh Ghati</span>
            </Link>
            <span className="hidden sm:inline text-white/30">•</span>
            <a
              href="https://www.instagram.com/jaadoo_pizza_project/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-stone-200 hover:text-[#E8AA62] text-xs sm:text-sm font-sans font-medium transition-colors group cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-[#E8AA62] shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              <span className="underline underline-offset-4 decoration-white/30 group-hover:decoration-[#E8AA62]">
                @jaadoo_pizza_project
              </span>
            </a>
            <span className="hidden sm:inline text-white/30">•</span>
            <div className="inline-flex items-center gap-2 text-stone-200 text-xs sm:text-sm font-sans font-medium">
              <Leaf className="w-4 h-4 text-[#E8AA62] shrink-0" />
              <span>100% Vegetarian Pizzas</span>
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
              href="/book-table"
              className="inline-flex items-center gap-2.5 bg-[#C88A48] hover:bg-[#DE9B52] text-[#120D0A] px-8 py-3.5 rounded-xl font-sans text-xs sm:text-sm font-extrabold tracking-[0.2em] uppercase transition-all duration-300 shadow-2xl active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>BOOK A TABLE</span>
            </Link>

            <button
              type="button"
              aria-expanded={isGetStartedOpen}
              aria-controls="get-started-links"
              onClick={() => setIsGetStartedOpen((isOpen) => !isOpen)}
              className="inline-flex items-center gap-2.5 border border-[#E8AA62]/70 bg-black/40 hover:bg-[#E8AA62] text-white hover:text-[#120D0A] px-6 py-3.5 rounded-xl font-sans text-xs sm:text-sm font-bold tracking-[0.16em] uppercase transition-all duration-300 backdrop-blur-md shadow-xl active:scale-95"
            >
              Get started
            </button>

            {isGetStartedOpen && (
              <motion.nav
                id="get-started-links"
                aria-label="Get started links"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="basis-full grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl"
              >
                <Link href="/menu" className="group rounded-xl border border-white/20 bg-black/40 hover:border-[#E8AA62] hover:bg-black/55 px-4 py-3 transition-colors">
                  <Utensils className="w-4 h-4 text-[#E8AA62] mb-3" />
                  <span className="block font-serif text-lg font-bold text-white">Menu</span>
                </Link>
                <Link href="/location" className="group rounded-xl border border-white/20 bg-black/40 hover:border-[#E8AA62] hover:bg-black/55 px-4 py-3 transition-colors">
                  <MapPin className="w-4 h-4 text-[#E8AA62] mb-3" />
                  <span className="block font-serif text-lg font-bold text-white">Location</span>
                </Link>
                <Link href="/contact" className="group rounded-xl border border-white/20 bg-black/40 hover:border-[#E8AA62] hover:bg-black/55 px-4 py-3 transition-colors">
                  <Mail className="w-4 h-4 text-[#E8AA62] mb-3" />
                  <span className="block font-serif text-lg font-bold text-white">Contact us</span>
                </Link>
              </motion.nav>
            )}
          </motion.div>
        </div>
      </header>
    </div>
  );
}
