"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TanStorySection() {
  return (
    <section className="my-20 space-y-16">
      {/* Editorial Story Block */}
      <div className="bg-[#FBF9F5] rounded-3xl p-6 md:p-10 border border-[#E4DCD0] shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Side: Photo */}
        <div className="lg:col-span-6 relative h-[320px] sm:h-[400px] md:h-[440px] rounded-2xl md:rounded-3xl overflow-hidden border border-[#E4DCD0] shadow-xs">
          <Image
            src="/story-food.jpg"
            alt="Jaadoo Trattoria Artisanal Panini & Pizza"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Right Side: Editorial Headline & Story */}
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 bg-[#4A5842]/10 text-[#4A5842] px-3.5 py-1 rounded-full text-xs font-sans font-semibold uppercase tracking-widest border border-[#4A5842]/20">
            <span>OUR STORY & HERITAGE</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-5xl font-serif font-bold text-[#261C18] leading-tight">
            If It’s Magic, It’s Jaadoo
          </h2>

          <div className="space-y-4 text-xs sm:text-sm text-stone-700 font-sans leading-relaxed">
            <p>
              In 2023, two friends—<strong className="text-[#261C18]">Shivank Verma</strong> and <strong className="text-[#261C18]">Nishant Mitthal</strong>—looked around the food scene in Delhi & Rajasthan and saw predictable global chains on repeat. They set out to build something refreshingly different in Old City Udaipur.
            </p>

            <p>
              <strong className="text-[#261C18]">Jaadoo Trattoria</strong> honors the ritual of 48-hour natural dough fermentation using Italian Tipo 00 flour, San Marzano tomato passata, and fresh mozzarella Fior di Latte, paired with wild-harvested Himalayan tisanes.
            </p>

            <p className="font-serif italic text-stone-600 text-sm">
              “A mindful pause between the aroma of wood-fired baking and views of Lake Pichola.”
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/about"
              className="inline-block bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] px-7 py-3 rounded-full font-sans font-semibold text-xs uppercase tracking-widest transition-all shadow-xs active:scale-95 border border-[#E4DCD0]/30"
            >
              DISCOVER OUR STORY
            </Link>
          </div>
        </div>
      </div>

      {/* Postcard Editorial Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            img: "/gallery-1.jpg",
            tagline: "POSTCARD FROM UDAIPUR",
            sub: "A peaceful corner in the historic Old City",
          },
          {
            img: "/gallery-2.jpg",
            tagline: "WOOD-FIRED OVEN",
            sub: "48-hour slow natural sourdough fermentation",
          },
          {
            img: "/gallery-3.jpg",
            tagline: "LAKESIDE SUNSET",
            sub: "Artisanal tiramisu & Lake Pichola views",
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            className="relative h-64 md:h-72 rounded-2xl md:rounded-3xl overflow-hidden shadow-xs group cursor-pointer border border-[#E4DCD0]"
          >
            <Image
              src={item.img}
              alt={item.tagline}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#261C18]/90 via-[#261C18]/30 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-[#FBF9F5] text-center">
              <h3 className="font-sans font-bold text-lg uppercase tracking-wider text-[#FBF9F5]">
                {item.tagline}
              </h3>
              <p className="text-xs font-serif italic text-[#B85B43] mt-1">
                {item.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
