"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, Flame, Leaf, UtensilsCrossed, Wine } from "lucide-react";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";
import { MENU_ITEM_ID_MAP, MenuCategory, MenuItem, menuData as initialMenuData } from "@/data/menu";

const categoryLabels: Record<string, string> = {
  all: "All dishes",
  starters: "Starters",
  primo: "Primo",
  pizza: "Pizza",
  cakes: "Cakes",
  beverages: "Beverages",
  "hot-drinks": "Hot drinks",
};

function MenuPrice({ price }: { price: number }) {
  return <span className="shrink-0 font-sans text-base font-bold text-[#9E3E26]">₹{price}</span>;
}

function FoodRow({ item }: { item: MenuItem & { is_available?: boolean } }) {
  const available = item.is_available !== false;
  return (
    <article className={`grid grid-cols-[76px_1fr_auto] gap-3 border-b border-[#D9C9AE] py-4 sm:grid-cols-[96px_1fr_auto] sm:gap-5 ${available ? "" : "opacity-50"}`}>
      <div className="relative aspect-square overflow-hidden rounded-full border border-[#CDBB9C] bg-[#EFE5D3]">
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill sizes="(max-width: 640px) 76px, 96px" className="object-cover" />
        ) : (
          <UtensilsCrossed className="absolute inset-0 m-auto h-5 w-5 text-[#9E3E26]" />
        )}
      </div>
      <div className="min-w-0 self-center">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-serif text-base font-bold leading-tight text-[#17251A] sm:text-lg">{item.name}</h3>
          {!available && <span className="rounded-full bg-[#9E3E26] px-2 py-0.5 text-[10px] font-bold text-white">Sold out</span>}
        </div>
        {item.description && <p className="mt-1 max-w-xl text-sm italic leading-relaxed text-[#5B4A3E]">({item.description})</p>}
      </div>
      <div className="self-center pl-1"><MenuPrice price={item.price} /></div>
    </article>
  );
}

function DrinkCard({ item }: { item: MenuItem & { is_available?: boolean } }) {
  return (
    <article className={`min-w-0 border-b border-[#D9C9AE] py-3 ${item.is_available === false ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-[13px] font-bold leading-snug text-[#17251A] sm:text-base">{item.name}</h3>
        <MenuPrice price={item.price} />
      </div>
      {item.description && <p className="mt-1 text-xs italic leading-relaxed text-[#5B4A3E]">({item.description})</p>}
    </article>
  );
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [menuData, setMenuData] = useState<MenuCategory[]>(initialMenuData);

  const fetchLiveMenu = useCallback(async () => {
    try {
      const apiBase = "";
      const response = await fetch(`${apiBase}/api/v1/menu/items`);
      if (!response.ok) return;
      const liveItems: Array<{ id: number; price: string | number; is_available: boolean; is_sold_out?: boolean }> = await response.json();
      const liveById = new Map(liveItems.map((item) => [item.id, item]));
      setMenuData(initialMenuData.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          const live = liveById.get(MENU_ITEM_ID_MAP[item.id]);
          return live ? { ...item, price: Number(live.price), is_available: live.is_available && !live.is_sold_out } : item;
        }),
      })));
    } catch {
      // The printed menu remains available when live inventory is offline.
    }
  }, []);

  useEffect(() => {
    fetchLiveMenu();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchLiveMenu();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchLiveMenu]);

  const visibleCategories = useMemo(
    () => activeCategory === "all" ? menuData : menuData.filter((category) => category.id === activeCategory),
    [activeCategory, menuData],
  );

  return (
    <div className="min-h-screen bg-[#F7EBD5] text-[#17251A] selection:bg-[#9E3E26] selection:text-white">
      <Navbar showNavigation={false} />

      <header className="grid min-h-[430px] bg-[#1B120E] text-[#FFF8EA] lg:grid-cols-[42%_58%]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-[max(3rem,calc((100vw-1200px)/2))] lg:pr-10">
          <div className="flex items-center gap-3 text-[#D59A5C]"><span className="h-px w-10 bg-current" /><span className="text-xs font-semibold tracking-[0.22em]">WOOD-FIRED · UDAIPUR</span></div>
          <h1 className="mt-5 font-serif text-5xl font-bold leading-none sm:text-7xl">Our Menu</h1>
          <p className="mt-3 font-serif text-2xl italic text-[#D59A5C]">Italian kitchen magic.</p>
          <p className="mt-6 max-w-md text-sm leading-7 text-[#E7D9C7]">Vegetarian Neapolitan pizzas, handmade starters, cakes and mountain tisanes from our Old City kitchen.</p>
        </div>
        <div className="relative min-h-[320px] lg:min-h-full">
          <Image src="/pizza-sophia-loren.webp" alt="Sophia Loren wood-fired pizza" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B120E]/40 to-transparent lg:from-[#1B120E]/70" />
        </div>
      </header>

      <nav aria-label="Menu categories" className="sticky top-16 z-30 border-b border-[#D7C4A3] bg-[#F7EBD5]/95 py-3 backdrop-blur-md">
        <div className="no-scrollbar mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 sm:px-6">
          {["all", ...menuData.map((category) => category.id)].map((id) => (
            <button key={id} type="button" onClick={() => setActiveCategory(id)} aria-pressed={activeCategory === id} className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors ${activeCategory === id ? "border-[#9E3E26] text-[#9E3E26]" : "border-transparent text-[#49382D] hover:border-[#BFA47A]"}`}>
              {categoryLabels[id]}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-x-12 gap-y-14 lg:grid-cols-2">
          {visibleCategories.map((category) => {
            const isDrinks = category.id === "beverages" || category.id === "hot-drinks";
            return (
              <section key={category.id} id={category.id} className={category.id === "pizza" ? "lg:col-span-2" : ""}>
                <div className="flex items-end justify-between gap-4 border-b-2 border-[#17251A] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-[#9E3E26] text-[#9E3E26]">{category.id === "pizza" ? <Flame className="h-5 w-5" /> : category.id === "beverages" ? <Wine className="h-5 w-5" /> : category.id === "hot-drinks" ? <Coffee className="h-5 w-5" /> : <Leaf className="h-5 w-5" />}</span>
                    <div><h2 className="font-serif text-2xl font-bold sm:text-3xl">{category.name}</h2></div>
                  </div>
                </div>
                <div className={isDrinks ? "grid grid-cols-2 gap-x-5 sm:gap-x-8" : category.id === "pizza" ? "grid gap-x-10 md:grid-cols-2" : ""}>
                  {category.items.map((item) => isDrinks ? <DrinkCard key={item.id} item={item} /> : <FoodRow key={item.id} item={item} />)}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <aside className="border-y border-[#D7C4A3] bg-[#17251A] px-5 py-8 text-center text-[#FFF8EA]"><p className="font-serif text-xl italic">All Jaadoo pizzas are vegetarian.</p><p className="mt-2 text-sm text-[#D8C9B7]">Ask the team about daily specials or customise your own pizza.</p></aside>
      <TanFooter />
    </div>
  );
}
