"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Heart, Sparkles, UtensilsCrossed, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import Image from "next/image";

export default function AboutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans pb-24">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-[#24150e]/80 text-[#c88a48] border border-[#c88a48]/50 px-4 py-1.5 rounded-full text-xs font-condensed font-bold uppercase tracking-widest mb-4 shadow-lg backdrop-blur-md"
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Craft & Heritage</span>
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-condensed font-extrabold text-white tracking-wider uppercase">
            Our Story & Magic
          </h1>
          <p className="text-gray-200 font-sans text-sm md:text-base mt-2">
            Bringing authentic wood-fired Neapolitan culinary heritage & 100% Arabica roasts to Old City Udaipur.
          </p>
        </div>
      </section>

      {/* Main Story Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl p-8 md:p-12 border border-[#e8ded2] shadow-md space-y-6 text-center"
        >
          <Sparkles className="w-8 h-8 text-[#c88a48] mx-auto" />
          <h2 className="text-3xl md:text-5xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide">
            Woodfired Passion & Roasted Arabica
          </h2>
          <p className="text-gray-600 font-sans leading-relaxed text-sm md:text-base max-w-2xl mx-auto">
            Nestled in the historic lanes near Gangaur Ghat, <strong className="text-[#24150e]">Jaadoo Udaipur</strong> was born out of a passion for 48-hour fermented Neapolitan crusts, artisanal Arabica roasts, and high-altitude Himalayan herb tisanes.
          </p>
        </motion.div>

        {/* Pillars / Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Flame className="w-6 h-6 text-[#b91c1c]" />,
              title: "48h Slow Fermentation",
              desc: "Our dough ferments for 48 hours creating a light, airy Neapolitan crust baked at 450°C.",
            },
            {
              icon: <UtensilsCrossed className="w-6 h-6 text-[#c88a48]" />,
              title: "100% Vegetarian Magic",
              desc: "All our pizzas, pastas, desserts, and brews are 100% vegetarian with rich vegan options.",
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
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
              className="bg-white rounded-2xl p-6 border border-[#e8ded2] shadow-2xs text-center space-y-3"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-[#e8ded2]">
                {pillar.icon}
              </div>
              <h3 className="font-condensed font-bold text-xl text-[#24150e] uppercase tracking-wide">{pillar.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Closing Note */}
        <div className="text-center py-8">
          <Heart className="w-6 h-6 text-[#b91c1c] mx-auto mb-3" />
          <p className="font-sans italic text-base text-gray-600">
            Grazie for coming to the old city to find us. <br/>
            We wish you a happy, healthy evening!
          </p>
        </div>
      </main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
