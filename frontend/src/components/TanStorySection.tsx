"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TanStorySection() {
  return (
    <section className="my-20 space-y-16">
      {/* Tan Coffee Screenshot 1 Style Story Block */}
      <div className="bg-white rounded-3xl p-6 md:p-10 border border-[#e8ded2] shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Side: Photo */}
        <div className="lg:col-span-6 relative h-[320px] sm:h-[400px] md:h-[440px] rounded-2xl md:rounded-3xl overflow-hidden shadow-md">
          <Image
            src="/story-food.jpg"
            alt="Jaadoo Italian Kitchen Gourmet Panini & Pizza"
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Right Side: Headline & Story */}
        <div className="lg:col-span-6 space-y-5">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide leading-none">
            IF IT'S MAGIC, IT'S JAADOO
          </h2>

          <div className="space-y-4 text-xs sm:text-sm text-gray-700 font-sans leading-relaxed">
            <p>
              In 2023, two friends—<strong className="text-[#24150e]">Shivank Verma</strong> and <strong className="text-[#24150e]">Nishant Mitthal</strong>—looked around the food scene in Delhi & Rajasthan and saw the same story on repeat: overpriced global chains with impersonal vibes, and local joints that missed the mark on quality or ambience.
            </p>

            <p>
              And so, <strong className="text-[#24150e]">Jaadoo Udaipur</strong> was born—a cafe that doesn't just serve food—but curates conversations, sparks creativity, and celebrates modern India and its evolving culinary culture.
            </p>

            <p>
              In a market crowded with predictable cafe chains, <strong className="text-[#24150e]">Jaadoo</strong> is brewing & baking something refreshingly different in Old City Udaipur.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/about"
              className="inline-block bg-[#b86638] hover:bg-[#a05429] text-white px-8 py-3.5 rounded-xl font-condensed font-bold text-sm uppercase tracking-wider transition-colors shadow-md active:scale-95"
            >
              DISCOVER OUR STORY
            </Link>
          </div>
        </div>
      </div>

      {/* Tan Coffee Screenshot 2 Top: 3-Column Outlets / Postcard Photo Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            img: "/gallery-1.jpg",
            tagline: "POSTCARD FROM UDAIPUR",
            sub: "Found a new corner · Worth staying in",
          },
          {
            img: "/gallery-2.jpg",
            tagline: "JAADOO KITCHEN",
            sub: "Artisanal Woodfired & Espresso Station",
          },
          {
            img: "/gallery-3.jpg",
            tagline: "OLD CITY SUNSET",
            sub: "Lakeside views & fresh tiramisu",
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -5 }}
            className="relative h-64 md:h-72 rounded-2xl md:rounded-3xl overflow-hidden shadow-md group cursor-pointer border border-[#e8ded2]"
          >
            <Image
              src={item.img}
              alt={item.tagline}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-white text-center">
              <h3 className="font-condensed font-extrabold text-2xl sm:text-3xl uppercase tracking-wider drop-shadow-md">
                {item.tagline}
              </h3>
              <p className="text-xs font-serif italic text-amber-200 opacity-90 mt-1">
                {item.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
