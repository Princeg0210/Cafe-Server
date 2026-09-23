"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Coffee, Pizza, Wine, Utensils, Info, ShoppingCart, Plus } from "lucide-react";
import { menuData, MenuItem } from "@/data/menu";
import Image from "next/image";

const categoryIcons: Record<string, React.ReactNode> = {
  starters: <Utensils className="w-5 h-5 text-cafe-gold" />,
  primo: <Utensils className="w-5 h-5 text-cafe-gold" />,
  pizza: <Pizza className="w-5 h-5 text-cafe-gold" />,
  cakes: <Coffee className="w-5 h-5 text-cafe-gold" />,
  beverages: <Wine className="w-5 h-5 text-cafe-gold" />,
  "hot-drinks": <Coffee className="w-5 h-5 text-cafe-gold" />,
};

export default function Home() {
  const [cart, setCart] = useState<MenuItem[]>([]);

  const addToCart = (item: MenuItem) => {
    setCart([...cart, item]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

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
    <div className="min-h-screen bg-[#fcfaf8] text-cafe-dark selection:bg-cafe-gold/30 font-sans pb-24 relative">
      
      {/* Sticky Header & Nav */}
      <div className="sticky top-0 z-50 bg-[#fcfaf8]/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#ff6b4a]" />
            <span className="font-serif font-bold text-xl tracking-widest uppercase">JAADOO</span>
          </div>
          <button className="flex items-center gap-2 bg-cafe-dark text-cafe-cream px-4 py-2 rounded-full text-sm font-medium hover:bg-cafe-gold transition-colors shadow-md">
            <ShoppingCart className="w-4 h-4" />
            <span>{cart.length}</span>
          </button>
        </div>
        
        {/* Category Pill Nav */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto flex gap-3 no-scrollbar border-t border-gray-100">
          {menuData.map(c => (
            <a 
              href={`#${c.id}`} 
              key={c.id} 
              className="whitespace-nowrap px-5 py-2 rounded-full bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-cafe-gold hover:text-cafe-dark transition-all shadow-sm"
            >
              {c.name}
            </a>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <header className="relative h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden shadow-lg mx-3 md:mx-6 mt-4 rounded-[2rem]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.jpg"
            alt="Authentic Italian Wood-fired Pizza"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/20 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto mt-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl font-serif text-white tracking-widest uppercase drop-shadow-xl">
              Udaipur
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-6 inline-block backdrop-blur-md bg-black/40 border border-cafe-gold/60 rounded-full py-2.5 px-6 shadow-2xl"
          >
            <span className="text-base md:text-lg font-serif italic text-white tracking-wide">Italian Kitchen Magic</span>
          </motion.div>
        </div>
      </header>

      {/* Main Menu */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {menuData.map((category) => (
            <motion.section id={category.id} key={category.id} variants={itemAnim} className="relative pt-6 scroll-mt-32">
              
              {/* Category Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                  {categoryIcons[category.id] || <Utensils className="w-5 h-5 text-cafe-gold" />}
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-semibold tracking-wider text-cafe-dark uppercase">
                  {category.name}
                </h3>
                <div className="h-px bg-gray-200 flex-1 ml-4" />
              </div>

              {category.id === 'pizza' && (
                <div className="mb-6 bg-amber-50/80 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm md:text-base text-amber-900 italic font-serif">
                    Check the board for daily specials! Or customise your own pizza. All jaadoo pizza are vegetarian.
                  </p>
                </div>
              )}

              {/* Menu Items Grid - Interactive Zoom & Detail Reveal on Hover */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {category.items.map((item) => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.03, y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="group bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm hover:shadow-xl hover:border-cafe-gold/60 hover:bg-gradient-to-br hover:from-white hover:to-amber-50/30 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden z-0 hover:z-20"
                    onClick={() => addToCart(item)}
                  >
                    {/* Subtle top accent bar on hover */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cafe-gold via-cafe-red to-cafe-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg md:text-xl font-bold font-serif text-gray-800 leading-tight group-hover:text-cafe-red transition-colors">
                            {item.name}
                          </h4>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-gray-500 italic mt-1 font-serif leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-lg font-semibold text-cafe-dark bg-gray-50 group-hover:bg-amber-100/70 group-hover:text-cafe-red px-3 py-1 rounded-lg border border-gray-100 transition-colors">
                          ₹{item.price}
                        </span>
                        <button 
                          className="w-8 h-8 rounded-full bg-cafe-cream border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-cafe-gold group-hover:text-white group-hover:border-cafe-gold group-hover:scale-110 shadow-sm transition-all"
                          aria-label="Add to cart"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reveal Details & Tags smoothly on Hover */}
                    <div className="max-h-0 opacity-0 group-hover:max-h-36 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 ease-out overflow-hidden border-t border-transparent group-hover:border-amber-200/60 group-hover:pt-2.5">
                      {item.details && (
                        <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-sans mb-2.5">
                          ✨ {item.details}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.prepTime && (
                          <span className="text-[11px] font-medium bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/60">
                            ⏱️ {item.prepTime}
                          </span>
                        )}
                        {item.tags?.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[11px] font-medium bg-gray-100 group-hover:bg-white text-gray-700 px-2 py-0.5 rounded-md border border-gray-200/60 shadow-2xs"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="ml-auto text-[11px] font-bold text-cafe-gold tracking-wide uppercase group-hover:underline">
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
      </main>

      {/* Elegant, Minimal Footer */}
      <footer className="mt-20 pt-12 pb-24 border-t border-gray-200/60 max-w-2xl mx-auto text-center px-6">
        <Flame className="w-6 h-6 text-cafe-gold mx-auto mb-6 opacity-80" />
        <h4 className="font-serif text-3xl mb-4 text-gray-800 tracking-wide">Grazie!</h4>
        <p className="font-serif text-gray-500 leading-relaxed max-w-md mx-auto text-[15px]">
          Thank you for coming to the old city to find us. <br/>
          <span className="italic">Your order will be prepared fresh.</span>
        </p>
      </footer>

      {/* Floating Action Button (Cart) */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50"
          >
            <button className="w-full bg-[#1a1514] text-white py-4 px-6 rounded-full shadow-2xl flex items-center justify-between hover:bg-cafe-red transition-colors border border-white/10 backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                  {cart.length}
                </div>
                <span className="font-medium tracking-wide">View Order</span>
              </div>
              <span className="font-bold font-serif text-lg tracking-wide text-cafe-gold">
                ₹{cartTotal}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
