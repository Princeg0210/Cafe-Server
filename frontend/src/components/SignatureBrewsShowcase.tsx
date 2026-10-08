"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { MenuItem } from "@/data/menu";

interface SignatureBrewsShowcaseProps {
  onAddToCart?: (item: MenuItem) => void;
}

const signatureBrews: MenuItem[] = [
  {
    id: "h2",
    name: "HIMALAYAN RHODODENDRON & THYME TISANE",
    price: 150,
    description: "Wild Himalayan red rhododendron petals brewed with garden mint & thyme.",
    details: "Hand-picked wild petals from high-altitude Himalayan valleys. Rich in antioxidants & naturally caffeine-free.",
    tags: ["Wild Harvested", "Caffeine-Free"],
    prepTime: "5 mins",
  },
  {
    id: "h3",
    name: "ROSEHIP & SPEARMINT TISANE",
    price: 150,
    description: "Vitamin C rich wild rosehip husks infused with spear mint.",
    details: "Sun-dried wild rosehips brewed hot with crisp mountain mint leaves for a tangy herbal elixir.",
    tags: ["Vitamin C Rich", "Herbal Elixir"],
    prepTime: "5 mins",
  },
  {
    id: "b4",
    name: "ARTISANAL KOMBUCHA",
    price: 250,
    description: "Raw fruits: Lemongrass + Mint, Kokum, Pineapple + Rosemary, or Pomegranate.",
    details: "Slow-fermented probiotic tea infused with fresh local botanical extracts and raw fruit nectars.",
    tags: ["Slow Fermented", "Artisanal"],
    prepTime: "Ready",
  },
];

export default function SignatureBrewsShowcase({ onAddToCart }: SignatureBrewsShowcaseProps) {
  return (
    <section className="my-20">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="w-6 h-[1px] bg-[#B85B43]/60" />
          <span className="text-xs font-serif tracking-[0.25em] text-[#B85B43] uppercase font-medium">
            SPECIALTY BOTANICALS
          </span>
          <span className="w-6 h-[1px] bg-[#B85B43]/60" />
        </div>
        <h2 className="text-3xl md:text-5xl font-serif text-[#261C18] font-normal tracking-tight">
          Himalayan Tisanes & Wild Ferments
        </h2>
        <p className="text-stone-600 font-serif italic text-sm mt-2 max-w-xl">
          Crafted with wild harvested botanicals from high-altitude estates and slow natural fermentations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {signatureBrews.map((brew) => (
          <motion.div
            key={brew.id}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-[#FBF9F5] rounded-xl p-7 border border-[#E4DCD0] shadow-xs hover:border-[#B85B43]/50 transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Fine terracotta top border highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#B85B43]/80 group-hover:bg-[#B85B43] transition-colors" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#4A5842] bg-[#4A5842]/10 px-2.5 py-1 rounded-md border border-[#4A5842]/20">
                  Specialty Brew
                </span>
                <span className="text-base font-serif font-bold text-[#261C18]">
                  ₹{brew.price}
                </span>
              </div>

              <h3 className="font-serif font-bold text-xl text-[#261C18] leading-snug group-hover:text-[#B85B43] transition-colors mb-2">
                {brew.name}
              </h3>

              <p className="text-xs text-stone-600 font-sans italic leading-relaxed mb-3">
                {brew.description}
              </p>

              <p className="text-[11px] text-stone-500 font-sans leading-normal mb-4">
                {brew.details}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-auto">
              {brew.tags?.map((t, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium uppercase bg-[#F6F3EC] text-[#261C18]/80 px-2 py-0.5 rounded border border-[#E4DCD0]"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
