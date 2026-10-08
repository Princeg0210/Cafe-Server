"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Pizza, Wine, Utensils, CakeSlice } from "lucide-react";
import { menuData } from "@/data/menu";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";

const categoryIcons: Record<string, React.ReactNode> = {
  starters: <Utensils className="w-4 h-4 text-[#9E3E26]" />,
  primo: <Utensils className="w-4 h-4 text-[#9E3E26]" />,
  pizza: <Pizza className="w-4 h-4 text-[#9E3E26]" />,
  cakes: <CakeSlice className="w-4 h-4 text-[#9E3E26]" />,
  beverages: <Wine className="w-4 h-4 text-[#9E3E26]" />,
  "hot-drinks": <Coffee className="w-4 h-4 text-[#9E3E26]" />,
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

      {/* Header Banner - Authentic Italian Trattoria (Anti-AI Typographic Design) */}
      <section className="bg-[#140E0A] text-[#FBF9F5] py-10 px-4 text-center border-b border-[#3A2A20]">
        <div className="max-w-4xl mx-auto">
          <span className="text-xs uppercase tracking-[0.35em] text-[#D8A168] font-serif font-semibold block mb-2">
            — ESTRATTO DAL MENU · LA CARTA —
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Jaadoo Trattoria Menu
          </h1>
          <p className="text-stone-300 font-sans font-medium text-xs sm:text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            Wood-Fired Neapolitan Pizzas · 48h Natural Fermentation · Mountain Arabica & Tisanes
          </p>
        </div>
      </section>

      {/* Editorial Category Navigation (Clean Tabs, Not Generic AI Pills) */}
      <div className="sticky top-16 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#DDD3C4] py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto flex items-center justify-center sm:justify-start gap-1.5 no-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("all")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wider uppercase transition-all border ${
              activeCategoryFilter === "all"
                ? "bg-[#140E0A] text-[#FAF8F5] border-[#140E0A] shadow-xs"
                : "bg-[#F2ECE1] border-[#DDD3C4] text-[#140E0A] hover:border-[#9E3E26] hover:bg-white"
            }`}
          >
            All Dishes
          </button>
          {menuData.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryFilter(c.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wider uppercase transition-all border ${
                activeCategoryFilter === c.id
                  ? "bg-[#140E0A] text-[#FAF8F5] border-[#140E0A] shadow-xs"
                  : "bg-[#F2ECE1] border-[#DDD3C4] text-[#140E0A] hover:border-[#9E3E26] hover:bg-white"
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
          className="space-y-12"
        >
          {filteredMenuData.map((category) => (
            <motion.section id={category.id} key={category.id} variants={itemAnim} className="relative">
              
              {/* Category Header */}
              <div className="flex flex-col items-center justify-center text-center mb-3">
                <div className="flex items-center justify-center flex-wrap gap-2 text-center">
                  <div className="w-8 h-8 rounded-full border border-[#DDD3C4] bg-[#FAF7F2] flex items-center justify-center text-[#9E3E26] shrink-0 shadow-2xs">
                    {categoryIcons[category.id] || <Utensils className="w-4 h-4 text-[#9E3E26]" />}
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl font-serif font-bold text-[#140E0A] uppercase tracking-wider">
                    {category.name}
                  </h2>
                  {category.subtitle && (
                    <>
                      <span className="text-[#9E3E26] font-serif font-bold">•</span>
                      <span className="text-xs sm:text-sm font-sans font-semibold text-[#9E3E26]">
                        {category.subtitle}
                      </span>
                    </>
                  )}
                </div>
                <div className="w-full h-[1.5px] bg-[#DDD3C4] mt-3.5 mb-1" />
              </div>

              {/* Menu Item Strips */}
              <div className="divide-y divide-[#E6DDD0]">
                {category.items.map((item) => {
                  return (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className="group relative flex items-start sm:items-center justify-between py-3.5 px-3 sm:px-4 rounded-xl transition-all duration-150 hover:bg-[#F2ECE1]/90 border border-transparent hover:border-[#DDD3C4]"
                    >
                      {/* Left: Round Dish Illustration / Photo Thumbnail */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-[#DDD3C4] shrink-0 bg-[#F0EAE0] flex items-center justify-center shadow-2xs mr-3 sm:mr-4 mt-0.5 sm:mt-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <Utensils className="w-4 h-4 text-[#9E3E26]" />
                        )}
                      </div>

                      {/* Middle: Tag Pill, Bold Uppercase Serif Title, Crisp Sans Description */}
                      <div className="flex-1 min-w-0 pr-3 sm:pr-4 flex flex-col justify-center">
                        {(item.badge || item.tags?.[0]) && (
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#140E0A] bg-[#E5DEC3] px-2.5 py-0.5 rounded-full inline-block w-fit mb-1 border border-[#CCC2A5]">
                            {item.badge || item.tags?.[0]}
                          </span>
                        )}

                        <h3 className="text-sm sm:text-base font-serif font-bold text-[#140E0A] uppercase tracking-wide leading-snug break-words whitespace-normal group-hover:text-[#9E3E26] transition-colors">
                          {item.name}
                        </h3>
                        
                        {item.description && (
                          <p className="text-xs sm:text-sm font-sans font-normal text-[#2B1D14] mt-1 leading-relaxed break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Bold Price Only */}
                      <div className="flex items-center shrink-0 pl-2">
                        <span className="text-base sm:text-lg font-sans font-extrabold text-[#140E0A]">
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
