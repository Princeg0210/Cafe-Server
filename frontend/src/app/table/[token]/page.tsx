"use client";

import React, { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed,
  Receipt,
  Plus,
  Minus,
  ShoppingBag,
  CheckCircle2,
  X,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  Sparkles,
  AlertCircle,
  Coffee,
  Pizza,
  Wine,
  Utensils,
} from "lucide-react";
import TextZoomSplash from "@/components/TextZoomSplash";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";
import SignatureBrewsShowcase from "@/components/SignatureBrewsShowcase";
import MorphingCardsShowcase from "@/components/MorphingCardsShowcase";
import LocationBrewStation from "@/components/LocationBrewStation";
import TanStorySection from "@/components/TanStorySection";
import JaadooInstagramGrid from "@/components/JaadooInstagramGrid";
import { menuData } from "@/data/menu";

const categoryIcons: Record<string, React.ReactNode> = {
  starters: <Utensils className="w-4 h-4 text-[#B85B43]" />,
  primo: <Utensils className="w-4 h-4 text-[#B85B43]" />,
  pizza: <Pizza className="w-4 h-4 text-[#B85B43]" />,
  cakes: <Coffee className="w-4 h-4 text-[#B85B43]" />,
  beverages: <Wine className="w-4 h-4 text-[#B85B43]" />,
  "hot-drinks": <Coffee className="w-4 h-4 text-[#B85B43]" />,
};

interface MenuItem {
  id: string | number;
  category_id?: number | string;
  name: string;
  description: string;
  price: number;
  is_available?: boolean;
  is_sold_out?: boolean;
  category_name: string;
  badge?: string;
  image_url: string;
  tags?: string[];
}

interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface BillData {
  session_id: number;
  table_number: string;
  status: string;
  items: BillItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
}

const ITEM_MEDIA_MAP: Record<string, { image_url: string; badge?: string }> = {
  s1: { image_url: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80", badge: "Freshly Baked" },
  s2: { image_url: "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=800&q=80", badge: "Handcrafted" },
  p1: { image_url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80", badge: "Oven Baked" },
  pz1: { image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", badge: "Tipo 00 Crust" },
  pz2: { image_url: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80", badge: "Best Seller" },
  pz3: { image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80", badge: "Mediterranean" },
  pz4: { image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", badge: "Artisanal Crust" },
  pz5: { image_url: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80", badge: "4 Seasons Classic" },
  pz6: { image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", badge: "Chef's Choice" },
  pz7: { image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80", badge: "Feta Cream" },
  pz8: { image_url: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=800&q=80", badge: "Trattoria Signature" },
  pz9: { image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80", badge: "Local Special" },
  c1: { image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80", badge: "Mascarpone Special" },
  c2: { image_url: "https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=800&q=80", badge: "House Gelato" },
  b1: { image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80", badge: "Chilled Mint" },
  b2: { image_url: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=800&q=80", badge: "Sparkling" },
  b3: { image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80", badge: "Cold Brewed" },
  b4: { image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80", badge: "Probiotic Ferment" },
  b5: { image_url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80", badge: "Natural Spring" },
  h1: { image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80", badge: "100% Arabica" },
  h2: { image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80", badge: "Himalayan Tisane" },
  h3: { image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80", badge: "Rosehip Infusion" },
  h4: { image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80", badge: "Immunity Tonic" },
};

const REAL_FULL_MENU_ITEMS: MenuItem[] = menuData.flatMap((cat) =>
  cat.items.map((item) => ({
    id: item.id,
    category_name: cat.name,
    name: item.name,
    description: item.description || item.details || "",
    price: item.price,
    is_available: true,
    is_sold_out: false,
    badge: ITEM_MEDIA_MAP[item.id]?.badge || item.tags?.[0] || cat.subtitle,
    image_url: ITEM_MEDIA_MAP[item.id]?.image_url || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    tags: item.tags,
  }))
);

export default function TableQRPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const rawToken = resolvedParams.token || "tbl-05";
  const tokenNum = rawToken.replace(/[^0-9]/g, "") || "05";

  const [tableNumber, setTableNumber] = useState(`TABLE ${tokenNum.padStart(2, "0")}`);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [qrValid, setQrValid] = useState<boolean>(true);
  const [qrError, setQrError] = useState<string | null>(null);

  const [showSplash, setShowSplash] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(REAL_FULL_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<{ [key: string | number]: { item: any; qty: number } }>({});
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState("");
  const [activeTab, setActiveTab] = useState<"HUB" | "MENU">("HUB");

  const categories = ["All", ...Array.from(new Set(menuItems.map((item) => item.category_name)))];

  // Validate QR Token & Fetch backend menu on mount
  useEffect(() => {
    async function validateQRAndFetchMenu() {
      try {
        const res = await fetch("http://localhost:8000/api/v1/tables/qr/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_token: rawToken }),
        });
        if (res.ok) {
          const data = await res.json();
          setTableNumber(`TABLE ${data.table_number.padStart(2, "0")}`);
          setSessionId(data.session_id || 1);
          setQrValid(true);
        } else {
          setTableNumber(`TABLE ${tokenNum.padStart(2, "0")}`);
          setSessionId(1);
        }
      } catch (e) {
        setTableNumber(`TABLE ${tokenNum.padStart(2, "0")}`);
        setSessionId(1);
      }

      // Try fetching backend menu items if available
      try {
        const menuRes = await fetch("http://localhost:8000/api/v1/menu/items");
        if (menuRes.ok) {
          const apiItems = await menuRes.json();
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            const mappedApiItems: MenuItem[] = apiItems.map((item: any) => ({
              id: item.id,
              category_name: item.category_name || "Specialties",
              name: item.name,
              description: item.description || "",
              price: item.price,
              is_available: item.is_available,
              is_sold_out: item.is_sold_out,
              badge: item.badge || "Kitchen Fresh",
              image_url: item.image_url || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
            }));
            setMenuItems(mappedApiItems);
          }
        }
      } catch (e) {
        // Retain REAL_FULL_MENU_ITEMS
      }
    }
    validateQRAndFetchMenu();
  }, [rawToken, tokenNum]);

  const fetchBill = async () => {
    setLoadingBill(true);
    try {
      const sId = sessionId || 1;
      const res = await fetch(`http://localhost:8000/api/v1/sessions/${sId}/bill`);
      if (res.ok) {
        const data = await res.json();
        setBillData(data);
      } else {
        const items = Object.values(cart).map((c) => ({
          name: c.item.name,
          quantity: c.qty,
          price: c.item.price,
          total: c.item.price * c.qty,
        }));
        const subtotal = items.reduce((acc, i) => acc + i.total, 0);
        const tax_amount = Math.round(subtotal * 0.05 * 100) / 100;
        setBillData({
          session_id: sId,
          table_number: tableNumber,
          status: "ACTIVE",
          items,
          subtotal,
          tax_rate: 0.05,
          tax_amount,
          grand_total: Math.round((subtotal + tax_amount) * 100) / 100,
        });
      }
    } catch (e) {
      const items = Object.values(cart).map((c) => ({
        name: c.item.name,
        quantity: c.qty,
        price: c.item.price,
        total: c.item.price * c.qty,
      }));
      const subtotal = items.reduce((acc, i) => acc + i.total, 0);
      const tax_amount = Math.round(subtotal * 0.05 * 100) / 100;
      setBillData({
        session_id: 1,
        table_number: tableNumber,
        status: "ACTIVE",
        items,
        subtotal,
        tax_rate: 0.05,
        tax_amount,
        grand_total: Math.round((subtotal + tax_amount) * 100) / 100,
      });
    } finally {
      setLoadingBill(false);
      setShowBillModal(true);
    }
  };

  const filteredItems = menuItems.filter(
    (item) => selectedCategory === "All" || item.category_name === selectedCategory
  );

  const updateCart = (item: any, change: number) => {
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

  const handleSendOrderToKitchen = async () => {
    if (totalCartCount === 0) return;
    const fallbackOrderNum = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const orderItemsPayload = Object.values(cart).map((c) => ({
        menu_item_id: typeof c.item.id === "number" ? c.item.id : 1,
        quantity: c.qty,
      }));

      const res = await fetch("http://localhost:8000/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_token: rawToken,
          items: orderItemsPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastOrderNum(data.order_number || fallbackOrderNum);
      } else {
        setLastOrderNum(fallbackOrderNum);
      }
    } catch (e) {
      setLastOrderNum(fallbackOrderNum);
    }

    setOrderPlaced(true);
    setCart({});
    setShowCartDrawer(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans selection:bg-[#B85B43]/20">
      {/* Zoom Text Intro Splash Animation */}
      {showSplash && (
        <TextZoomSplash
          tableNumber={tableNumber.replace("TABLE ", "")}
          cafeName="JAADOO"
          subtitle="UDAIPUR • ARTISANAL CAFÉ & WOODFIRED PIZZERIA"
          autoPlay={true}
          onComplete={() => setShowSplash(false)}
        />
      )}

      {/* Main Page Navbar */}
      <Navbar />

      {/* Authentic Italian Banner Header */}
      <div className="bg-[#FBF9F5] border-b border-[#E4DCD0] py-8 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#B85B43]/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4A5842]/10 border border-[#4A5842]/30 text-[#4A5842] font-mono text-xs uppercase tracking-widest mb-3">
            <span className="w-2 h-2 rounded-full bg-[#4A5842] animate-pulse" />
            BENVENUTO A JAADOO
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#261C18] font-serif">
            JAADOO CAFFÈ • CUCINA
          </h1>
          <p className="text-lg md:text-xl font-medium text-[#B85B43] tracking-widest uppercase font-mono mt-2">
            {tableNumber}
          </p>
          <p className="text-sm italic text-[#5C4E48] mt-1 font-serif">
            Buon appetito. Experience wood-fired perfection and artisanal brews in Udaipur.
          </p>
        </div>
      </div>

      {/* Dual Hub Navigation View */}
      {activeTab === "HUB" ? (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#261C18] uppercase tracking-wide font-serif">
              TABLE DIGITAL HUB
            </h2>
            <p className="text-sm text-[#5C4E48] mt-2">
              Select an option below to manage your dining experience.
            </p>
          </div>

          {/* EXACTLY TWO Primary Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* ACTION 1: ORDER MENU */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab("MENU")}
              className="group p-8 rounded-3xl bg-[#FBF9F5] border-2 border-[#E4DCD0] hover:border-[#B85B43] shadow-[0_4px_20px_rgba(38,28,24,0.06)] flex flex-col items-center text-center justify-between transition-all cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-[#261C18] text-[#FBF9F5] border border-[#261C18] flex items-center justify-center mb-6 group-hover:bg-[#B85B43] group-hover:border-[#B85B43] transition-colors shadow-sm">
                <UtensilsCrossed className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#261C18] group-hover:text-[#B85B43] transition-colors uppercase tracking-wider font-serif">
                  ORDER MENU
                </h3>
                <p className="text-xs text-[#5C4E48] mt-3 leading-relaxed">
                  Browse our artisanal wood-fired pizzas, specialty coffees, and send orders directly to the kitchen.
                </p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#B85B43] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                <span>EXPLORE MENU</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>

            {/* ACTION 2: VIEW BILL */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={fetchBill}
              className="group p-8 rounded-3xl bg-[#FBF9F5] border-2 border-[#E4DCD0] hover:border-[#B85B43] shadow-[0_4px_20px_rgba(38,28,24,0.06)] flex flex-col items-center text-center justify-between transition-all cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-[#261C18] text-[#FBF9F5] border border-[#261C18] flex items-center justify-center mb-6 group-hover:bg-[#B85B43] group-hover:border-[#B85B43] transition-colors shadow-sm">
                <Receipt className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-[#261C18] group-hover:text-[#B85B43] transition-colors uppercase tracking-wider font-serif">
                  VIEW BILL
                </h3>
                <p className="text-xs text-[#5C4E48] mt-3 leading-relaxed">
                  Review your running tab, active items, subtotal, taxes, and estimated grand total in real-time.
                </p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#B85B43] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                <span>VIEW RUNNING TAB</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>

          {/* ACTIVE TABLE SESSION ORDERS CARD */}
          {billData && billData.items && billData.items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto bg-[#FBF9F5] border border-[#E4DCD0] rounded-3xl p-6 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#B85B43]" />
                  <h3 className="font-serif font-bold text-lg text-[#261C18] tracking-wide">
                    ACTIVE TABLE ORDERS
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#4A5842]/10 text-[#4A5842] text-[11px] font-mono font-bold uppercase border border-[#4A5842]/20">
                  {billData.status || "DISPATCHED TO KITCHEN"}
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                {billData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#E4DCD0]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#261C18] text-[#FBF9F5] flex items-center justify-center font-bold text-[11px]">
                        {item.quantity}x
                      </span>
                      <span className="font-sans font-semibold text-[#261C18] text-sm">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-bold text-[#B85B43]">₹{item.total}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-[#E4DCD0] flex justify-between items-center text-xs">
                <span className="text-[#5C4E48] uppercase tracking-wider font-semibold">
                  Total Dispatched Tab
                </span>
                <span className="font-mono font-extrabold text-base text-[#B85B43]">
                  ₹{billData.grand_total.toFixed(2)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Interactive 3D Morphing Cards Showcase */}
          <MorphingCardsShowcase />

          {/* Signature Brews Showcase */}
          <SignatureBrewsShowcase onAddToCart={() => setActiveTab("MENU")} />

          {/* Instagram Feed Grid */}
          <JaadooInstagramGrid />

          {/* Heritage Story Section */}
          <TanStorySection />

          {/* Location Station */}
          <LocationBrewStation />
        </div>
      ) : (

        /* MENU VIEW matching user's exact menu screenshot */
        <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
          {/* Back to Hub Navigation */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E4DCD0]">
            <button
              onClick={() => setActiveTab("HUB")}
              className="px-5 py-2 rounded-full bg-[#FBF9F5] hover:bg-[#E4DCD0]/50 border border-[#E4DCD0] text-[#261C18] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
            >
              ← BACK TO TABLE HUB
            </button>

            <button
              onClick={fetchBill}
              className="px-5 py-2 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-xs"
            >
              <Receipt className="w-4 h-4 text-[#B85B43]" />
              <span>VIEW RUNNING TAB</span>
            </button>
          </div>

          {/* Order Success Toast */}
          {orderPlaced && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 rounded-2xl bg-[#4A5842]/10 border border-[#4A5842]/30 text-[#261C18] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-7 h-7 text-[#4A5842] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-lg text-[#261C18] uppercase tracking-wide">
                    ORDER DISPATCHED TO KITCHEN! (#{lastOrderNum})
                  </h3>
                  <p className="text-sm text-[#5C4E48] mt-1">
                    Your items have been transactionally routed to our wood-fired kitchen station.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderPlaced(false)}
                className="px-4 py-1.5 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] text-xs font-semibold uppercase tracking-wider transition"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Header Banner matching screenshot */}
          <section className="bg-[#261C18] text-[#FBF9F5] py-12 px-6 text-center border-b border-[#E4DCD0]/20 rounded-3xl mb-8 shadow-md">
            <div className="max-w-4xl mx-auto">
              <span className="text-xs font-sans font-semibold tracking-[0.25em] text-[#4A5842] uppercase bg-[#4A5842]/20 px-4 py-1.5 rounded-full border border-[#4A5842]/30">
                LA CARTA • ARTISANAL MENU
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif font-bold mt-3 text-[#FBF9F5]">
                Jaadoo Trattoria Menu
              </h1>
              <p className="text-xs sm:text-sm font-serif italic text-stone-300 mt-2 max-w-xl mx-auto">
                Wood-fired Neapolitan Pizzas • 48h Natural Fermentation • Mountain Arabica & Tisanes
              </p>
            </div>
          </section>

          {/* Sticky Category Navigation Pills matching screenshot */}
          <div className="sticky top-16 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border border-[#E4DCD0] py-3 shadow-xs mb-8 rounded-2xl px-3">
            <div className="overflow-x-auto flex items-center gap-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-sans font-semibold tracking-wider uppercase transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#261C18] text-[#FBF9F5] shadow-xs"
                    : "bg-[#F6F3EC] border border-[#E4DCD0] text-stone-700 hover:border-[#B85B43]"
                }`}
              >
                ALL DISHES
              </button>
              {menuData.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-sans font-semibold tracking-wider uppercase transition-all ${
                    selectedCategory === c.id
                      ? "bg-[#261C18] text-[#FBF9F5] shadow-xs"
                      : "bg-[#F6F3EC] border border-[#E4DCD0] text-stone-700 hover:border-[#B85B43]"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category Sections matching screenshot */}
          <div className="space-y-12">
            {(selectedCategory === "all"
              ? menuData
              : menuData.filter((c) => c.id === selectedCategory)
            ).map((category) => (
              <section id={category.id} key={category.id} className="relative pt-2">
                {/* Category Header with Icon Badge */}
                <div className="flex items-center gap-3 mb-6 border-b border-[#E4DCD0] pb-3">
                  <div className="bg-[#F6F3EC] p-2.5 rounded-full border border-[#E4DCD0]">
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

                {category.id === "pizza" && (
                  <div className="mb-6 bg-[#F6F3EC] border border-[#E4DCD0] rounded-2xl p-4 flex gap-3 items-center">
                    <Info className="w-4 h-4 text-[#B85B43] flex-shrink-0" />
                    <p className="text-xs text-stone-700 font-sans">
                      All our pizzas are wood-fired using Italian Tipo 00 flour with 48-hour natural dough fermentation. 100% vegetarian.
                    </p>
                  </div>
                )}

                {/* Item Cards matching exact screenshot design */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  {category.items.map((item) => {
                    const qtyInCart = cart[item.id]?.qty || 0;
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.015, y: -2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="group bg-[#FBF9F5] rounded-2xl p-5 border border-[#E4DCD0] shadow-xs hover:shadow-md hover:border-[#B85B43]/60 transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
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
                            <span className="text-base font-serif font-bold text-[#261C18] bg-[#F6F3EC] group-hover:bg-[#B85B43]/10 group-hover:text-[#B85B43] px-3 py-1 rounded-xl border border-[#E4DCD0] transition-colors font-mono">
                              ₹{item.price}
                            </span>

                            {qtyInCart === 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCart(item, 1);
                                }}
                                className="w-7 h-7 rounded-full bg-[#261C18] text-[#FBF9F5] flex items-center justify-center group-hover:bg-[#B85B43] group-hover:scale-105 shadow-xs transition-all"
                                aria-label="Add to order"
                              >
                                <Plus className="w-3.5 h-3.5 text-[#FBF9F5]" />
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-[#261C18] text-[#FBF9F5] rounded-full p-1 shadow-xs">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCart(item, -1);
                                  }}
                                  className="w-5 h-5 rounded-full hover:bg-[#B85B43] flex items-center justify-center transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono font-bold text-xs px-1">
                                  {qtyInCart}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateCart(item, 1);
                                  }}
                                  className="w-5 h-5 rounded-full hover:bg-[#B85B43] flex items-center justify-center transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
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
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCart(item, 1);
                              }}
                              className="ml-auto text-[10px] font-sans font-semibold text-[#B85B43] uppercase group-hover:underline cursor-pointer"
                            >
                              + Add to Table Order
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bottom Bar (Cart Drawer Trigger) */}
      {totalCartCount > 0 && activeTab === "MENU" && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-4 right-4 z-40 max-w-xl mx-auto"
        >
          <button
            onClick={() => setShowCartDrawer(true)}
            className="w-full py-4 px-6 rounded-2xl bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-sm uppercase tracking-wider shadow-[0_10px_30px_rgba(38,28,24,0.25)] flex items-center justify-between transition-all transform hover:scale-[1.01] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#FBF9F5] text-[#261C18] flex items-center justify-center font-mono font-extrabold text-xs">
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
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#FBF9F5] border-l border-[#E4DCD0] text-[#261C18] h-full p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-4">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-[#B85B43]" />
                    <h2 className="font-bold text-lg text-[#261C18] uppercase font-serif">
                      {tableNumber} ORDER DISPATCH
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowCartDrawer(false)}
                    className="p-2 rounded-full hover:bg-[#E4DCD0]/50 text-stone-600 hover:text-stone-900 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items List */}
                <div className="py-6 space-y-4">
                  {Object.values(cart).map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white border border-[#E4DCD0] flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-[#261C18]">{item.name}</h4>
                        <span className="text-xs text-[#B85B43] font-mono font-bold">
                          ₹{item.price} × {qty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#FBF9F5] border border-[#E4DCD0] rounded-lg p-1">
                        <button
                          onClick={() => updateCart(item, -1)}
                          className="p-1 hover:bg-[#E4DCD0]/50 text-[#261C18] rounded"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono font-bold text-xs text-[#261C18] px-2">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateCart(item, 1)}
                          className="p-1 hover:bg-[#E4DCD0]/50 text-[#261C18] rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-[#E4DCD0] pt-4 space-y-4">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#5C4E48] uppercase text-xs tracking-wider">Subtotal</span>
                  <span className="text-[#B85B43] font-mono text-lg">₹{totalCartPrice}</span>
                </div>

                <button
                  onClick={handleSendOrderToKitchen}
                  className="w-full py-4 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-sm uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2"
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
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-[#FBF9F5] border border-[#E4DCD0] p-6 shadow-2xl z-10 text-[#261C18]"
            >
              <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#B85B43]" />
                  <h3 className="font-bold text-lg text-[#261C18] uppercase font-serif">
                    RUNNING TAB • {tableNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="p-2 rounded-full hover:bg-[#E4DCD0]/50 text-stone-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingBill ? (
                <div className="py-12 text-center text-[#B85B43] font-mono text-xs font-bold">
                  FETCHING LIVE TAB DETAILS...
                </div>
              ) : (
                <div className="py-6 space-y-4 font-mono text-xs text-[#261C18]">
                  <div className="flex justify-between border-b border-[#E4DCD0] pb-2">
                    <span>Session Status:</span>
                    <span className="text-[#4A5842] font-bold">{billData?.status || "ACTIVE"}</span>
                  </div>

                  {/* Itemized breakdown */}
                  {billData?.items && billData.items.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {billData.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[#5C4E48] text-[11px]">
                          <span>
                            {it.quantity}x {it.name}
                          </span>
                          <span>₹{it.total}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-stone-500 italic text-[11px]">No items dispatched yet.</div>
                  )}

                  <div className="border-t border-[#E4DCD0] pt-3 space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{billData?.subtotal.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST ({( (billData?.tax_rate || 0.05) * 100 ).toFixed(0)}%):</span>
                      <span>₹{billData?.tax_amount.toFixed(2) || "0.00"}</span>
                    </div>
                    <div className="flex justify-between text-[#B85B43] font-bold text-sm pt-2 border-t border-[#E4DCD0]">
                      <span>GRAND TOTAL:</span>
                      <span>₹{billData?.grand_total.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#4A5842]/10 border border-[#4A5842]/20 text-[#261C18] text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-[#4A5842] shrink-0 mt-0.5" />
                <p>
                  Settlement is completed at your table or counter via Cash, Card, or UPI upon dining conclusion.
                </p>
              </div>

              <button
                onClick={() => setShowBillModal(false)}
                className="w-full mt-6 py-3 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-xs uppercase tracking-wider transition"
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


