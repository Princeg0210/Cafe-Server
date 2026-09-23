"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Utensils, Coffee, Pizza, Croissant, Cake } from "lucide-react";

const showcaseCategories = [
  {
    id: "starters",
    title: "ARTISANAL BAKERY",
    sub: "Rosemary Focaccia & House Tarts",
    image: "/story-food.jpg",
    icon: <Croissant className="w-8 h-8 text-[#FBF9F5]" />,
  },
  {
    id: "pizza",
    title: "WOOD-FIRED PIZZAS",
    sub: "48h Natural Dough Fermentation",
    image: "/hero-bg.jpg",
    icon: <Pizza className="w-8 h-8 text-[#FBF9F5]" />,
  },
  {
    id: "primo",
    title: "ALL DAY MAINS & PASTA",
    sub: "Hand-Rolled Cannelloni & Small Plates",
    image: "/gallery-2.jpg",
    icon: <Utensils className="w-8 h-8 text-[#FBF9F5]" />,
  },
  {
    id: "beverages",
    title: "INSPIRED BEVERAGES",
    sub: "Himalayan Tisanes & Kombuchas",
    image: "/gallery-3.jpg",
    icon: <Coffee className="w-8 h-8 text-[#FBF9F5]" />,
  },
  {
    id: "cakes",
    title: "TRATTORIA DESSERTS",
    sub: "Classic Tiramisu & Coconut Gelato",
    image: "/insta-6.jpg",
    icon: <Cake className="w-8 h-8 text-[#FBF9F5]" />,
  },
];

export default function MorphingCardsShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Scroll morphing transforms
  const rotateY1 = useTransform(scrollYProgress, [0, 0.5, 1], [-25, 0, 15]);
  const rotateY5 = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -25]);
  const scaleCenter = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.05, 0.95]);

  return (
    <section ref={containerRef} className="my-20 relative py-14 overflow-hidden">
      {/* Torn-Paper Texture Background Strip matching user reference image */}
      <div className="absolute inset-0 bg-[#F6F3EC] border-y border-[#E4DCD0] opacity-90 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#E4DCD0_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="text-xs font-sans font-semibold tracking-[0.25em] text-[#4A5842] uppercase bg-[#4A5842]/10 px-4 py-1.5 rounded-full border border-[#4A5842]/20 inline-block mb-2">
            ESPLORA LE NOSTRE SPECIALITÀ
          </span>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#261C18]">
            Crafted Culinary Offerings
          </h2>
          <p className="text-xs md:text-sm font-serif italic text-stone-600 mt-1">
            Tap any category to explore our complete menu selections
          </p>
        </div>

        {/* 3D Morphing Perspective Container */}
        <div className="perspective-[1200px] overflow-x-auto pb-8 pt-4 no-scrollbar">
          <div className="flex items-center justify-start md:justify-center gap-5 min-w-max px-4">
            {showcaseCategories.map((cat, idx) => {
              let customRotateY = rotateY1;
              if (idx >= 3) customRotateY = rotateY5;

              return (
                <Link key={cat.id} href="/menu">
                  <motion.div
                    style={{
                      rotateY: idx === 0 || idx === 4 ? customRotateY : 0,
                      scale: idx === 2 ? scaleCenter : 1,
                    }}
                    whileHover={{
                      scale: 1.06,
                      rotateY: 0,
                      y: -8,
                      transition: { type: "spring", stiffness: 350, damping: 22 },
                    }}
                    className="relative w-64 h-96 sm:w-72 sm:h-[420px] rounded-3xl overflow-hidden shadow-lg border border-[#E4DCD0] group cursor-pointer transform-gpu bg-[#261C18]"
                  >
                    {/* Background Image */}
                    <Image
                      src={cat.image}
                      alt={cat.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#261C18] via-[#261C18]/40 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                    {/* Fine terracotta top border highlight */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#B85B43] group-hover:h-1.5 transition-all" />

                    {/* Card Content & Icon Overlay (Matching user reference image layout) */}
                    <div className="absolute inset-x-0 bottom-8 p-6 text-center text-[#FBF9F5] flex flex-col items-center justify-end h-full">
                      {/* Floating Icon */}
                      <div className="mb-4 p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 group-hover:bg-[#B85B43] group-hover:scale-110 transition-all shadow-md">
                        {cat.icon}
                      </div>

                      {/* Title */}
                      <h3 className="font-serif font-extrabold text-xl sm:text-2xl tracking-wider text-[#FBF9F5] uppercase drop-shadow-md group-hover:text-[#B85B43] transition-colors">
                        {cat.title}
                      </h3>

                      {/* Subtitle */}
                      <p className="text-xs font-serif italic text-stone-300 mt-1 opacity-90">
                        {cat.sub}
                      </p>

                      <span className="mt-3 text-[10px] font-sans font-semibold tracking-widest text-[#B85B43] uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore Category →
                      </span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
