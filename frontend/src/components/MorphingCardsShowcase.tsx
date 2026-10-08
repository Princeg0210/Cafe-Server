"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const showcaseCategories = [
  {
    id: "pizza",
    title: "WOOD-FIRED PIZZAS",
    sub: "48-Hour Naturally Fermented Dough",
    image: "/hero-bg.jpg",
    featured: true,
  },
  {
    id: "starters",
    title: "ARTISANAL BAKERY",
    sub: "Rosemary Focaccia & House Tarts",
    image: "/story-food.jpg",
    featured: false,
  },
  {
    id: "primo",
    title: "HAND-CRAFTED MAINS",
    sub: "Rolled Cannelloni & Small Plates",
    image: "/gallery-2.jpg",
    featured: false,
  },
  {
    id: "beverages",
    title: "INSPIRED BEVERAGES",
    sub: "Mountain Arabica & Wild Tisanes",
    image: "/gallery-3.jpg",
    featured: false,
  },
  {
    id: "cakes",
    title: "DOLCI & DESSERTS",
    sub: "Classic Tiramisu & Gelato",
    image: "/insta-6.jpg",
    featured: false,
  },
];

export default function MorphingCardsShowcase() {
  return (
    <section className="my-24 relative py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-6 h-[1px] bg-[#B85B43]/60" />
            <span className="text-xs font-serif tracking-[0.25em] text-[#B85B43] uppercase font-medium">
              OUR CULINARY CHAPTERS
            </span>
            <span className="w-6 h-[1px] bg-[#B85B43]/60" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#261C18] tracking-tight font-normal">
            Artisanal Craft & Tradition
          </h2>
          <p className="text-sm font-serif italic text-stone-600 mt-2">
            Every dish rooted in slow fermentation, fresh mountain botanicals, and classic Italian technique.
          </p>
        </div>

        {/* Editorial Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {showcaseCategories.map((cat, idx) => {
            const isWide = idx === 0;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className={isWide ? "md:col-span-3 lg:col-span-4" : "md:col-span-3 lg:col-span-2"}
              >
                <Link
                  href="/menu"
                  className="group block relative h-80 sm:h-96 rounded-xl overflow-hidden border border-[#E4DCD0]/90 bg-[#1E1714] shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1E1714]/90 via-[#1E1714]/30 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                  {/* Caption Content */}
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end text-left">
                    <span className="text-[10px] font-sans font-medium tracking-[0.2em] text-[#C88A48] uppercase mb-1">
                      DISCOVER
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl text-white tracking-wide uppercase font-normal group-hover:text-[#F3D7B5] transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-xs font-serif italic text-stone-300 mt-1 opacity-90">
                      {cat.sub}
                    </p>
                    <span className="mt-3 text-[11px] font-serif tracking-wider text-[#C88A48] inline-flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      View Menu Selection →
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
