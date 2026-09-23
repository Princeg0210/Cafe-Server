"use client";

import { motion } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";
import { MenuItem } from "@/data/menu";

interface SignatureBrewsShowcaseProps {
  onAddToCart: (item: MenuItem) => void;
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
    <section className="my-16">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-[#4A5842]/10 text-[#4A5842] px-4 py-1 rounded-full text-xs font-sans font-semibold uppercase tracking-widest mb-3 border border-[#4A5842]/20">
          <Sparkles className="w-3.5 h-3.5 text-[#B85B43]" />
          <span>Specialty Beverage Highlights</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#261C18]">
          Signature Himalayan Tisanes & Kombuchas
        </h2>
        <p className="text-stone-600 font-sans text-xs md:text-sm mt-2 max-w-xl">
          Crafted with wild harvested botanicals from high-altitude estates & slow fermentations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {signatureBrews.map((brew) => (
          <motion.div
            key={brew.id}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-[#FBF9F5] rounded-2xl p-6 border border-[#E4DCD0] shadow-xs hover:shadow-lg hover:border-[#B85B43]/50 transition-all flex flex-col justify-between relative overflow-hidden group"
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

            <div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {brew.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium uppercase bg-[#F6F3EC] text-[#261C18]/80 px-2 py-0.5 rounded border border-[#E4DCD0]"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <button
                onClick={() => onAddToCart(brew)}
                className="w-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] py-2.5 px-4 rounded-xl font-sans font-semibold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 border border-[#E4DCD0]/30"
              >
                <Plus className="w-3.5 h-3.5 text-[#B85B43]" />
                <span>Add to Bill (₹{brew.price})</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
