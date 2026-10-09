"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Heart, Sparkles, UtensilsCrossed, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import TanFooter from "@/components/TanFooter";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[45vh] flex items-center justify-center overflow-hidden mx-3 md:mx-6 mt-4 rounded-3xl shadow-lg">
        <Image
          src="/hero-bg.jpg"
          alt="Jaadoo Udaipur Kitchen Story"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#24150e]/60" />
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-2"
          >
            <span className="font-serif italic text-sm sm:text-base text-[#E8AA62] tracking-widest font-normal block">
              — Capitolo Storico · Est. 2023 —
            </span>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-normal uppercase">
            Our Story and Magic
          </h1>
          <p className="text-stone-100 font-sans font-medium text-sm md:text-base mt-2 drop-shadow-sm">
            Bringing authentic wood-fired Neapolitan culinary heritage and 100% Arabica roasts to Old City Udaipur.
          </p>
        </div>
      </section>

      {/* Main Story Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl p-8 md:p-12 border border-[#DDD3C4] shadow-sm space-y-6 text-center"
        >
          <Sparkles className="w-8 h-8 text-[#9E3E26] mx-auto" />
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#140E0A] tracking-tight">
            Woodfired Passion and Roasted Arabica
          </h2>
          <p className="text-[#261A12] font-sans leading-relaxed text-base md:text-lg max-w-2xl mx-auto">
            Nestled at 32 Sitaphal ki gali in the historic lanes of Ganesh Ghati, <strong className="text-[#140E0A] font-bold">Jaadoo Udaipur</strong> was born out of a passion for 48-hour Neapolitan crusts, artisanal Arabica roasts, and high-altitude Himalayan herb tisanes.
          </p>
        </motion.div>

        {/* Pillars / Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Flame className="w-6 h-6 text-[#9E3E26]" />,
              title: "48h Slow Fermentation",
              desc: "Our dough ferments for 48 hours creating a light, airy Neapolitan crust baked at 450°C.",
            },
            {
              icon: <UtensilsCrossed className="w-6 h-6 text-[#9E3E26]" />,
              title: "100% Vegetarian Magic",
              desc: "All our pizzas, pastas, desserts, and brews are 100% vegetarian with rich vegan options.",
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-[#1B3618]" />,
              title: "Himalayan Botanicals",
              desc: "Wild harvested rhododendron, spear mint, and tisane herbs sourced directly from Himalayan estates.",
            },
          ].map((pillar, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-[#DDD3C4] shadow-xs text-center space-y-3"
            >
              <div className="w-12 h-12 bg-[#FAF7F2] rounded-full flex items-center justify-center mx-auto border border-[#DDD3C4]">
                {pillar.icon}
              </div>
              <h3 className="font-serif font-bold text-lg text-[#140E0A] tracking-normal">{pillar.title}</h3>
              <p className="text-xs sm:text-sm text-[#2B1D14] leading-relaxed font-sans font-normal">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <TanFooter />

    </div>
  );
}
