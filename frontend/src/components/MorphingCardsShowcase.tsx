"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const showcaseCategories = [
  {
    id: "pizza",
    title: "WOOD-FIRED PIZZAS",
    sub: "48-Hour Naturally Fermented Dough",
    image: "/jaadoo-margherita-lakeside.png",
    featured: true,
  },
  {
    id: "starters",
    title: "ARTISANAL BAKERY",
    sub: "Rosemary Focaccia and House Tarts",
    image: "/jaadoo-focaccia-rosemary.png",
    featured: false,
  },
  {
    id: "primo",
    title: "HAND-CRAFTED MAINS",
    sub: "Rolled Cannelloni and Small Plates",
    image: "/jaadoo-pizza-prep.png",
    featured: false,
  },
  {
    id: "beverages",
    title: "INSPIRED BEVERAGES",
    sub: "Mountain Arabica and Wild Tisanes",
    image: "/gallery-3.jpg",
    featured: false,
  },
  {
    id: "cakes",
    title: "DOLCI AND DESSERTS",
    sub: "Classic Tiramisu and Gelato",
    image: "/jaadoo-tiramisu-craft.jpg",
    featured: false,
  },
];

export default function MorphingCardsShowcase() {
  return (
    <section className="my-24 relative py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-serif italic text-sm text-[#9E3E26] tracking-widest font-normal block mb-1">
            Capitolo II · Dal Forno Alla Tavola
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#140E0A] tracking-tight font-bold">
            Artisanal Craft and Tradition
          </h2>
          <div className="w-12 h-0.5 bg-[#9E3E26] mx-auto my-3" />
          <p className="text-sm sm:text-base font-sans text-[#2B1E17] font-normal leading-relaxed">
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
                  className="group block relative h-80 sm:h-96 rounded-xl overflow-hidden border border-[#DDD3C4] bg-[#140E0A] shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#140E0A]/95 via-[#140E0A]/40 to-transparent transition-opacity duration-300 group-hover:opacity-90" />

                  {/* Caption Content */}
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end text-left">
                    <span className="text-[11px] font-sans font-bold tracking-[0.2em] text-[#E8A563] uppercase mb-1 drop-shadow-sm">
                      DISCOVER
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl text-white tracking-wide uppercase font-bold group-hover:text-[#F3D7B5] transition-colors drop-shadow-md">
                      {cat.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-sans font-medium text-stone-200 mt-1 drop-shadow-sm">
                      {cat.sub}
                    </p>
                    <span className="mt-3 text-xs font-sans font-semibold tracking-wider text-[#E8A563] inline-flex items-center gap-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
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
