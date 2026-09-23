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
    <div className="min-h-screen bg-[#fcfaf8] text-cafe-dark font-sans pb-24">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Section */}
      <section className="relative h-[45vh] flex items-center justify-center overflow-hidden mx-3 md:mx-6 mt-4 rounded-3xl shadow-lg">
        <Image
          src="/hero-bg.jpg"
          alt="Jaadoo Udaipur Kitchen Story"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-cafe-gold/20 text-cafe-gold border border-cafe-gold/40 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
          >
            <Flame className="w-4 h-4 text-cafe-red" />
            <span>Italian Kitchen Magic</span>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-wide">
            Our Story & Craft
          </h1>
          <p className="text-gray-200 font-serif italic text-lg mt-3">
            Bringing authentic wood-fired Neapolitan culinary heritage to the romantic alleys of Old City Udaipur.
          </p>
        </div>
      </section>

      {/* Main Story Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 space-y-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-md space-y-6 text-center"
        >
          <Sparkles className="w-8 h-8 text-cafe-gold mx-auto" />
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-cafe-dark">
            Woodfired Passion in Old City
          </h2>
          <p className="text-gray-600 font-serif leading-relaxed text-base md:text-lg max-w-2xl mx-auto">
            Nestled in the historic lanes of Udaipur, <strong className="text-cafe-dark font-semibold">Jaadoo</strong> was born out of a deep love for slow-fermented pizza dough, hand-stretched pasta, and fragrant mountain herb infusions. Every dish is crafted using traditional techniques and baked at 450°C in our custom brick oven.
          </p>
        </motion.div>

        {/* Pillars / Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Flame className="w-6 h-6 text-cafe-red" />,
              title: "48h Slow Fermentation",
              desc: "Our pizza dough ferments for 48 hours creating a light, airy crust that is easy to digest.",
            },
            {
              icon: <UtensilsCrossed className="w-6 h-6 text-cafe-gold" />,
              title: "100% Vegetarian Magic",
              desc: "All our pizzas, pastas, and desserts are 100% vegetarian with rich vegan and gluten-friendly options.",
            },
            {
              icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
              title: "Himalayan Herbs & Botanicals",
              desc: "We source our tisane herbs, rosehips, and mountain teas directly from high-altitude growers.",
            },
          ].map((pillar, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-2xs text-center space-y-3"
            >
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                {pillar.icon}
              </div>
              <h3 className="font-serif font-bold text-lg text-cafe-dark">{pillar.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">{pillar.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Closing Note */}
        <div className="text-center py-8">
          <Heart className="w-6 h-6 text-cafe-red mx-auto mb-3" />
          <p className="font-serif italic text-lg text-gray-600">
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
