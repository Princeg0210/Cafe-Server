"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Coffee, Pizza, Wine, Utensils, Info, Plus } from "lucide-react";
import { menuData, MenuItem } from "@/data/menu";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import SignatureBrewsShowcase from "@/components/SignatureBrewsShowcase";
import LocationBrewStation from "@/components/LocationBrewStation";
import TanStorySection from "@/components/TanStorySection";
import TanFooter from "@/components/TanFooter";

const categoryIcons: Record<string, React.ReactNode> = {
  starters: <Utensils className="w-5 h-5 text-[#c88a48]" />,
  primo: <Utensils className="w-5 h-5 text-[#c88a48]" />,
  pizza: <Pizza className="w-5 h-5 text-[#c88a48]" />,
  cakes: <Coffee className="w-5 h-5 text-[#c88a48]" />,
  beverages: <Wine className="w-5 h-5 text-[#c88a48]" />,
  "hot-drinks": <Coffee className="w-5 h-5 text-[#c88a48]" />,
};

export default function Home() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

  const addToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

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

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const filteredMenuData = activeCategoryFilter === "all" 
    ? menuData 
    : menuData.filter(c => c.id === activeCategoryFilter);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans relative">
      
      {/* Tan Coffee Style Navbar */}
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      {/* Tan Coffee Style Hero Header */}
      <header className="relative h-[42vh] md:h-[50vh] flex items-center justify-center overflow-hidden mx-3 md:mx-6 mt-4 rounded-3xl shadow-xl">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.jpg"
            alt="Tan Coffee Style Italian Woodfired Pizza"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#24150e]/50 bg-gradient-to-t from-[#24150e] via-[#24150e]/30 to-black/40" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 bg-[#24150e]/80 text-[#c88a48] border border-[#c88a48]/50 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-4 shadow-lg backdrop-blur-md"
          >
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>100% ARTISANAL WOODFIRED & ARABICA BREWING NOW</span>
          </motion.div>

          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-5xl sm:text-7xl md:text-8xl font-condensed font-extrabold text-white tracking-wider uppercase drop-shadow-2xl leading-none"
          >
            JAADOO <span className="text-[#c88a48]">UDAIPUR</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-3 text-sm md:text-lg font-sans text-gray-200 tracking-wide max-w-xl mx-auto"
          >
            Woodfired Neapolitan Pizza · Speciality Arabica Roasts · Mountain Tisanes
          </motion.p>
        </div>
      </header>

      {/* Tan Coffee Style Category Navigation Pills */}
      <div className="sticky top-16 z-30 bg-[#f7f3ee]/95 backdrop-blur-md border-b border-[#e8ded2] py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto flex items-center gap-2.5 no-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("all")}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-condensed font-bold uppercase tracking-wider transition-all ${
              activeCategoryFilter === "all"
                ? "bg-[#24150e] text-white shadow-xs"
                : "bg-white border border-[#e8ded2] text-gray-700 hover:border-[#c88a48]"
            }`}
          >
            All Menu Categories
          </button>
          {menuData.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryFilter(c.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-condensed font-bold uppercase tracking-wider transition-all ${
                activeCategoryFilter === c.id
                  ? "bg-[#24150e] text-white shadow-xs"
                  : "bg-white border border-[#e8ded2] text-gray-700 hover:border-[#c88a48]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">

        {/* Feature 1: Specialty Beverage Highlights */}
        <SignatureBrewsShowcase onAddToCart={addToCart} />

        {/* Main Menu List */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {filteredMenuData.map((category) => (
            <motion.section id={category.id} key={category.id} variants={itemAnim} className="relative pt-4">
              
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-2.5 rounded-full border border-[#e8ded2] shadow-2xs">
                  {categoryIcons[category.id] || <Utensils className="w-5 h-5 text-[#c88a48]" />}
                </div>
                <h3 className="text-3xl md:text-4xl font-condensed font-extrabold tracking-wider text-[#24150e] uppercase">
                  {category.name}
                </h3>
                <div className="h-px bg-[#e8ded2] flex-1 ml-3" />
              </div>

              {category.id === "pizza" && (
                <div className="mb-6 bg-amber-100/60 border border-amber-200/80 rounded-2xl p-4 flex gap-3 items-center">
                  <Info className="w-5 h-5 text-[#c88a48] flex-shrink-0" />
                  <p className="text-xs md:text-sm text-[#24150e] font-sans">
                    Check the daily specials board! Customize your pizza base. All Jaadoo pizzas are 100% vegetarian.
                  </p>
                </div>
              )}

              {/* Menu Item Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {category.items.map((item) => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.025, y: -3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="group bg-white rounded-2xl p-4 md:p-5 border border-[#e8ded2] shadow-2xs hover:shadow-xl hover:border-[#c88a48] transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden z-0 hover:z-20"
                    onClick={() => addToCart(item)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c88a48] via-[#b91c1c] to-[#c88a48] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 pr-2">
                        <h4 className="text-xl md:text-2xl font-condensed font-bold text-[#24150e] uppercase leading-tight group-hover:text-[#b91c1c] transition-colors tracking-wide">
                          {item.name}
                        </h4>
                        
                        {item.description && (
                          <p className="text-xs md:text-sm text-gray-500 italic mt-1 font-sans leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-base md:text-lg font-condensed font-bold text-[#24150e] bg-[#f7f3ee] group-hover:bg-amber-100/70 group-hover:text-[#b91c1c] px-3.5 py-1 rounded-xl border border-[#e8ded2] transition-colors">
                          ₹{item.price}
                        </span>
                        <button 
                          className="w-8 h-8 rounded-full bg-[#24150e] text-white flex items-center justify-center group-hover:bg-[#b91c1c] group-hover:scale-110 shadow-2xs transition-all"
                          aria-label="Add to cart"
                        >
                          <Plus className="w-4 h-4 text-[#c88a48]" />
                        </button>
                      </div>
                    </div>

                    {/* Reveal Details & Tags on Hover */}
                    <div className="max-h-0 opacity-0 group-hover:max-h-36 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 ease-out overflow-hidden border-t border-transparent group-hover:border-amber-200/60 group-hover:pt-2.5">
                      {item.details && (
                        <p className="text-xs text-gray-600 leading-relaxed font-sans mb-2">
                          ✨ {item.details}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.prepTime && (
                          <span className="text-[10px] font-semibold uppercase bg-amber-100/80 text-amber-950 px-2 py-0.5 rounded-md border border-amber-200/60 font-sans">
                            ⏱️ {item.prepTime}
                          </span>
                        )}
                        {item.tags?.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[10px] font-semibold uppercase bg-gray-100 group-hover:bg-white text-gray-700 px-2 py-0.5 rounded-md border border-gray-200/60 font-sans"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="ml-auto text-[10px] font-condensed font-extrabold text-[#c88a48] tracking-widest uppercase group-hover:underline">
                          + Tap to Add
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>

        {/* Tan Coffee Screenshot 1 & 2 Exact Story & Photo Gallery Section */}
        <TanStorySection />

        {/* Feature 2: Brew Station & Location Finder */}
        <LocationBrewStation />
      </main>

      {/* Tan Coffee Screenshot 2 Exact Copper Brown Footer */}
      <TanFooter />

      {/* Floating Action Button (Cart Trigger) */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-40"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#24150e] text-white py-3.5 px-6 rounded-full shadow-2xl flex items-center justify-between hover:bg-[#b91c1c] transition-all border border-white/10 backdrop-blur-lg active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#b91c1c] text-white text-xs px-2.5 py-1 rounded-full font-bold font-sans">
                  {cartCount}
                </div>
                <span className="font-condensed font-bold uppercase tracking-wider text-sm">View Running Bill</span>
              </div>
              <span className="font-condensed font-extrabold text-lg tracking-wide text-[#c88a48]">
                ₹{cartTotal}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-over Cart Drawer */}
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
