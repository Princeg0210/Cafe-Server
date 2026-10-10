"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Coffee, Pizza, Wine, Utensils, CakeSlice, Sparkles, Radio } from "lucide-react";
import { menuData as initialMenuData, MenuCategory, MenuItem as DataMenuItem } from "@/data/menu";
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
  const [liveMenuData, setLiveMenuData] = useState<MenuCategory[]>(initialMenuData);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Base API resolution
  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      const isLocal =
        h === "localhost" ||
        h === "127.0.0.1" ||
        h.startsWith("192.168.") ||
        h.startsWith("10.") ||
        h.endsWith(".local");

      if (isLocal) {
        return `http://${h}:8000`;
      }
      return process.env.NEXT_PUBLIC_API_URL || "https://cafe-piza-api.onrender.com";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };

  // Sync live prices and stock availability from backend API
  const fetchLiveMenu = useCallback(async () => {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/menu/items`);
      if (!res.ok) return;
      const dbItems: Array<{
        id: number;
        category_id: number;
        name: string;
        description?: string;
        price: string | number;
        is_available: boolean;
        is_sold_out?: boolean;
      }> = await res.json();

      // Build mapping by normalized name or id
      const dbMapByName = new Map<string, typeof dbItems[0]>();
      dbItems.forEach((item) => {
        dbMapByName.set(item.name.trim().toLowerCase(), item);
      });

      // Merge into categories
      setLiveMenuData((prev) => {
        return prev.map((category) => {
          return {
            ...category,
            items: category.items.map((item) => {
              const matched = dbMapByName.get(item.name.trim().toLowerCase());
              if (matched) {
                return {
                  ...item,
                  price: Number(matched.price),
                  description: matched.description || item.description,
                  is_available: matched.is_available && !matched.is_sold_out,
                };
              }
              return item;
            }),
          };
        });
      });
    } catch {
      // Fallback silently to existing data
    }
  }, []);

  // Initial fetch and WebSocket listener for instant hand-to-hand updates
  useEffect(() => {
    fetchLiveMenu();

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      try {
        const apiBase = getApiBase();
        const wsProto = apiBase.startsWith("https") ? "wss" : "ws";
        const wsHost = apiBase.replace(/^https?:\/\//, "");
        ws = new WebSocket(`${wsProto}://${wsHost}/ws/menu`);

        ws.onopen = () => {
          setIsLiveConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "MENU_UPDATED") {
              fetchLiveMenu();
            }
          } catch { }
        };

        ws.onclose = () => {
          setIsLiveConnected(false);
          reconnectTimeout = setTimeout(connectWS, 4000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectWS, 6000);
      }
    };

    connectWS();

    // Background interval poll (every 10s) as guaranteed fallback
    const interval = setInterval(fetchLiveMenu, 10000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [fetchLiveMenu]);

  const filteredMenuData = useMemo(() => {
    return activeCategoryFilter === "all"
      ? liveMenuData
      : liveMenuData.filter((c) => c.id === activeCategoryFilter);
  }, [liveMenuData, activeCategoryFilter]);

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
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans relative selection:bg-[#9E3E26] selection:text-white">
      <Navbar />

      {/* Header Banner - Authentic Italian Trattoria with Logo */}
      <section className="bg-[#140E0A] text-[#FBF9F5] py-10 px-4 text-center border-b border-[#3A2A20] relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="w-40 h-24 sm:w-48 sm:h-28 mx-auto rounded-2xl overflow-hidden border-2 border-[#D8A168]/60 shadow-xl bg-white mb-2">
            <img
              src="/jaadoo_logo.jpg"
              alt="Jaadoo Pizza Project"
              className="w-full h-full object-cover"
            />
          </div>

          <span className="text-xs uppercase tracking-[0.35em] text-[#D8A168] font-serif font-semibold block">
            — ESTRATTO DAL MENU · LA CARTA —
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Jaadoo Pizza Project Menu
          </h1>
          <p className="text-stone-300 font-sans font-medium text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Wood-Fired Neapolitan Pizzas · 100% Vegetarian Pizzas · Mountain Arabica and Tisanes
          </p>

          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-400">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
          </div>
        </div>
      </section>

      {/* Editorial Category Navigation */}
      <div className="sticky top-16 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#DDD3C4] py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto flex items-center justify-center sm:justify-start gap-1.5 no-scrollbar">
          <button
            onClick={() => setActiveCategoryFilter("all")}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wider uppercase transition-all border cursor-pointer ${activeCategoryFilter === "all"
              ? "bg-[#140E0A] text-[#FAF8F5] border-[#140E0A] shadow-xs"
              : "bg-[#F2ECE1] border-[#DDD3C4] text-[#140E0A] hover:border-[#9E3E26] hover:bg-white"
              }`}
          >
            All Dishes
          </button>
          {liveMenuData.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryFilter(c.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-sans font-bold tracking-wider uppercase transition-all border cursor-pointer ${activeCategoryFilter === c.id
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
                  const isAvailable = (item as any).is_available !== false;

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.005 }}
                      transition={{ duration: 0.15 }}
                      className={`group relative flex items-start sm:items-center justify-between py-3.5 px-3 sm:px-4 rounded-xl transition-all duration-150 border border-transparent ${isAvailable
                        ? "hover:bg-[#F2ECE1]/90 hover:border-[#DDD3C4]"
                        : "opacity-65 bg-stone-100/50"
                        }`}
                    >
                      {/* Left: Round Dish Illustration / Photo Thumbnail */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-[#DDD3C4] shrink-0 bg-[#F0EAE0] flex items-center justify-center shadow-2xs mr-3 sm:mr-4 mt-0.5 sm:mt-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className={`w-full h-full object-cover transition-transform duration-300 ${isAvailable ? "group-hover:scale-108" : "grayscale"
                              }`}
                            loading="lazy"
                          />
                        ) : (
                          <Utensils className="w-4 h-4 text-[#9E3E26]" />
                        )}
                      </div>

                      {/* Middle: Tag Pill, Bold Uppercase Serif Title, Crisp Sans Description */}
                      <div className="flex-1 min-w-0 pr-3 sm:pr-4 flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {!isAvailable && (
                            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full inline-block border border-rose-300">
                              Sold Out Today
                            </span>
                          )}
                          {(item.badge || item.tags?.[0]) && (
                            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#140E0A] bg-[#E5DEC3] px-2.5 py-0.5 rounded-full inline-block border border-[#CCC2A5]">
                              {item.badge || item.tags?.[0]}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-sm sm:text-base font-serif font-bold uppercase tracking-wide leading-snug break-words whitespace-normal transition-colors ${isAvailable
                            ? "text-[#140E0A] group-hover:text-[#9E3E26]"
                            : "text-stone-500 line-through"
                            }`}
                        >
                          {item.name}
                        </h3>

                        {item.description && (
                          <p className="text-xs sm:text-sm font-sans font-normal text-[#2B1D14] mt-1 leading-relaxed break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Bold Price */}
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <span
                          className={`text-base sm:text-lg font-sans font-extrabold ${isAvailable ? "text-[#140E0A]" : "text-stone-400"
                            }`}
                        >
                          ₹{item.price}
                        </span>
                        {!isAvailable && (
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                            Unavailable
                          </span>
                        )}
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
