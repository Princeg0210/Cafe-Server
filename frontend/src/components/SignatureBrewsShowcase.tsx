"use client";

import { motion } from "framer-motion";
import { Sparkles, Flame, Coffee, Heart, Plus } from "lucide-react";
import { MenuItem } from "@/data/menu";

interface SignatureBrewsShowcaseProps {
  onAddToCart: (item: MenuItem) => void;
}

const signatureBrews: MenuItem[] = [
  {
    id: "h2",
    name: "RHODODENDRON MINT & THYME TISANE",
    price: 150,
    description: "Wild Himalayan red rhododendron petals brewed with garden mint & thyme.",
    details: "Hand-picked wild petals from high-altitude Himalayan valleys. Rich in antioxidants & naturally caffeine-free.",
    tags: ["Wild Harvested", "Caffeine-Free", "Highland Heritage"],
    prepTime: "5 mins",
  },
  {
    id: "h3",
    name: "HIMALAYAN ROSEHIP & MINT TISANE",
    price: 150,
    description: "Vitamin C rich wild rosehip husks infused with spear mint.",
    details: "Sun-dried wild rosehips brewed hot with crisp mountain mint leaves for a tangy herbal elixir.",
    tags: ["Vitamin C Rich", "Herbal Elixir"],
    prepTime: "5 mins",
  },
  {
    id: "b6",
    name: "ARTISANAL KOMBUCHA",
    price: 250,
    description: "Raw fruits: Lemongrass + Mint, Kokum, Pineapple + Rosemary, or Pomegranate.",
    details: "Slow-fermented probiotic tea infused with fresh local botanical extracts and raw fruit nectars.",
    tags: ["Probiotic Brew", "Artisanal", "Chilled"],
    prepTime: "Ready",
  },
];

export default function SignatureBrewsShowcase({ onAddToCart }: SignatureBrewsShowcaseProps) {
  return (
    <section className="my-16">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-[#24150e]/10 text-[#24150e] px-4 py-1.5 rounded-full text-xs font-condensed font-bold uppercase tracking-widest mb-3">
          <Sparkles className="w-4 h-4 text-[#c88a48]" />
          <span>Specialty Beverage Highlights</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide">
          Signature Himalayan Tisanes & Kombuchas
        </h2>
        <p className="text-gray-600 font-sans text-xs md:text-sm mt-2 max-w-xl">
          Crafted with wild harvested botanicals from high-altitude estates & artisanal slow fermentations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {signatureBrews.map((brew) => (
          <motion.div
            key={brew.id}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-gradient-to-br from-white via-[#fefcf9] to-[#f9f4ed] rounded-3xl p-6 border border-[#c88a48]/40 shadow-sm hover:shadow-xl hover:border-[#c88a48] transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Top Accent Ribbon */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c88a48] via-[#b91c1c] to-[#c88a48]" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-condensed font-extrabold uppercase bg-[#24150e] text-[#c88a48] px-2.5 py-1 rounded-full tracking-wider">
                  Signature Brew
                </span>
                <span className="text-sm font-condensed font-bold text-[#24150e] bg-amber-100/80 px-3 py-0.5 rounded-lg border border-amber-200/80">
                  ₹{brew.price}
                </span>
              </div>

              <h3 className="font-condensed font-extrabold text-xl text-[#24150e] uppercase leading-tight group-hover:text-[#b91c1c] transition-colors mb-2">
                {brew.name}
              </h3>

              <p className="text-xs text-gray-600 italic font-sans leading-relaxed mb-3">
                {brew.description}
              </p>

              <p className="text-[11px] text-gray-500 font-sans leading-normal mb-4">
                {brew.details}
              </p>
            </div>

            <div>
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {brew.tags?.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-semibold uppercase bg-white text-[#24150e] px-2 py-0.5 rounded-md border border-[#e8ded2] shadow-2xs font-sans"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <button
                onClick={() => onAddToCart(brew)}
                className="w-full bg-[#24150e] hover:bg-[#b91c1c] text-white py-2.5 px-4 rounded-xl font-condensed font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 group-hover:scale-102"
              >
                <Plus className="w-4 h-4 text-[#c88a48]" />
                <span>Add Signature Brew (₹{brew.price})</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
