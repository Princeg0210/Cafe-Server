"use client";

import React, { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  UtensilsCrossed,
  Receipt,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  ChevronRight,
  RefreshCw,
  Flame,
  Coffee,
} from "lucide-react";
import PizzaSliceZoomIntro from "@/components/PizzaSliceZoomIntro";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";

interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  is_sold_out: boolean;
  category_name: string;
  badge?: string;
  image_url: string;
}

const DEMO_MENU_ITEMS: MenuItem[] = [
  {
    id: 101,
    category_id: 1,
    category_name: "Wood-Fired Pizzas",
    name: "Jaadoo Truffle & Wild Mushroom",
    description: "Black truffle cream base, roasted portobello, fresh fior di latte, aged parmesan, fresh thyme.",
    price: 590,
    is_available: true,
    is_sold_out: false,
    badge: "Chef's Signature",
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 102,
    category_id: 1,
    category_name: "Wood-Fired Pizzas",
    name: "Burrata & Sundried Tomato Pesto",
    description: "San Marzano tomatoes, whole creamy burrata ball, basil pesto swirl, toasted pine nuts.",
    price: 640,
    is_available: true,
    is_sold_out: false,
    badge: "Wood-Fired Best",
    image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 103,
    category_id: 1,
    category_name: "Wood-Fired Pizzas",
    name: "Smoked Scamorza & Pepperoni",
    description: "Artisanal spicy salami, smoked scamorza cheese, hot honey drizzle, fresh oregano.",
    price: 620,
    is_available: true,
    is_sold_out: false,
    badge: "Hot Honey Special",
    image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 104,
    category_id: 2,
    category_name: "Specialty Beverages",
    name: "Kerala Spiced Cappuccino",
    description: "Single-origin Wayanad espresso, steamed whole milk infused with green cardamom, cinnamon & star anise.",
    price: 240,
    is_available: true,
    is_sold_out: false,
    badge: "Tan Coffee Style",
    image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 105,
    category_id: 2,
    category_name: "Specialty Beverages",
    name: "Jaadoo Rhododendron Mint Tisane",
    description: "Hand-plucked High Himalayan Rhododendron petals, fresh garden mint, raw forest honey.",
    price: 210,
    is_available: true,
    is_sold_out: false,
    badge: "Himalayan Herbal",
    image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 106,
    category_id: 2,
    category_name: "Specialty Beverages",
    name: "Artisanal Tiramisu Cold Brew Latte",
    description: "24-hour steep cold brew, mascarpone cream foam, cocoa powder dust & ladyfinger biscuit crumble.",
    price: 280,
    is_available: true,
    is_sold_out: false,
    badge: "Cold Coffee Classic",
    image_url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80",
  },
];

export default function TableQRPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token || "tbl-04";
  const tableNum = token.replace(/[^0-9]/g, "") || "04";

  const [showSplash, setShowSplash] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<{ [key: number]: { item: MenuItem; qty: number } }>({});
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState("");

  const categories = ["All", "Wood-Fired Pizzas", "Specialty Beverages"];

  const filteredItems = DEMO_MENU_ITEMS.filter(
    (item) => selectedCategory === "All" || item.category_name === selectedCategory
  );

  const updateCart = (item: MenuItem, change: number) => {
    setCart((prev) => {
      const current = prev[item.id]?.qty || 0;
      const newQty = current + change;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: { item, qty: newQty } };
    });
  };

  const totalCartCount = Object.values(cart).reduce((acc, c) => acc + c.qty, 0);
  const totalCartPrice = Object.values(cart).reduce((acc, c) => acc + c.item.price * c.qty, 0);

  const handleSendOrderToKitchen = () => {
    if (totalCartCount === 0) return;
    const mockOrderNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    setLastOrderNum(mockOrderNum);
    setOrderPlaced(true);
    setCart({});
    setShowCartDrawer(false);
  };

  return (
    <div className="min-h-screen bg-[#180e0a] text-stone-100 font-sans selection:bg-amber-500/30">
      {/* 4-Slice Pizza Zoom Intro Splash Animation */}
      {showSplash && (
        <PizzaSliceZoomIntro
          cafeName={`JAADOO • TABLE #${tableNum}`}
          subtitle="UDAIPUR • ARTISANAL WOOD-FIRED NEAPOLITAN PIZZERIA"
          autoPlay={true}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Main Page Navbar */}
      <Navbar />

      {/* Table Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-[#2a170f] to-stone-900 border-b border-amber-900/40 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif font-bold text-xl shadow-lg">
              #{tableNum}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-amber-100">
                  TABLE #{tableNum} • DINING SESSION ACTIVE
                </h1>
              </div>
              <p className="text-xs text-amber-200/70 tracking-wider uppercase font-mono mt-0.5">
                Jaadoo Udaipur • Old City • Instant Kitchen Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSplash(true)}
              className="px-4 py-2 rounded-full bg-stone-800/80 hover:bg-stone-700 border border-stone-600/50 text-stone-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              Replay Intro Zoom
            </button>

            <button
              onClick={() => setShowBillModal(true)}
              className="px-5 py-2.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>VIEW RUNNING BILL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {/* Order Success Toast */}
        {orderPlaced && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-stone-900 border border-emerald-500/40 text-emerald-200 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-lg text-emerald-100 uppercase tracking-wide">
                  ORDER DISPATCHED TO KITCHEN! (#{lastOrderNum})
                </h3>
                <p className="text-sm text-emerald-300/80 mt-1">
                  Items have been transactionally split between **Kitchen 1 (Hot Food)** and **Kitchen 2 (Bar/Beverages)**.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOrderPlaced(false)}
              className="px-4 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider transition"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-[0_0_20px_rgba(200,138,72,0.4)]"
                  : "bg-stone-900/80 hover:bg-stone-800 text-stone-400 border border-stone-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const qtyInCart = cart[item.id]?.qty || 0;
            return (
              <motion.div
                key={item.id}
                layout
                className="group relative rounded-2xl bg-gradient-to-b from-stone-900 to-[#1e130d] border border-amber-900/30 overflow-hidden shadow-xl hover:border-amber-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Item Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-stone-950">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    />
                    {item.badge && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] uppercase tracking-wider shadow-lg">
                        {item.badge}
                      </span>
                    )}
                    {item.is_sold_out && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                        <span className="px-4 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-widest shadow-xl">
                          PIZZA SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-lg text-amber-100 group-hover:text-amber-400 transition-colors uppercase">
                        {item.name}
                      </h3>
                      <span className="font-mono font-extrabold text-amber-400 text-lg">
                        ₹{item.price}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Add to Cart Actions */}
                <div className="p-5 pt-0">
                  {qtyInCart === 0 ? (
                    <button
                      disabled={item.is_sold_out}
                      onClick={() => updateCart(item, 1)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                        item.is_sold_out
                          ? "bg-stone-800 text-stone-600 cursor-not-allowed"
                          : "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border border-amber-500/40"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>ADD TO ORDER</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-amber-500/20 border border-amber-500/50 rounded-xl p-1">
                      <button
                        onClick={() => updateCart(item, -1)}
                        className="p-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-sm text-amber-100 px-4 font-mono">
                        {qtyInCart}
                      </span>
                      <button
                        onClick={() => updateCart(item, 1)}
                        className="p-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Bar (ORDER MENU Trigger) */}
      {totalCartCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-4 right-4 z-40 max-w-xl mx-auto"
        >
          <button
            onClick={() => setShowCartDrawer(true)}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold text-sm uppercase tracking-wider shadow-[0_10px_40px_rgba(200,138,72,0.5)] flex items-center justify-between transition-transform transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-stone-950 text-amber-400 flex items-center justify-center font-mono font-extrabold text-xs">
                {totalCartCount}
              </span>
              <span>REVIEW & SEND TO KITCHEN</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-extrabold">₹{totalCartPrice}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </motion.div>
      )}

      {/* Cart Review Drawer */}
      <AnimatePresence>
        {showCartDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCartDrawer(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-stone-900 border-l border-amber-900/40 h-full p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                    <h2 className="font-bold text-lg text-amber-100 uppercase">
                      TABLE #{tableNum} ORDER DISPATCH
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowCartDrawer(false)}
                    className="p-2 rounded-full hover:bg-stone-800 text-stone-400 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items List */}
                <div className="py-6 space-y-4">
                  {Object.values(cart).map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-stone-200">{item.name}</h4>
                        <span className="text-xs text-amber-400 font-mono">
                          ₹{item.price} × {qty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-lg p-1">
                        <button
                          onClick={() => updateCart(item, -1)}
                          className="p-1 hover:bg-stone-800 text-stone-300 rounded"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-xs text-amber-200 px-2">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateCart(item, 1)}
                          className="p-1 hover:bg-stone-800 text-stone-300 rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-stone-800 pt-4 space-y-4">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-400 uppercase text-xs tracking-wider">Subtotal</span>
                  <span className="text-amber-400 font-mono text-lg">₹{totalCartPrice}</span>
                </div>

                <button
                  onClick={handleSendOrderToKitchen}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold text-sm uppercase tracking-wider shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>CONFIRM & DISPATCH TO KITCHEN</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Running Bill Modal */}
      <AnimatePresence>
        {showBillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBillModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-stone-900 border border-amber-900/50 p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-lg text-amber-100 uppercase">
                    RUNNING BILL • TABLE #{tableNum}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="p-2 rounded-full hover:bg-stone-800 text-stone-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-6 space-y-3 font-mono text-xs text-stone-300">
                <div className="flex justify-between border-b border-stone-800/60 pb-2">
                  <span>Session Status:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{totalCartPrice || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (5%):</span>
                  <span>₹{((totalCartPrice || 0) * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-400 font-bold text-sm pt-2 border-t border-stone-800">
                  <span>TOTAL ESTIMATE:</span>
                  <span>₹{((totalCartPrice || 0) * 1.05).toFixed(2)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/80 text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Final payment settlement is processed at the POS counter via Cash, Card, or UPI upon dining session completion.
                </p>
              </div>

              <button
                onClick={() => setShowBillModal(false)}
                className="w-full mt-6 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs uppercase tracking-wider transition"
              >
                Close Bill View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TanFooter />
    </div>
  );
}
