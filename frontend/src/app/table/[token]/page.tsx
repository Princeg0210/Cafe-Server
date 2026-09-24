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
import Navbar from "@/components/Navbar";
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

  const [menuItems, setMenuItems] = useState<MenuItem[]>(REAL_FULL_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<{ [key: string | number]: { item: any; qty: number } }>({});
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState("");
  const [activeTab, setActiveTab] = useState<"HUB" | "MENU">("HUB");

  const categories = ["All", ...Array.from(new Set(menuItems.map((item) => item.category_name)))];

  const [validatedQrToken, setValidatedQrToken] = useState<string>(rawToken);

  const getApiBase = () => {
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      return `http://${window.location.hostname}:8000`;
    }
    return "http://localhost:8000";
  };

  // Validate QR Token & Fetch backend menu on mount
  useEffect(() => {
    async function validateQRAndFetchMenu() {
      const apiBase = getApiBase();
      try {
        const res = await fetch(`${apiBase}/api/v1/tables/qr/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_token: rawToken }),
        });
        if (res.ok) {
          const data = await res.json();
          setTableNumber(`TABLE ${data.table_number.replace(/[^0-9]/g, "").padStart(2, "0") || data.table_number}`);
          setSessionId(data.session_id || 1);
          if (data.qr_token) setValidatedQrToken(data.qr_token);
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
        const menuRes = await fetch(`${apiBase}/api/v1/menu/items`);
        if (menuRes.ok) {
          const apiItems = await menuRes.json();
          if (Array.isArray(apiItems) && apiItems.length > 0) {
            const CATEGORY_ID_TO_NAME: Record<number, string> = {
              1: "STARTERS & SMALL PLATES",
              2: "OVEN-BAKED PASTA",
              3: "WOOD-FIRED NEAPOLITAN PIZZAS",
              4: "TRATTORIA DESSERTS",
              5: "COLD DRINKS & KOMBUCHA",
              6: "COFFEE & MOUNTAIN TISANES",
            };
            const mappedApiItems: MenuItem[] = apiItems.map((item: any) => ({
              id: item.id,
              category_name: item.category_name || CATEGORY_ID_TO_NAME[item.category_id] || "WOOD-FIRED NEAPOLITAN PIZZAS",
              name: item.name,
              description: item.description || "",
              price: parseFloat(item.price),
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
      const MENU_ITEM_ID_MAP: Record<string, number> = {
        s1: 1, s2: 2, p1: 3,
        pz1: 4, pz2: 5, pz3: 6, pz4: 7, pz5: 8, pz6: 9, pz7: 10, pz8: 11, pz9: 12,
        c1: 13, c2: 14, d1: 13, d2: 14,
        b1: 15, b2: 16, b3: 17, b4: 18, b5: 19,
        h1: 20, h2: 21, h3: 22, h4: 23,
      };

      const orderItemsPayload = Object.values(cart).map((c) => ({
        menu_item_id: typeof c.item.id === "number" ? c.item.id : (MENU_ITEM_ID_MAP[c.item.id] || parseInt(c.item.id) || 1),
        quantity: c.qty,
      }));

      const apiBase = getApiBase();
      const tokenToUse = validatedQrToken || rawToken;
      const res = await fetch(`${apiBase}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_token: tokenToUse,
          items: orderItemsPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastOrderNum(data.order_number || fallbackOrderNum);
        setOrderPlaced(true);
        setCart({});
        setShowCartDrawer(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Order could not be sent to kitchen: ${errData.detail || "Server error"}`);
      }
    } catch (e) {
      alert("Network connection error. Please make sure the café server is reachable.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans selection:bg-[#B85B43]/20">
      {/* Main Page Navbar with Scanned Table & Bill Trigger */}
      <Navbar tableNumber={tableNumber} onOpenCart={fetchBill} />

      {/* Dual Hub Navigation View */}
      {activeTab === "HUB" ? (
        <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-6">
          
          {/* Scanned Table Confirmation Badge */}
          <div className="text-center pt-2 pb-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#261C18] text-[#FBF9F5] border border-[#B85B43]/40 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-xs sm:text-sm tracking-widest uppercase">
                {tableNumber} SCANNED
              </span>
            </div>
            <p className="text-xs text-[#5C4E48] font-sans mt-2">
              Your dining session is active. Orders placed will be prepared and served directly to this table.
            </p>
          </div>

          {/* EXACTLY TWO Primary Actions matching user screenshot */}
          <div className="grid grid-cols-1 gap-6">
            {/* ACTION 1: ORDER MENU */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedCategory("all");
                setActiveTab("MENU");
              }}
              className="group p-8 sm:p-10 rounded-3xl bg-[#FBF9F5] border-2 border-[#E4DCD0] hover:border-[#B85B43] shadow-[0_4px_20px_rgba(38,28,24,0.06)] flex flex-col items-center text-center justify-between transition-all cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-[#261C18] text-[#FBF9F5] border border-[#261C18] flex items-center justify-center mb-6 group-hover:bg-[#B85B43] group-hover:border-[#B85B43] transition-colors shadow-sm">
                <UtensilsCrossed className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#261C18] group-hover:text-[#B85B43] transition-colors uppercase tracking-wider font-serif">
                  ORDER MENU
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4E48] mt-3 leading-relaxed max-w-md">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchBill}
              className="group p-8 sm:p-10 rounded-3xl bg-[#FBF9F5] border-2 border-[#E4DCD0] hover:border-[#B85B43] shadow-[0_4px_20px_rgba(38,28,24,0.06)] flex flex-col items-center text-center justify-between transition-all cursor-pointer"
            >
              <div className="w-20 h-20 rounded-full bg-[#B85B43] text-[#FBF9F5] border border-[#B85B43] flex items-center justify-center mb-6 transition-colors shadow-sm">
                <Receipt className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#261C18] group-hover:text-[#B85B43] transition-colors uppercase tracking-wider font-serif">
                  VIEW BILL
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4E48] mt-3 leading-relaxed max-w-md">
                  Review your running tab, active items, subtotal, taxes, and estimated grand total in real-time.
                </p>
              </div>
              <div className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#B85B43] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                <span>VIEW RUNNING TAB</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.button>
          </div>
        </div>
      ) : (

        /* MENU VIEW matching user's exact menu screenshot */
        <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
          {/* Back to Hub Navigation */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E4DCD0] flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("HUB")}
              className="px-5 py-2 rounded-full bg-[#FBF9F5] hover:bg-[#E4DCD0]/50 border border-[#E4DCD0] text-[#261C18] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition"
            >
              ← BACK TO TABLE HUB
            </button>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#261C18] text-[#FBF9F5] text-xs font-mono font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{tableNumber}</span>
            </div>

            <button
              onClick={fetchBill}
              className="px-5 py-2 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-xs"
            >
              <Receipt className="w-4 h-4 text-[#B85B43]" />
              <span>VIEW RUNNING TAB</span>
            </button>
          </div>

          {/* Order Success Banner / Warm Punchline - High Visibility & Beautiful Typography */}
          {orderPlaced && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 sm:p-8 md:p-10 rounded-3xl bg-[#FAF7F2] text-[#261C18] border-2 border-[#DECFC0] shadow-xl relative overflow-hidden text-center max-w-3xl mx-auto"
            >
              {/* Checkmark Badge */}
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#4A5842]/15 border-2 border-[#4A5842] text-[#4A5842] mb-3 shadow-xs">
                <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-[#4A5842]" />
              </div>

              {/* Order ID Pill */}
              <div className="mb-2">
                <span className="inline-block text-xs sm:text-sm font-mono tracking-widest text-[#B85B43] uppercase font-bold bg-[#B85B43]/10 px-4 py-1 rounded-full border border-[#B85B43]/30">
                  Order #{lastOrderNum || "CONFIRMED"} • Dispatched to Kitchen & Bar
                </span>
              </div>

              {/* Main Headline */}
              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#261C18] mb-3">
                Your Order is Sizzling in the Oven!
              </h3>

              {/* Warm Note Box - High Contrast, Large Readable Font */}
              <div className="bg-[#F3ECE1] border-2 border-[#E2D4C3] rounded-2xl p-5 sm:p-7 my-5 text-center shadow-xs">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-[#DECFC0] text-xs font-sans font-bold uppercase tracking-wider text-[#B85B43] mb-3 shadow-2xs">
                  <span>🤝 A Warm Note From Our Team</span>
                </div>
                
                <p className="font-serif text-base sm:text-lg md:text-xl text-[#261C18] leading-relaxed font-semibold">
                  “Please feel free to settle your bill at our reception counter whenever you wrap up. We invite you to pay at the counter not just for the bill, but because we genuinely love to meet, smile with, and thank the wonderful people who grace Jaadoo Café with their presence.”
                </p>

                <p className="text-xs sm:text-sm font-sans font-medium text-[#4A5842] mt-3">
                  🌿 You are never just a table number to us — you are our guest. Savor every bite!
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setOrderPlaced(false)}
                  className="px-8 py-3 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  Got it, thank you!
                </button>
                <button
                  onClick={fetchBill}
                  className="px-8 py-3 rounded-full bg-white hover:bg-[#F3ECE1] text-[#261C18] text-xs sm:text-sm font-bold uppercase tracking-wider border-2 border-[#DECFC0] shadow-xs hover:shadow-sm transition-all"
                >
                  View Running Tab
                </button>
              </div>
            </motion.div>
          )}

          {/* Header Banner - Compact with Table Badge */}
          <section className="bg-[#261C18] text-[#FBF9F5] py-7 px-4 text-center border-b border-[#E4DCD0]/20 rounded-3xl mb-6 shadow-md">
            <div className="max-w-4xl mx-auto">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-emerald-400 uppercase bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                ● {tableNumber} ORDERING
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
          <div className="sticky top-16 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border border-[#E4DCD0] py-2.5 shadow-2xs mb-6 rounded-2xl px-3">
            <div className="overflow-x-auto flex items-center justify-center sm:justify-start gap-1.5 no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-sans font-semibold tracking-wider uppercase transition-all ${
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
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-sans font-semibold tracking-wider uppercase transition-all ${
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

          {/* Category Sections - Sleek Horizontal Strip List Matching Reference Screenshot */}
          <div className="space-y-10 max-w-4xl mx-auto">
            {(selectedCategory === "all"
              ? menuData
              : menuData.filter((c) => c.id === selectedCategory)
            ).map((category) => (
              <section id={category.id} key={category.id} className="relative">
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
                    const qtyInCart = cart[item.id]?.qty || 0;
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.005 }}
                        transition={{ duration: 0.15 }}
                        className={`group relative flex items-center justify-between py-3 px-2 sm:px-4 rounded-xl transition-all duration-150 cursor-pointer ${
                          qtyInCart > 0
                            ? "bg-[#F7F3EB] border border-[#E5DAC8] shadow-2xs"
                            : "hover:bg-[#F7F3EB]/80 border border-transparent hover:border-[#E5DAC8]"
                        }`}
                        onClick={() => {
                          if (qtyInCart === 0) updateCart(item, 1);
                        }}
                      >
                        {/* Left: Round Dish Illustration / Photo Thumbnail */}
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-[#E4DCD0] shrink-0 bg-[#F6F3EC] flex items-center justify-center shadow-2xs mr-3 sm:mr-4">
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
                          <h3 className="text-xs sm:text-sm font-serif font-bold text-[#261C18] uppercase tracking-wide leading-snug truncate sm:whitespace-normal group-hover:text-[#B85B43] transition-colors">
                            {item.name}
                          </h3>

                          {/* Italic Description */}
                          {item.description && (
                            <p className="text-[11px] sm:text-xs font-serif italic text-stone-500 truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Right: Bold Price + Dark ADD Pill Button or Quantity Controls */}
                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="text-xs sm:text-sm font-serif font-bold text-[#261C18] text-right mb-1">
                            ₹{item.price}
                          </span>

                          {qtyInCart === 0 ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCart(item, 1);
                              }}
                              className="px-5 sm:px-6 py-1 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] text-xs font-sans font-bold uppercase tracking-wider shadow-2xs transition-all flex items-center justify-center gap-1"
                              aria-label={`Add ${item.name} to order`}
                            >
                              ADD
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 bg-[#261C18] text-[#FBF9F5] rounded-full px-2.5 py-0.5 shadow-xs">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateCart(item, -1);
                                }}
                                className="w-5 h-5 rounded-full hover:bg-[#B85B43] flex items-center justify-center transition"
                                aria-label="Decrease quantity"
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
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
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
    </div>
  );
}


