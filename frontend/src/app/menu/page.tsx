"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Pizza, Wine, Utensils, Info, Plus } from "lucide-react";
import { menuData, MenuItem } from "@/data/menu";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import TanFooter from "@/components/TanFooter";

const categoryIcons: Record<string, React.ReactNode> = {
  starters: <Utensils className="w-4 h-4 text-[#B85B43]" />,
  primo: <Utensils className="w-4 h-4 text-[#B85B43]" />,
  pizza: <Pizza className="w-4 h-4 text-[#B85B43]" />,
  cakes: <Coffee className="w-4 h-4 text-[#B85B43]" />,
  beverages: <Wine className="w-4 h-4 text-[#B85B43]" />,
  "hot-drinks": <Coffee className="w-4 h-4 text-[#B85B43]" />,
};

export default function MenuPage() {
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
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemAnim = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans relative">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      {/* Header Banner */}
      <section className="bg-[#261C18] text-[#FBF9F5] py-14 px-6 text-center border-b border-[#E4DCD0]/20">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs font-sans font-semibold tracking-[0.25em] text-[#4A5842] uppercase bg-[#4A5842]/20 px-4 py-1.5 rounded-full border border-[#4A5842]/30">
            LA CARTA • ARTISANAL MENU
          </span>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold mt-4 text-[#FBF9F5]">
            Jaadoo Trattoria Menu
          </h1>
          <p className="text-xs sm:text-sm font-serif italic text-stone-300 mt-2 max-w-xl mx-auto">
            Wood-fired Neapolitan Pizzas • 48h Natural Fermentation • Mountain Arabica & Tisanes
          </p>
        </div>
      </section>

      {/* Sticky Category Navigation Pills */}
      <div className="sticky top-16 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] py-3 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("all")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-sans font-medium tracking-wider uppercase transition-all ${
              activeCategoryFilter === "all"
                ? "bg-[#261C18] text-[#FBF9F5] shadow-xs"
                : "bg-[#F6F3EC] border border-[#E4DCD0] text-stone-700 hover:border-[#B85B43]"
            }`}
          >
            All Dishes
          </button>
          {menuData.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryFilter(c.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-sans font-medium tracking-wider uppercase transition-all ${
                activeCategoryFilter === c.id
                  ? "bg-[#261C18] text-[#FBF9F5] shadow-xs"
                  : "bg-[#F6F3EC] border border-[#E4DCD0] text-stone-700 hover:border-[#B85B43]"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Menu Cards Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 my-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {filteredMenuData.map((category) => (
            <motion.section id={category.id} key={category.id} variants={itemAnim} className="relative pt-4">
              
              {/* Category Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-1 mb-6 border-b border-[#E4DCD0] pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-[#F6F3EC] p-2 rounded-full border border-[#E4DCD0]">
                    {categoryIcons[category.id] || <Utensils className="w-4 h-4 text-[#B85B43]" />}
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#261C18]">
                      {category.name}
                    </h3>
                    {category.subtitle && (
                      <p className="text-xs font-serif italic text-[#B85B43]">
                        {category.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {category.id === "pizza" && (
                <div className="mb-6 bg-[#F6F3EC] border border-[#E4DCD0] rounded-2xl p-4 flex gap-3 items-center">
                  <Info className="w-4 h-4 text-[#B85B43] flex-shrink-0" />
                  <p className="text-xs text-stone-700 font-sans">
                    All our pizzas are wood-fired using Italian Tipo 00 flour with 48-hour natural dough fermentation. 100% vegetarian.
                  </p>
                </div>
              )}

              {/* Menu Item Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {category.items.map((item) => (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.015, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="group bg-[#FBF9F5] rounded-2xl p-5 border border-[#E4DCD0] shadow-xs hover:shadow-md hover:border-[#B85B43]/60 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden z-0 hover:z-20"
                    onClick={() => addToCart(item)}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#B85B43] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 pr-2">
                        <h4 className="text-lg md:text-xl font-serif font-bold text-[#261C18] leading-tight group-hover:text-[#B85B43] transition-colors">
                          {item.name}
                        </h4>
                        
                        {item.description && (
                          <p className="text-xs text-stone-600 font-sans italic mt-1 leading-snug">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-base font-serif font-bold text-[#261C18] bg-[#F6F3EC] group-hover:bg-[#B85B43]/10 group-hover:text-[#B85B43] px-3 py-1 rounded-xl border border-[#E4DCD0] transition-colors">
                          ₹{item.price}
                        </span>
                        <button 
                          className="w-7 h-7 rounded-full bg-[#261C18] text-[#FBF9F5] flex items-center justify-center group-hover:bg-[#B85B43] group-hover:scale-105 shadow-xs transition-all"
                          aria-label="Add to cart"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#FBF9F5]" />
                        </button>
                      </div>
                    </div>

                    {/* Expand Details on Hover */}
                    <div className="max-h-0 opacity-0 group-hover:max-h-36 group-hover:opacity-100 group-hover:mt-3 transition-all duration-300 ease-out overflow-hidden border-t border-transparent group-hover:border-[#E4DCD0] group-hover:pt-2.5">
                      {item.details && (
                        <p className="text-xs text-stone-600 leading-relaxed font-sans mb-2">
                          ✦ {item.details}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {item.prepTime && (
                          <span className="text-[10px] font-medium uppercase bg-[#4A5842]/10 text-[#4A5842] px-2 py-0.5 rounded border border-[#4A5842]/20 font-sans">
                            ⏱ {item.prepTime}
                          </span>
                        )}
                        {item.tags?.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[10px] font-medium uppercase bg-[#F6F3EC] text-stone-700 px-2 py-0.5 rounded border border-[#E4DCD0] font-sans"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="ml-auto text-[10px] font-sans font-semibold text-[#B85B43] uppercase group-hover:underline">
                          + Add to Bill
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

      <TanFooter />

      {/* Floating Action Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-40"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#261C18] text-[#FBF9F5] py-3.5 px-6 rounded-full shadow-2xl flex items-center justify-between hover:bg-[#B85B43] transition-all border border-[#E4DCD0]/20 backdrop-blur-lg active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[#B85B43] text-[#FBF9F5] text-xs px-2.5 py-0.5 rounded-full font-bold font-sans">
                  {cartCount}
                </div>
                <span className="font-sans font-semibold uppercase tracking-wider text-xs">View Running Bill</span>
              </div>
              <span className="font-serif font-bold text-lg tracking-wide text-[#FBF9F5]">
                ₹{cartTotal}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
