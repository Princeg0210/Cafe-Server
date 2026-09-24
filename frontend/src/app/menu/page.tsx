"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Pizza, Wine, Utensils } from "lucide-react";
import { menuData } from "@/data/menu";
import Navbar from "@/components/Navbar";
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
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("all");

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
      <Navbar />

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

      {/* Main Menu Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 my-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-10"
        >
          {filteredMenuData.map((category) => (
            <motion.section id={category.id} key={category.id} variants={itemAnim} className="relative">
              
              {/* Category Header */}
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
                <div className="w-full h-px bg-[#EADFCF] mt-3 mb-1" />
              </div>

              {/* Menu Item Strips */}
              <div className="divide-y divide-[#EFE8DC]/80">
                {category.items.map((item) => {
                  return (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className="group relative flex items-start sm:items-center justify-between py-3 px-2 sm:px-4 rounded-xl transition-all duration-150 hover:bg-[#F7F3EB]/80 border border-transparent hover:border-[#E5DAC8]"
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
                        {(item.badge || item.tags?.[0]) && (
                          <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-stone-600 bg-[#EFECE4] px-2 py-0.5 rounded-full inline-block w-fit mb-0.5">
                            {item.badge || item.tags?.[0]}
                          </span>
                        )}

                        <h3 className="text-xs sm:text-sm font-serif font-bold text-[#261C18] uppercase tracking-wide leading-snug break-words whitespace-normal group-hover:text-[#B85B43] transition-colors">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-[11px] sm:text-xs font-serif italic text-stone-500 mt-0.5 leading-relaxed break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Bold Price Only */}
                      <div className="flex items-center shrink-0 pl-2">
                        <span className="text-sm sm:text-base font-serif font-bold text-[#261C18]">
                          ₹{item.price}
                        </span>
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
    </div>
  );
}
