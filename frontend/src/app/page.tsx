"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Coffee, Pizza, Wine, Utensils, Info, Plus } from "lucide-react";
import { menuData, MenuItem } from "@/data/menu";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";

const categoryIcons: Record<string, React.ReactNode> = {
  starters: <Utensils className="w-5 h-5 text-cafe-gold" />,
  primo: <Utensils className="w-5 h-5 text-cafe-gold" />,
  pizza: <Pizza className="w-5 h-5 text-cafe-gold" />,
  cakes: <Coffee className="w-5 h-5 text-cafe-gold" />,
  beverages: <Wine className="w-5 h-5 text-cafe-gold" />,
  "hot-drinks": <Coffee className="w-5 h-5 text-cafe-gold" />,
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
    <div className="min-h-screen bg-[#fcfaf8] text-cafe-dark selection:bg-cafe-gold/30 font-sans pb-24 relative">
      
      {/* Universal Navigation Header */}
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      {/* Hero Section */}
      <header className="relative h-[40vh] md:h-[48vh] flex items-center justify-center overflow-hidden shadow-lg mx-3 md:mx-6 mt-4 rounded-3xl">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.jpg"
            alt="Authentic Italian Wood-fired Pizza"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/30 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-white tracking-widest uppercase drop-shadow-xl">
              JAADOO UDAIPUR
            </h1>
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-5 inline-block backdrop-blur-md bg-black/40 border border-cafe-gold/60 rounded-full py-2 px-6 shadow-2xl"
          >
            <span className="text-sm md:text-base font-serif italic text-white tracking-wide">
              Italian Kitchen Magic · Table QR Menu
            </span>
          </motion.div>
        </div>
      </header>

      {/* Category Filter Pills */}
      <div className="sticky top-16 z-30 bg-[#fcfaf8]/95 backdrop-blur-md border-b border-gray-200/80 py-3 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 overflow-x-auto flex items-center gap-2.5 no-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("all")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategoryFilter === "all"
                ? "bg-cafe-dark text-white shadow-2xs"
                : "bg-white border border-gray-200 text-gray-700 hover:border-cafe-gold"
            }`}
          >
            All Menu Categories
          </button>
          {menuData.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryFilter(c.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeCategoryFilter === c.id
                  ? "bg-cafe-dark text-white shadow-2xs"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-cafe-gold"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Menu List */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
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
                <div className="bg-white p-2 rounded-full border border-gray-200 shadow-2xs">
                  {categoryIcons[category.id] || <Utensils className="w-5 h-5 text-cafe-gold" />}
                </div>
                <h3 className="text-2xl md:text-3xl font-serif font-bold tracking-wider text-cafe-dark uppercase">
                  {category.name}
                </h3>
                <div className="h-px bg-gray-200 flex-1 ml-3" />
              </div>

              {category.id === "pizza" && (
                <div className="mb-6 bg-amber-50/80 border border-amber-100 rounded-xl p-3.5 flex gap-3 items-center">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs md:text-sm text-amber-900 italic font-serif">
                    Check the board for daily specials! Or customise your own pizza. All jaadoo pizza are vegetarian.
                  </p>
                </div>
              )}

              {/* Menu Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {category.items.map((item) => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.025, y: -3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="group bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-2xs hover:shadow-xl hover:border-cafe-gold/60 hover:bg-gradient-to-br hover:from-white hover:to-amber-50/30 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden z-0 hover:z-20"
                    onClick={() => addToCart(item)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cafe-gold via-cafe-red to-cafe-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 pr-2">
                        <h4 className="text-lg md:text-xl font-bold font-serif text-gray-800 leading-tight group-hover:text-cafe-red transition-colors">
                          {item.name}
                        </h4>
                        
                        {item.description && (
                          <p className="text-xs md:text-sm text-gray-500 italic mt-1 font-serif leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-base md:text-lg font-semibold text-cafe-dark bg-gray-50 group-hover:bg-amber-100/70 group-hover:text-cafe-red px-3 py-1 rounded-lg border border-gray-100 transition-colors">
                          ₹{item.price}
                        </span>
                        <button 
                          className="w-8 h-8 rounded-full bg-cafe-cream border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-cafe-gold group-hover:text-white group-hover:border-cafe-gold group-hover:scale-110 shadow-2xs transition-all"
                          aria-label="Add to cart"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Reveal Details & Tags on Hover */}
                    <div className="max-h-0 opacity-0 group-hover:max-h-36 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 ease-out overflow-hidden border-t border-transparent group-hover:border-amber-200/60 group-hover:pt-2">
                      {item.details && (
                        <p className="text-xs text-gray-600 leading-relaxed font-sans mb-2">
                          ✨ {item.details}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.prepTime && (
                          <span className="text-[10px] font-medium bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/60">
                            ⏱️ {item.prepTime}
                          </span>
                        )}
                        {item.tags?.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[10px] font-medium bg-gray-100 group-hover:bg-white text-gray-700 px-2 py-0.5 rounded-md border border-gray-200/60"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="ml-auto text-[10px] font-bold text-cafe-gold tracking-wide uppercase group-hover:underline">
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

      {/* Minimal Footer */}
      <footer className="mt-20 pt-10 pb-20 border-t border-gray-200/60 max-w-2xl mx-auto text-center px-6">
        <Flame className="w-6 h-6 text-cafe-gold mx-auto mb-4 opacity-80" />
        <h4 className="font-serif text-2xl mb-2 text-gray-800 tracking-wide">Grazie!</h4>
        <p className="font-serif text-gray-500 leading-relaxed max-w-md mx-auto text-sm">
          Thank you for coming to the old city to find us. <br/>
          <span className="italic">Your order will be prepared fresh.</span>
        </p>
      </footer>

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
              className="w-full bg-[#1a1514] text-white py-3.5 px-6 rounded-full shadow-2xl flex items-center justify-between hover:bg-cafe-red transition-all border border-white/10 backdrop-blur-lg active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="bg-cafe-red text-white text-xs px-2.5 py-1 rounded-full font-bold">
                  {cartCount}
                </div>
                <span className="font-medium tracking-wide text-sm">View Running Bill</span>
              </div>
              <span className="font-bold font-serif text-base text-cafe-gold">
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
