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
  Coffee,
  Pizza,
  Wine,
  Utensils,
  Calendar,
  AlertTriangle,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";
import { menuData, MENU_ITEM_ID_MAP } from "@/data/menu";

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
  b5: { image_url: "/images/himalayan_mineral_water.jpg", badge: "Natural Spring" },
  h1: { image_url: "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80", badge: "100% Arabica" },
  h2: { image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80", badge: "Himalayan Tisane" },
  h3: { image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80", badge: "Rosehip Infusion" },
  h4: { image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80", badge: "Immunity Tonic" },
};

export default function TableQRPage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const rawToken = resolvedParams.token || "";

  const [tableNumber, setTableNumber] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [validatedQrToken, setValidatedQrToken] = useState<string>(rawToken);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidQr, setIsValidQr] = useState<boolean | null>(null);
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);
  const [reservationNotice, setReservationNotice] = useState<{
    is_reserved: boolean;
    reservation_id: number;
    customer_name: string;
    guest_count: number;
    time_slot: string;
    reservation_date: string;
    status: string;
    floor_number?: number;
    table_name?: string;
    minutes_until_reservation?: number;
    can_quick_dine?: boolean;
    quick_dine_minutes?: number;
    allow_self_checkin?: boolean;
  } | null>(null);

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [isQuickDineActive, setIsQuickDineActive] = useState(false);
  const [quickDineMinutesLeft, setQuickDineMinutesLeft] = useState<number | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<{ [key: string | number]: { item: MenuItem; qty: number } }>({});
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [dispatchedItems, setDispatchedItems] = useState<Array<{ name: string; quantity: number; price: number; total: number }>>([]);
  const [loadingBill, setLoadingBill] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState("");

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h.includes("vercel.app") || h.includes("onrender.com")) {
        return "https://cafe-piza-api.onrender.com";
      }
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };

  // Validate QR Token on mount
  useEffect(() => {
    async function validateQR() {
      setIsValidating(true);
      const apiBase = getApiBase();
      try {
        const res = await fetch(`${apiBase}/api/v1/tables/qr/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qr_token: rawToken }),
        });
        if (res.ok) {
          const data = await res.json();
          const cleanNum = data.table_number.replace(/[^0-9]/g, "").padStart(2, "0") || data.table_number;
          setTableNumber(`TABLE ${cleanNum}`);
          setSessionId(data.session_id);
          setSessionToken(data.session_token);
          setValidatedQrToken(rawToken);
          setIsValidQr(true);
          if (data.is_reserved && data.reservation) {
            setReservationNotice(data.reservation);
            if (data.reservation.quick_dine_minutes) {
              setQuickDineMinutesLeft(data.reservation.quick_dine_minutes);
            }
          } else {
            setReservationNotice(null);
          }
        } else {
          setIsValidQr(false);
          setQrErrorMessage("This table QR code is invalid, expired, or has rotated. Direct URL manipulation is prohibited for dining privacy.");
          setSessionId(null);
          setSessionToken(null);
        }
      } catch {
        setIsValidQr(false);
        setQrErrorMessage("Unable to verify table QR code. Please check your network connection.");
        setSessionId(null);
        setSessionToken(null);
      } finally {
        setIsValidating(false);
      }
    }
    validateQR();
  }, [rawToken]);

  // 5. Multi-Device Shared Table Cart & Bill: Real-time background sync every 6s
  useEffect(() => {
    if (!sessionId || !sessionToken) return;

    let isMounted = true;
    const syncTableBill = async () => {
      const apiBase = getApiBase();
      try {
        const res = await fetch(`${apiBase}/api/v1/tables/sessions/${sessionId}/bill`, {
          headers: { "X-Session-Token": sessionToken },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setBillData(data);
          if (data.items && data.items.length > 0) {
            setDispatchedItems(data.items);
          }
        }
      } catch {
        // silent sync fallback
      }
    };

    syncTableBill();
    const interval = setInterval(syncTableBill, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, sessionToken]);

  // Quick Dine Countdown Timer
  useEffect(() => {
    if (!isQuickDineActive || quickDineMinutesLeft === null) return;
    const interval = setInterval(() => {
      setQuickDineMinutesLeft((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [isQuickDineActive, quickDineMinutesLeft]);

  // 3. 1-Tap Self Check-In via QR Scan
  const handleSelfCheckIn = async () => {
    if (!reservationNotice) return;
    setIsCheckingIn(true);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/reservations/${reservationNotice.reservation_id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: sessionToken }),
      });
      if (res.ok) {
        setCheckInSuccess(true);
        setReservationNotice((prev) =>
          prev ? { ...prev, status: "SEATED", allow_self_checkin: false } : null
        );
      } else {
        alert("Check-in could not be completed. Please inform your server or floor manager.");
      }
    } catch {
      alert("Network error during check-in. Please try again.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // 4. Quick Dine Acceptance Handler
  const handleAcceptQuickDine = () => {
    setIsQuickDineActive(true);
    if (reservationNotice?.quick_dine_minutes) {
      setQuickDineMinutesLeft(reservationNotice.quick_dine_minutes);
    }
  };

  const updateCart = (item: any, delta: number) => {
    setCart((prev) => {
      const current = prev[item.id]?.qty || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }
      return {
        ...prev,
        [item.id]: { item, qty: next },
      };
    });
  };

  const totalCartCount = Object.values(cart).reduce((sum, c) => sum + c.qty, 0);
  const totalCartPrice = Object.values(cart).reduce((sum, c) => sum + c.item.price * c.qty, 0);

  const fetchBill = async () => {
    if (!sessionId || !sessionToken) return;
    setShowBillModal(true);
    setLoadingBill(true);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/tables/sessions/${sessionId}/bill`, {
        headers: {
          "X-Session-Token": sessionToken,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBillData(data);
      } else {
        const sub = dispatchedItems.reduce((acc, it) => acc + it.total, 0);
        const tax = sub * 0.05;
        setBillData({
          session_id: sessionId,
          table_number: tableNumber,
          status: "ACTIVE",
          items: dispatchedItems,
          subtotal: sub,
          tax_rate: 0.05,
          tax_amount: tax,
          grand_total: sub + tax,
        });
      }
    } catch {
      const sub = dispatchedItems.reduce((acc, it) => acc + it.total, 0);
      const tax = sub * 0.05;
      setBillData({
        session_id: sessionId,
        table_number: tableNumber,
        status: "ACTIVE",
        items: dispatchedItems,
        subtotal: sub,
        tax_rate: 0.05,
        tax_amount: tax,
        grand_total: sub + tax,
      });
    } finally {
      setLoadingBill(false);
    }
  };

  const handleSendOrderToKitchen = async () => {
    if (totalCartCount === 0 || !sessionToken) return;
    const apiBase = getApiBase();

    const orderPayload = {
      qr_token: validatedQrToken,
      session_token: sessionToken,
      items: Object.values(cart).map((c) => {
        const idStr = String(c.item.id);
        const mappedId = MENU_ITEM_ID_MAP[idStr] || (typeof c.item.id === "number" ? c.item.id : parseInt(idStr, 10));
        return {
          menu_item_id: mappedId && !isNaN(mappedId) && mappedId > 0 ? mappedId : undefined,
          name: c.item.name,
          quantity: c.qty,
        };
      }),
    };

    try {
      const res = await fetch(`${apiBase}/api/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const data = await res.json();
        setLastOrderNum(data.order_number || `ORD-${Date.now().toString().slice(-6)}`);
        if (data.dining_session_id) {
          setSessionId(data.dining_session_id);
        }
        const newlyDispatched = Object.values(cart).map((c) => ({
          name: c.item.name,
          quantity: c.qty,
          price: c.item.price,
          total: c.item.price * c.qty,
        }));
        setDispatchedItems((prev) => [...prev, ...newlyDispatched]);
        setOrderPlaced(true);
        setCart({});
        setShowCartDrawer(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Order could not be placed: ${errData.detail || "Server error"}`);
      }
    } catch {
      alert("Network error. Please make sure the café server is reachable.");
    }
  };

  // 1. Loading State
  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-[#261C18] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-condensed text-xl font-bold uppercase tracking-wider text-[#261C18]">
          Verifying Table QR Session...
        </p>
      </div>
    );
  }

  // 2. Invalid or Expired QR Error State (e.g. /table/1 without valid QR token)
  if (isValidQr === false) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans flex flex-col justify-between p-6">
        <div className="max-w-md mx-auto my-auto w-full bg-white rounded-3xl p-8 border border-[#E4DCD0] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-700">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h2 className="font-condensed text-3xl font-extrabold uppercase tracking-wide text-[#261C18]">
            Invalid Table QR
          </h2>
          <p className="text-sm text-gray-600 font-sans leading-relaxed">
            {qrErrorMessage || "This QR code is invalid, expired, or has rotated. Please scan the official QR code placed on your dining table."}
          </p>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 font-sans">
            🔒 For guest security and bill isolation, direct table number URLs (such as /table/1) are not allowed.
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <a
              href="/"
              className="w-full bg-[#261C18] text-white py-3.5 rounded-full font-condensed font-bold uppercase tracking-wider hover:bg-[#B85B43] transition-colors text-sm"
            >
              Explore Public Menu & Home
            </a>
            <a
              href="/book-table"
              className="w-full bg-white border border-[#261C18] text-[#261C18] py-3.5 rounded-full font-condensed font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors text-sm"
            >
              Reserve a Table
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans selection:bg-[#B85B43]/20">
      {/* Direct Focused Header: Table Number & View Bill */}
      <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] shadow-xs px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/40 shadow-xs">
              <span className="font-serif italic font-bold text-sm text-[#B85B43]">J</span>
            </div>
            <div>
              <span className="font-serif font-extrabold text-base leading-none text-[#261C18] block">
                JAADOO <span className="font-serif italic font-normal text-sm text-[#B85B43]">Trattoria</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-[#4A5842] flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {tableNumber}
              </span>
            </div>
          </div>

          <button
            onClick={fetchBill}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5 text-[#B85B43]" />
            <span>
              VIEW BILL
              {billData && billData.grand_total > 0 ? ` (₹${Math.round(billData.grand_total)})` : ""}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container: Pure Menu & Bill Flow */}
      <main className="max-w-4xl mx-auto px-4 py-4 pb-32">
        {/* Quick Dine Active Banner */}
        {isQuickDineActive && reservationNotice && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-condensed font-bold text-sm uppercase text-amber-950 block">
                  ⚡ Quick Dine Session Active
                </span>
                <span className="text-xs text-amber-900">
                  Table reserved at {reservationNotice.time_slot} • Wrap up within{" "}
                  <span className="font-bold font-mono text-amber-800">
                    {quickDineMinutesLeft ?? reservationNotice.quick_dine_minutes} mins
                  </span>
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-600 text-white font-mono font-bold text-xs shrink-0 animate-pulse">
              {quickDineMinutesLeft ?? reservationNotice.quick_dine_minutes}m left
            </span>
          </div>
        )}

        {/* Checked-In Welcome Banner */}
        {(checkInSuccess || (reservationNotice && reservationNotice.status === "SEATED")) && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/35 text-emerald-950 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-condensed font-bold text-sm uppercase tracking-wider text-emerald-900">
                    Welcome, {reservationNotice?.customer_name || "Guest"}!
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    CHECKED IN • SEATED
                  </span>
                </div>
                <p className="text-xs text-emerald-900/90 mt-1">
                  You are checked in at {reservationNotice?.table_name || tableNumber}. Your digital menu is unlocked — explore our wood-fired pizzas, starters, and beverages below!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table Reservation Notice Banner (If not seated) */}
        {reservationNotice && reservationNotice.status !== "SEATED" && !checkInSuccess && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/35 text-amber-950 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-condensed font-bold text-sm uppercase tracking-wider text-amber-900">
                    TABLE RESERVED NOTICE
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {reservationNotice.status}
                  </span>
                  {reservationNotice.floor_number && (
                    <span className="text-[10px] font-bold bg-[#261C18] text-white px-2 py-0.5 rounded-full">
                      Floor {reservationNotice.floor_number}
                    </span>
                  )}
                  {reservationNotice.table_name && (
                    <span className="text-[10px] font-bold bg-[#B85B43] text-white px-2 py-0.5 rounded-full">
                      {reservationNotice.table_name}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[#261C18] mt-1.5">
                  This table is reserved for <span className="text-[#B85B43] font-bold">{reservationNotice.customer_name}</span> ({reservationNotice.guest_count} Guests) on {reservationNotice.reservation_date} at {reservationNotice.time_slot}.
                </p>

                {/* 3. 1-Tap Self Check-In via QR Scan */}
                {reservationNotice.allow_self_checkin && (
                  <div className="mt-3">
                    <button
                      onClick={handleSelfCheckIn}
                      disabled={isCheckingIn}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      {isCheckingIn ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Checking You In...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Are you {reservationNotice.customer_name}? [Tap to Check In & Start Ordering]</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* 4. Quick Dine Option for Walk-Ins */}
                {reservationNotice.can_quick_dine && !isQuickDineActive && (
                  <div className="mt-3 p-3 bg-amber-100/80 rounded-xl border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 uppercase tracking-wide">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <span>Walk-in Quick Dine (Under {reservationNotice.quick_dine_minutes} mins)</span>
                      </div>
                      <p className="text-xs text-amber-900/90 mt-0.5">
                        This table is reserved in {reservationNotice.minutes_until_reservation} mins ({reservationNotice.time_slot}). Would you like a Quick Dine session (under {reservationNotice.quick_dine_minutes} mins)?
                      </p>
                    </div>
                    <button
                      onClick={handleAcceptQuickDine}
                      className="whitespace-nowrap px-3.5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider transition shadow-2xs"
                    >
                      ⚡ Start Quick Dine
                    </button>
                  </div>
                )}

                <p className="text-xs text-amber-900/70 mt-2">
                  If this is your reservation, tap check-in above. Walk-in guests can take a quick dine session or check with our floor manager for an unreserved table.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Success Confirmation Banner */}
        {orderPlaced && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#F4EFE6] border border-[#4A5842]/40 text-[#261C18] flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#4A5842] shrink-0" />
              <div>
                <p className="font-serif font-bold text-sm text-[#261C18]">Order Sent to Kitchen!</p>
                <p className="text-[11px] text-stone-600 font-mono">Order #{lastOrderNum} • KOT Generated</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchBill}
                className="px-3 py-1 rounded-full bg-[#261C18] text-[#FBF9F5] text-[11px] font-bold uppercase tracking-wider hover:bg-[#B85B43] transition"
              >
                View Bill
              </button>
              <button
                onClick={() => setOrderPlaced(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Sticky Category Navigation Filter */}
        <div className="sticky top-14 z-30 bg-[#FBF9F5]/95 backdrop-blur-md border border-[#E4DCD0] py-2 px-2.5 rounded-2xl shadow-2xs mb-5">
          <div className="overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`whitespace-nowrap px-3.5 py-1 rounded-full text-xs font-sans font-semibold tracking-wider uppercase transition-all ${
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
                className={`whitespace-nowrap px-3.5 py-1 rounded-full text-xs font-sans font-semibold tracking-wider uppercase transition-all ${
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

        {/* Category Sections & Items List */}
        <div className="space-y-8">
          {(selectedCategory === "all"
            ? menuData
            : menuData.filter((c) => c.id === selectedCategory)
          ).map((category) => (
            <section id={category.id} key={category.id}>
              {/* Category Header */}
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#EADFCF]">
                <div className="w-6 h-6 rounded-full border border-[#E4DCD0] bg-[#FBF9F5] flex items-center justify-center text-[#B85B43] shrink-0">
                  {categoryIcons[category.id] || <Utensils className="w-3 h-3 text-[#B85B43]" />}
                </div>
                <h2 className="text-sm font-serif font-bold text-[#261C18] uppercase tracking-wider">
                  {category.name}
                </h2>
                {category.subtitle && (
                  <span className="text-xs font-serif italic text-[#B85B43]">
                    • {category.subtitle}
                  </span>
                )}
              </div>

              {/* Menu Items */}
              <div className="divide-y divide-[#EFE8DC]/80">
                {category.items.map((item) => {
                  const qtyInCart = cart[item.id]?.qty || 0;
                  const itemMedia = ITEM_MEDIA_MAP[item.id];
                  const imgUrl = itemMedia?.image_url || "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80";
                  const badge = itemMedia?.badge || item.tags?.[0];

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (qtyInCart === 0) updateCart(item, 1);
                      }}
                      className={`group flex items-start sm:items-center justify-between py-2.5 px-2 rounded-xl transition-all cursor-pointer ${
                        qtyInCart > 0
                          ? "bg-[#F7F3EB] border border-[#E5DAC8]"
                          : "hover:bg-[#F7F3EB]/70 border border-transparent"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-full overflow-hidden border border-[#E4DCD0] shrink-0 bg-[#F6F3EC] flex items-center justify-center shadow-2xs mr-3 mt-0.5 sm:mt-0">
                        <img
                          src={imgUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 pr-3">
                        {badge && (
                          <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-stone-600 bg-[#EFECE4] px-1.5 py-0.5 rounded-full inline-block mb-0.5">
                            {badge}
                          </span>
                        )}
                        <h3 className="text-sm font-serif font-bold text-[#261C18] uppercase tracking-wide leading-snug group-hover:text-[#B85B43] transition-colors break-words whitespace-normal">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs font-serif italic text-stone-500 mt-0.5 leading-relaxed break-words whitespace-normal">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Price & Add Controls */}
                      <div className="flex flex-col items-end shrink-0 pl-2 pt-0.5 sm:pt-0">
                        <span className="text-sm font-serif font-bold text-[#261C18] text-right mb-1">
                          ₹{item.price}
                        </span>

                        {qtyInCart === 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCart(item, 1);
                            }}
                            className="px-4 py-1 rounded-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] text-xs font-sans font-bold uppercase tracking-wider shadow-2xs transition-all"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-[#261C18] text-[#FBF9F5] rounded-full px-2 py-0.5 shadow-xs">
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
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Floating Bottom Bar: Review & Send Order */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-5 left-4 right-4 z-40 max-w-lg mx-auto">
          <button
            onClick={() => setShowCartDrawer(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-sm uppercase tracking-wider shadow-xl flex items-center justify-between transition-all transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#FBF9F5] text-[#261C18] flex items-center justify-center font-mono font-black text-xs">
                {totalCartCount}
              </span>
              <span>CONFIRM ORDER</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold">₹{totalCartPrice}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
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
                      {tableNumber} ORDER
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowCartDrawer(false)}
                    className="p-1.5 rounded-full hover:bg-[#E4DCD0]/50 text-stone-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items in Cart */}
                <div className="py-5 space-y-3">
                  {Object.values(cart).map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-white border border-[#E4DCD0] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif font-bold text-sm text-[#261C18] break-words whitespace-normal">{item.name}</h4>
                        <span className="text-xs text-[#B85B43] font-mono font-bold">
                          ₹{item.price} × {qty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#FBF9F5] border border-[#E4DCD0] rounded-lg p-1">
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

              {/* Cart Footer */}
              <div className="border-t border-[#E4DCD0] pt-4 space-y-3">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-500 uppercase text-xs tracking-wider">Subtotal</span>
                  <span className="text-[#B85B43] font-mono text-lg">₹{totalCartPrice}</span>
                </div>

                <button
                  onClick={handleSendOrderToKitchen}
                  className="w-full py-3.5 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-sm uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>SEND ORDER TO KITCHEN</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Running Bill Modal */}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-3xl bg-[#FBF9F5] border border-[#E4DCD0] p-6 shadow-2xl z-10 text-[#261C18]"
            >
              <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3.5">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#B85B43]" />
                  <h3 className="font-bold text-lg text-[#261C18] uppercase font-serif">
                    {tableNumber} • RUNNING BILL
                  </h3>
                </div>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="p-1.5 rounded-full hover:bg-[#E4DCD0]/50 text-stone-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingBill ? (
                <div className="py-12 text-center text-[#B85B43] font-mono text-xs font-bold">
                  FETCHING LIVE BILL DETAILS...
                </div>
              ) : (
                <div className="py-5 space-y-4 font-mono text-xs text-[#261C18]">
                  <div className="flex justify-between border-b border-[#E4DCD0] pb-2">
                    <span>Session Status:</span>
                    <span className="text-[#4A5842] font-bold">{billData?.status || "ACTIVE"}</span>
                  </div>

                  {/* Dispatched items */}
                  {billData?.items && billData.items.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {billData.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start text-stone-600 text-[11px] gap-2">
                          <span className="flex-1 min-w-0 break-words whitespace-normal">
                            {it.quantity}× {it.name}
                          </span>
                          <span className="font-bold text-[#261C18] shrink-0">₹{it.total}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-stone-400 italic text-[11px] py-4 text-center">
                      No items ordered yet for this table.
                    </div>
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
                    <div className="flex justify-between text-[#B85B43] font-bold text-base pt-2 border-t border-[#E4DCD0]">
                      <span>GRAND TOTAL:</span>
                      <span>₹{billData?.grand_total.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#4A5842]/10 border border-[#4A5842]/20 text-[#261C18] text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-[#4A5842] shrink-0 mt-0.5" />
                <p>
                  You can pay and settle your bill at your table or at the counter upon leaving.
                </p>
              </div>

              <button
                onClick={() => setShowBillModal(false)}
                className="w-full mt-4 py-3 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] font-bold text-xs uppercase tracking-wider transition"
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
