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

      {/* Header Banner - Compact */}
      <section className="bg-[#261C18] text-[#FBF9F5] py-7 px-4 text-center border-b border-[#E4DCD0]/20">
        <div className="max-w-4xl mx-auto">
          <span className="text-[10px] font-sans font-semibold tracking-[0.2em] text-[#4A5842] uppercase bg-[#4A5842]/20 px-3 py-1 rounded-full border border-[#4A5842]/30">
            LA CARTA • ARTISANAL MENU
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold mt-2 text-[#FBF9F5]">
            Jaadoo Trattoria Menu
          </h1>
          <p className="text-[11px] sm:text-xs font-serif italic text-stone-300 mt-1 max-w-xl mx-auto">
            Wood-fired Neapolitan Pizzas • 48h Natural Fermentation • Mountain Arabica & Tisanes
          </p>
        </div>
      </section>

      {/* Sticky Category Navigation Pills */}
      <div className="sticky top-16 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] py-2.5 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto flex items-center justify-center sm:justify-start gap-1.5 no-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("all")}
            className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-sans font-semibold tracking-wider uppercase transition-all ${
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
              className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-sans font-semibold tracking-wider uppercase transition-all ${
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

      {/* Main Menu Container - Sleek Horizontal Strip List Matching Reference Screenshot */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 my-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-10"
        >
          {filteredMenuData.map((category) => (
            <motion.section id={category.id} key={category.id} variants={itemAnim} className="relative">
              
              {/* Category Header - Centered with Circular Badge, Serif Title & Italic Subtitle */}
              <div className="flex flex-col items-center justify-center text-center mb-2">
                <div className="flex items-center justify-center flex-wrap gap-2 text-center">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#E4DCD0] bg-[#FBF9F5] flex items-center justify-center text-[#B85B43] shrink-0 shadow-2xs">
                    {categoryIcons[category.id] || <Utensils className="w-3.5 h-3.5 text-[#B85B43]" />}
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg font-serif font-bold text-[#261C18] uppercase tracking-wider">
                    {category.name}
                  </h2>
                  {category.subtitle && (
                    <>
                      <span className="text-[#B85B43] font-serif">•</span>
                      <span className="text-xs sm:text-sm font-serif italic text-[#B85B43]">
                        {category.subtitle}
                      </span>
                    </>
                  )}
                </div>
                {/* Thin horizontal separator line below category header */}
                <div className="w-full h-px bg-[#EADFCF] mt-3 mb-1" />
              </div>

              {/* Menu Item Strips - Compact Horizontal Rows */}
              <div className="divide-y divide-[#EFE8DC]/80">
                {category.items.map((item) => {
                  const inCartItem = cartItems.find((i) => i.id === item.id);
                  const qty = inCartItem?.quantity || 0;

                  return (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className={`group relative flex items-start sm:items-center justify-between py-3 px-2 sm:px-4 rounded-xl transition-all duration-150 cursor-pointer ${
                        qty > 0 
                          ? "bg-[#F7F3EB] border border-[#E5DAC8] shadow-2xs" 
                          : "hover:bg-[#F7F3EB]/80 border border-transparent hover:border-[#E5DAC8]"
                      }`}
                      onClick={() => addToCart(item)}
                    >
                      {/* Left: Round Dish Illustration / Photo Thumbnail */}
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#E4DCD0] shrink-0 bg-[#F6F3EC] flex items-center justify-center shadow-2xs mr-3 sm:mr-4 mt-0.5 sm:mt-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <Utensils className="w-4 h-4 text-[#B85B43]" />
                        )}
                      </div>

                      {/* Middle: Tag Pill, Bold Uppercase Serif Title, Italic Description */}
                      <div className="flex-1 min-w-0 pr-3 sm:pr-4 flex flex-col justify-center">
                        {/* Tag Badge Pill */}
                        {(item.badge || item.tags?.[0]) && (
                          <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-stone-600 bg-[#EFECE4] px-2 py-0.5 rounded-full inline-block w-fit mb-0.5">
                            {item.badge || item.tags?.[0]}
                          </span>
                        )}

                        {/* Dish Title */}
                        <h3 className="text-xs sm:text-sm font-serif font-bold text-[#261C18] uppercase tracking-wide leading-snug break-words whitespace-normal group-hover:text-[#B85B43] transition-colors">
                          {item.name}
                        </h3>
                        
                        {/* Italic Description */}
                        {item.description && (
                          <p className="text-[11px] sm:text-xs font-serif italic text-stone-500 mt-0.5 leading-relaxed break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Bold Price + Dark ADD Pill Button */}
                      <div className="flex flex-col items-end shrink-0 pl-2 pt-0.5 sm:pt-0">
                        <span className="text-xs sm:text-sm font-serif font-bold text-[#261C18] text-right mb-1">
                          ₹{item.price}
                        </span>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className={`px-5 sm:px-6 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-1 ${
                            qty > 0 
                              ? "bg-[#B85B43] text-[#FBF9F5]" 
                              : "bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5]"
                          }`}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          {qty > 0 ? `ADDED (${qty})` : "ADD"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
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
