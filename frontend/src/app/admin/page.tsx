"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Utensils,
  QrCode,
  FileText,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Edit3,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  ExternalLink,
  Store,
  Layers,
  CreditCard,
  Smartphone,
  Banknote,
  Sparkles,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { menuData, MENU_ITEM_ID_MAP } from "@/data/menu";

interface DashboardMetrics {
  total_revenue: number;
  today_sales: number;
  yesterday_sales: number;
  week_sales: number;
  month_sales: number;
  total_kots: number;
  today_kots_count: number;
  active_tables: number;
  total_tables: number;
  avg_ticket_value: number;
}

interface SalesHistoryItem {
  date: string;
  raw_date: string;
  revenue: number;
  kots: number;
}

interface TopItem {
  name: string;
  price: number;
  quantity: number;
  revenue: number;
}

interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  price: number | string;
  tax_rate: number | string;
  is_available: boolean;
  is_active: boolean;
}

interface MenuCategory {
  id: number;
  name: string;
}

const INITIAL_CATEGORIES: MenuCategory[] = [
  { id: 1, name: "STARTERS" },
  { id: 2, name: "PRIMO" },
  { id: 3, name: "WOOD-FIRED NEAPOLITAN PIZZAS" },
  { id: 4, name: "CAKES" },
  { id: 5, name: "BEVERAGES" },
  { id: 6, name: "HOT DRINKS" },
];

const INITIAL_MENU_ITEMS: MenuItem[] = menuData.flatMap((c, catIdx) =>
  c.items.map((item, itemIdx) => {
    const backendId = MENU_ITEM_ID_MAP[item.id] || (catIdx + 1) * 100 + itemIdx + 1;
    return {
      id: backendId,
      category_id: catIdx + 1,
      name: item.name,
      description: item.description || "",
      price: item.price,
      tax_rate: "5.00",
      is_available: true,
      is_active: true,
    };
  })
);

interface Reservation {
  id: number;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  booking_date: string;
  time_slot: string;
  status: string;
  advance_amount: number | string;
  payment_status: string;
  upi_utr?: string;
  special_requests?: string;
}

interface TableOverview {
  id: number;
  table_number: string;
  capacity: number;
  qr_token: string;
  is_active: boolean;
  active_session_count: number;
}

interface KOTRecord {
  id: number;
  kot_number: string;
  table_number: string;
  status: string;
  printed_status: string;
  total_amount: number | string;
  items_count: number;
  created_at: string;
}

export default function AdminPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"analytics" | "menu" | "reservations" | "tables" | "ledger">("analytics");

  // Dashboard Data
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<Record<string, number>>({});
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [reservationSummary, setReservationSummary] = useState<any>(null);

  // Menu Data - Pre-populated so admin UI is NEVER blank or empty
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [categories, setCategories] = useState<MenuCategory[]>(INITIAL_CATEGORIES);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({ name: "", category_id: 1, description: "", price: 350 });
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | "all">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reservations Data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resSearch, setResSearch] = useState("");
  const [resDateFilter, setResDateFilter] = useState("");

  // Tables Data
  const [tables, setTables] = useState<TableOverview[]>([]);
  const [qrModalTable, setQrModalTable] = useState<{ number: string; url: string; qrDataUrl: string } | null>(null);

  // Ledger / KOTs Data
  const [kots, setKots] = useState<KOTRecord[]>([]);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

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

  // Check stored token
  useEffect(() => {
    const savedToken = localStorage.getItem("jaadoo_admin_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  // Fetch menu data independently (works with or without token)
  const fetchMenuData = useCallback(async () => {
    const apiBase = getApiBase();
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/menu/categories`),
        fetch(`${apiBase}/api/v1/menu/items`),
      ]);
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData) && catData.length > 0) {
          setCategories(catData);
        }
      }
      if (itemRes.ok) {
        const dbItems = await itemRes.json();
        if (Array.isArray(dbItems) && dbItems.length > 0) {
          // Merge db items with INITIAL_MENU_ITEMS so no item is ever lost
          const dbMap = new Map<number, any>();
          const dbMapByName = new Map<string, any>();
          dbItems.forEach((it: any) => {
            if (it.id) dbMap.set(Number(it.id), it);
            if (it.name) dbMapByName.set(it.name.trim().toLowerCase(), it);
          });

          setMenuItems((prev) => {
            const baseList = prev.length > 0 ? prev : INITIAL_MENU_ITEMS;
            const updatedList = baseList.map((item) => {
              const matched = dbMap.get(item.id) || dbMapByName.get(item.name.trim().toLowerCase());
              if (matched) {
                return {
                  ...item,
                  id: Number(matched.id) || item.id,
                  category_id: Number(matched.category_id) || item.category_id,
                  price: Number(matched.price),
                  description: matched.description || item.description,
                  is_available: Boolean(matched.is_available),
                  is_active: matched.is_active !== undefined ? Boolean(matched.is_active) : true,
                };
              }
              return item;
            });

            // Also append any new items from DB not present in initial list
            const existingIds = new Set(updatedList.map((i) => i.id));
            dbItems.forEach((it: any) => {
              if (!existingIds.has(Number(it.id))) {
                updatedList.push({
                  id: Number(it.id),
                  category_id: Number(it.category_id),
                  name: it.name,
                  description: it.description || "",
                  price: Number(it.price),
                  tax_rate: it.tax_rate || "5.00",
                  is_available: Boolean(it.is_available),
                  is_active: it.is_active !== undefined ? Boolean(it.is_active) : true,
                });
              }
            });

            return updatedList;
          });
        }
      }
    } catch (err) {
      console.warn("Live menu sync fallback:", err);
    }
  }, []);

  // Fetch all dashboard data
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const apiBase = getApiBase();

    // 1. Always sync menu
    await fetchMenuData();

    if (!token) {
      if (!silent) setIsLoading(false);
      return;
    }

    // 2. Analytics Dashboard (Protected)
    try {
      const anaRes = await fetch(`${apiBase}/api/v1/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (anaRes.ok) {
        const data = await anaRes.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.sales_history) setSalesHistory(data.sales_history || []);
        if (data.payment_breakdown) setPaymentBreakdown(data.payment_breakdown || {});
        if (data.top_items) setTopItems(data.top_items || []);
        if (data.reservation_summary) setReservationSummary(data.reservation_summary || {});
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    }

    // 3. Reservations (Protected)
    try {
      const rRes = await fetch(`${apiBase}/api/v1/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rRes.ok) {
        const rData = await rRes.json();
        if (Array.isArray(rData)) {
          setReservations(
            rData.map((r: any) => ({
              id: r.id,
              customer_name: r.customer?.name || "Guest",
              customer_phone: r.customer?.phone || "",
              party_size: r.guest_count || 2,
              booking_date: r.reservation_date || "",
              time_slot: r.time_slot || "",
              status: r.status || "CONFIRMED",
              advance_amount: r.advance_amount || 0,
              payment_status: r.payment_status || "PAID",
              upi_utr: r.upi_utr || "",
              special_requests: r.special_requests || "",
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Reservations fetch error:", err);
    }

    // 4. Tables (Protected)
    try {
      const tRes = await fetch(`${apiBase}/api/v1/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) {
          setTables(
            tData.map((t: any) => ({
              id: t.id,
              table_number: t.table_number,
              capacity: t.capacity,
              qr_token: t.qr_token || `qr_sec_${t.id}`,
              is_active: t.status !== "Maintenance",
              active_session_count: t.status === "Occupied" ? 1 : 0,
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Tables fetch error:", err);
    }

    // 5. KOTs / Ledger (Protected)
    try {
      const kRes = await fetch(`${apiBase}/api/v1/pos/kots`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (kRes.ok) {
        const kData = await kRes.json();
        if (Array.isArray(kData)) setKots(kData);
      }
    } catch (err) {
      console.warn("KOTs fetch error:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [token, fetchMenuData]);

  // Initial menu sync on mount
  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  // Trigger full dashboard fetch when token is ready
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  // Real-time WebSocket connection for live sync + background poll
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      try {
        const apiBase = getApiBase();
        const wsProto = apiBase.startsWith("https") ? "wss" : "ws";
        const wsHost = apiBase.replace(/^https?:\/\//, "");
        ws = new WebSocket(`${wsProto}://${wsHost}/ws/menu`);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "MENU_UPDATED") {
              fetchMenuData();
              showToast(`Live Update: ${data.name || "Menu"} was modified`);
            }
          } catch {}
        };

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWS, 4000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectWS, 6000);
      }
    };

    connectWS();

    // Background polling fallback every 8 seconds for 100% guarantee
    const interval = setInterval(() => {
      if (token) {
        fetchData(true);
      } else {
        fetchMenuData();
      }
    }, 8000);

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [token, fetchData]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.detail || "Invalid owner credentials. Please try again.");
        setIsLoggingIn(false);
        return;
      }

      const data = await res.json();
      setToken(data.access_token);
      localStorage.setItem("jaadoo_admin_token", data.access_token);
    } catch {
      setLoginError("Could not reach backend server. Please verify network connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("jaadoo_admin_token");
  };

  // Update menu item (Price, name, description, availability)
  const handleSaveMenuItem = async (item: MenuItem) => {
    if (!item) return;
    const apiBase = getApiBase();
    setIsSavingItem(true);

    // Optimistic local update for instant UI feedback
    setMenuItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...item, price: Number(item.price) } : i))
    );

    try {
      const res = await fetch(`${apiBase}/api/v1/menu/items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: Number(item.price),
          is_available: Boolean(item.is_available),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setMenuItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, ...updated, price: Number(updated.price) } : i))
        );
        setEditingItem(null);
        showToast(`Saved: ${item.name} is now ₹${item.price} (${item.is_available ? "In Stock" : "86'd"})`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to update item: ${err.detail || res.statusText || "Server error"}`);
        fetchData(true); // Revert on failure
      }
    } catch (e: any) {
      alert(`Network error updating menu item: ${e?.message || e}`);
      fetchData(true);
    } finally {
      setIsSavingItem(false);
    }
  };

  // Toggle Item Availability (86 / In Stock)
  const handleToggleItemAvailability = async (item: MenuItem) => {
    const updated = { ...item, is_available: !item.is_available };
    await handleSaveMenuItem(updated);
  };

  // Create new menu item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/menu/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newItemData.name,
          category_id: Number(newItemData.category_id),
          description: newItemData.description,
          price: Number(newItemData.price),
          tax_rate: 5.0,
          is_available: true,
          is_active: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMenuItems((prev) => [...prev, created]);
        setIsCreatingItem(false);
        setNewItemData({ name: "", category_id: 1, description: "", price: 350 });
        showToast(`Created new item: ${created.name}`);
      } else {
        alert("Failed to create menu item.");
      }
    } catch {
      alert("Failed to create menu item.");
    }
  };

  // Generate and show Table QR
  const handleOpenTableQr = async (tableNumber: string, qrToken: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://cafe-piza.vercel.app";
    const orderUrl = `${origin}/table/${qrToken}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(orderUrl, {
        width: 380,
        margin: 2,
        color: { dark: "#2C1E16", light: "#FFFFFF" },
      });
      setQrModalTable({ number: tableNumber, url: orderUrl, qrDataUrl });
    } catch {
      alert("Could not generate QR code.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!kots.length) {
      alert("No records to export.");
      return;
    }
    const headers = ["KOT Number", "Table", "Status", "Items Count", "Total Amount (INR)", "Date Time"];
    const rows = kots.map((k) => [
      k.kot_number,
      k.table_number,
      k.status,
      k.items_count,
      Number(k.total_amount || 0),
      new Date(k.created_at).toLocaleString("en-IN"),
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jaadoo_sales_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        !menuSearch ||
        item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()));
      const matchesCategory =
        selectedCategoryFilter === "all" || item.category_id === Number(selectedCategoryFilter);
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, menuSearch, selectedCategoryFilter]);

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchesSearch =
        !resSearch ||
        r.customer_name?.toLowerCase().includes(resSearch.toLowerCase()) ||
        r.customer_phone?.includes(resSearch) ||
        r.upi_utr?.toLowerCase().includes(resSearch.toLowerCase());
      const matchesDate = !resDateFilter || r.booking_date === resDateFilter;
      return matchesSearch && matchesDate;
    });
  }, [reservations, resSearch, resDateFilter]);

  // Max value for revenue bar chart
  const maxRevenue = useMemo(() => {
    if (!salesHistory.length) return 1;
    return Math.max(...salesHistory.map((s) => s.revenue), 1000);
  }, [salesHistory]);

  // ---------------------------------------------------------------------------
  // AUTH LOGIN SCREEN - WARM BEIGE ARTISANAL THEME
  // ---------------------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center p-4 font-sans text-[#2A1E17] selection:bg-[#B85B43] selection:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#FFFDF9] border border-[#E4DCD0] rounded-3xl p-8 shadow-xl space-y-6"
        >
          {/* Brand Header with Official Matchbox Logo */}
          <div className="text-center space-y-3">
            <div className="w-44 h-24 sm:w-52 sm:h-28 mx-auto rounded-2xl overflow-hidden border-2 border-[#9E3E26]/40 shadow-lg bg-white">
              <img
                src="/jaadoo_logo.jpg"
                alt="Jaadoo - The Pizza Project"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-extrabold text-[#2A1E17] tracking-tight">
                JAADOO OWNER PORTAL
              </h1>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#B85B43] font-bold mt-0.5">
                Executive Management & Live Control
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B5A4E] block mb-1.5">
                Owner Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl px-4 py-3 text-sm text-[#2A1E17] placeholder-[#A8988B] outline-none transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#6B5A4E] block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl px-4 py-3 pr-11 text-sm text-[#2A1E17] placeholder-[#A8988B] outline-none transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6D] hover:text-[#B85B43] transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#B85B43] hover:bg-[#A34B34] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-[0.2em] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? "AUTHENTICATING..." : "ENTER OWNER DASHBOARD"}
            </button>
          </form>

          {/* Quick links footer */}
          <div className="pt-4 border-t border-[#E8DFC9] flex items-center justify-between text-xs text-[#7A6A5E]">
            <Link href="/pos" className="hover:text-[#B85B43] font-semibold transition-colors flex items-center gap-1">
              <span>Go to POS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/" className="hover:text-[#B85B43] font-semibold transition-colors">
              Public Website
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN OWNER DASHBOARD - LUXURIOUS BEIGE ARTISANAL THEME
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#241A14] font-sans selection:bg-[#B85B43] selection:text-white flex flex-col">
      {/* Toast Notification for Real-Time Changes */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-[#2A1E17] text-[#FAF6F0] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-[#E8AA62]/40"
          >
            <Sparkles className="w-4 h-4 text-[#E8AA62] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="bg-[#FFFDF9] border-b border-[#E6DCce] px-6 py-4 sticky top-0 z-40 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-xl overflow-hidden border-2 border-[#9E3E26]/40 shadow-md bg-white shrink-0">
            <img
              src="/jaadoo_logo.jpg"
              alt="Jaadoo Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-base font-serif font-extrabold tracking-wide text-[#241A14]">
              JAADOO • THE PIZZA PROJECT
            </h1>
            <div className="mt-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-[0.22em] text-[#B85B43]">
                Owner Executive Portal
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#4A392F] px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#B85B43]" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/pos"
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#B85B43]/30 text-[#B85B43] px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Open POS</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Navigation Tabs */}
      <div className="bg-[#F3EDE2] border-b border-[#E4DCD0] px-6 py-2.5 overflow-x-auto flex items-center gap-2">
        {[
          { id: "analytics", label: "Executive Analytics", icon: TrendingUp },
          { id: "menu", label: "Menu & Live Pricing", icon: Utensils },
          { id: "reservations", label: "Reservations CRM", icon: Calendar },
          { id: "tables", label: "Tables & QR Generator", icon: QrCode },
          { id: "ledger", label: "KOT & Billing Ledger", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#B85B43] text-white shadow-sm"
                  : "text-[#665448] hover:text-[#241A14] hover:bg-[#EBE2D4]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: EXECUTIVE ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Primary KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Today's Sales */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>Today&apos;s Revenue</span>
                  <DollarSign className="w-4 h-4 text-[#B85B43]" />
                </div>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(metrics?.today_sales || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2 flex items-center justify-between">
                  <span>Yesterday: ₹{Number(metrics?.yesterday_sales || 0).toLocaleString("en-IN")}</span>
                  <span className="text-[#B85B43] font-bold">{metrics?.today_kots_count || 0} KOTs</span>
                </div>
              </div>

              {/* Card 2: 7-Day Revenue */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>Last 7 Days</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(metrics?.week_sales || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2">
                  <span>Rolling weekly revenue</span>
                </div>
              </div>

              {/* Card 3: 30-Day Monthly Revenue */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>Monthly Sales (30D)</span>
                  <Calendar className="w-4 h-4 text-[#B85B43]" />
                </div>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(metrics?.month_sales || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2">
                  <span>Avg Ticket: ₹{Math.round(metrics?.avg_ticket_value || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Card 4: Total Lifetime Revenue */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>All-Time Sales</span>
                  <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(metrics?.total_revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2 flex items-center justify-between">
                  <span>{metrics?.total_kots || 0} Total Orders</span>
                  <span>{metrics?.total_tables || 12} Tables</span>
                </div>
              </div>
            </div>

            {/* 14-Day Sales Trend Bar Chart */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-[#241A14]">
                    Daily Sales History (Last 14 Days)
                  </h3>
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Day-by-day revenue progression and customer ticket counts
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#B85B43] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Bar visualization */}
              <div className="pt-6 pb-2 grid grid-cols-14 gap-2 items-end h-52 border-b border-[#E6DCCF]">
                {salesHistory.map((item, idx) => {
                  const heightPercent = Math.max((item.revenue / maxRevenue) * 100, 4);
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#241A14] text-white text-[10px] px-2.5 py-1 rounded-md border border-[#B85B43] pointer-events-none whitespace-nowrap z-20 shadow-lg font-mono">
                        ₹{item.revenue.toLocaleString("en-IN")} ({item.kots} orders)
                      </div>

                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-[#B85B43] to-[#D97736] rounded-t-sm group-hover:brightness-110 transition-all"
                      />
                      <span className="text-[9px] font-mono text-[#8C7A6D] rotate-[-45deg] origin-top-left mt-2 font-medium">
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two-Column Grid: Payment Breakdown & Top Selling Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-[#241A14] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#B85B43]" />
                  <span>Payment Method Distribution</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E6DCCF] text-center space-y-1">
                    <Smartphone className="w-5 h-5 text-indigo-600 mx-auto" />
                    <div className="text-xs uppercase font-bold text-[#7A6A5E]">UPI Payments</div>
                    <div className="text-lg font-extrabold text-[#241A14]">
                      ₹{Number(paymentBreakdown.UPI || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E6DCCF] text-center space-y-1">
                    <Banknote className="w-5 h-5 text-emerald-600 mx-auto" />
                    <div className="text-xs uppercase font-bold text-[#7A6A5E]">Cash Register</div>
                    <div className="text-lg font-extrabold text-[#241A14]">
                      ₹{Number(paymentBreakdown.CASH || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E6DCCF] text-center space-y-1">
                    <CreditCard className="w-5 h-5 text-amber-600 mx-auto" />
                    <div className="text-xs uppercase font-bold text-[#7A6A5E]">Card Terminal</div>
                    <div className="text-lg font-extrabold text-[#241A14]">
                      ₹{Number(paymentBreakdown.CARD || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Selling Menu Items */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-[#241A14] flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#B85B43]" />
                  <span>Top Performing Menu Items</span>
                </h3>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {topItems.length > 0 ? (
                    topItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#FAF6EE] p-3 rounded-xl border border-[#E6DCCF] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#E8DFC9] text-[#B85B43] font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-[#241A14]">{item.name}</span>
                            <span className="text-[10px] text-[#7A6A5E] block">{item.quantity} units ordered</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-[#241A14]">₹{item.revenue.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-[#7A6A5E] block">₹{item.price} each</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#8C7A6D] text-center py-6">
                      No order items recorded yet for product performance ranking.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MENU & LIVE PRICING MANAGEMENT */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#241A14]">Menu & Live Pricing Control</h2>
                <p className="text-xs text-[#7A6A5E]">
                  Changes to prices and stock status instantly sync across the public website, digital menu, POS, and QR tables in real time.
                </p>
              </div>

              <button
                onClick={() => setIsCreatingItem(true)}
                className="inline-flex items-center gap-2 bg-[#B85B43] hover:bg-[#A34B34] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Item</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6D]" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search item name or ingredient..."
                  className="w-full bg-[#FAF6EE] border border-[#E0D4C2] focus:border-[#B85B43] focus:bg-white rounded-xl pl-10 pr-4 py-2 text-xs text-[#241A14] placeholder-[#A8988B] outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategoryFilter === "all"
                      ? "bg-[#241A14] text-white"
                      : "bg-[#FAF6EE] border border-[#E0D4C2] text-[#665448] hover:bg-[#F0E8DA]"
                  }`}
                >
                  All Categories ({menuItems.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategoryFilter === c.id
                        ? "bg-[#241A14] text-white"
                        : "bg-[#FAF6EE] border border-[#E0D4C2] text-[#665448] hover:bg-[#F0E8DA]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                    <tr>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Price (₹)</th>
                      <th className="p-4">Stock Status (Live)</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DC]">
                    {filteredMenuItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-[#8C7A6D]">
                          <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#B85B43]" />
                          <p className="font-semibold text-sm text-[#4A392F]">No menu items matching your filter</p>
                          <p className="text-[11px] text-[#A8988B] mt-1">Try adjusting your search query or selecting &quot;All Categories&quot;</p>
                        </td>
                      </tr>
                    ) : (
                      filteredMenuItems.map((item) => {
                        const category = categories.find((c) => c.id === item.category_id);
                        return (
                          <tr key={item.id} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="p-4 font-bold text-[#241A14]">{item.name}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-md bg-[#FAF0E1] text-[10px] text-[#B85B43] font-bold uppercase tracking-wider">
                                {category?.name || "General"}
                              </span>
                            </td>
                            <td className="p-4 text-[#665448] max-w-xs truncate">{item.description || "—"}</td>
                            <td className="p-4 font-extrabold text-[#B85B43] text-sm">₹{item.price}</td>
                            <td className="p-4">
                              <button
                                onClick={() => handleToggleItemAvailability(item)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                                  item.is_available
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                                    : "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    item.is_available ? "bg-emerald-600" : "bg-rose-600"
                                  }`}
                                />
                                <span>{item.is_available ? "In Stock (Available)" : "86'd (Sold Out)"}</span>
                              </button>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="inline-flex items-center gap-1 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#241A14] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#B85B43]" />
                                <span>Edit Rate</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESERVATIONS CRM */}
        {activeTab === "reservations" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#241A14]">Master Reservations Ledger</h2>
                <p className="text-xs text-[#7A6A5E]">
                  View upcoming table bookings, advance deposits, and customer details
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A6D]" />
                  <input
                    type="text"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Search name, phone, UTR..."
                    className="bg-[#FFFDF9] border border-[#E0D4C2] focus:border-[#B85B43] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#241A14] placeholder-[#A8988B] outline-none"
                  />
                </div>

                <input
                  type="date"
                  value={resDateFilter}
                  onChange={(e) => setResDateFilter(e.target.value)}
                  className="bg-[#FFFDF9] border border-[#E0D4C2] rounded-xl px-3 py-1.5 text-xs text-[#241A14] outline-none"
                />
              </div>
            </div>

            {/* Reservations Table */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                    <tr>
                      <th className="p-4">Booking ID</th>
                      <th className="p-4">Guest Name</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Party Size</th>
                      <th className="p-4">Date & Slot</th>
                      <th className="p-4">Deposit Status</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DC]">
                    {filteredReservations.length > 0 ? (
                      filteredReservations.map((r) => (
                        <tr key={r.id} className="hover:bg-[#FAF7F0] transition-colors">
                          <td className="p-4 font-mono font-bold text-[#B85B43]">#{r.id}</td>
                          <td className="p-4 font-bold text-[#241A14]">{r.customer_name}</td>
                          <td className="p-4 text-[#665448] font-mono">{r.customer_phone}</td>
                          <td className="p-4 text-[#665448] font-semibold">{r.party_size} Guests</td>
                          <td className="p-4 text-[#665448]">
                            {r.booking_date} ({r.time_slot})
                          </td>
                          <td className="p-4">
                            <span className="text-emerald-700 font-bold">
                              ₹{Number(r.advance_amount || 0)} ({r.payment_status})
                            </span>
                            {r.upi_utr && (
                              <span className="block text-[10px] text-[#8C7A6D] font-mono">UTR: {r.upi_utr}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                r.status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : r.status === "ARRIVED"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : r.status === "SEATED"
                                  ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                                  : "bg-stone-100 text-stone-700 border border-stone-300"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#8C7A6D]">
                          No reservations matching search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TABLES & QR CODE HUB */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#241A14]">Table Fleet & QR Generation Hub</h2>
                <p className="text-xs text-[#7A6A5E]">
                  Instant access to high-resolution printable table cards and tabletop self-ordering links
                </p>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm space-y-4 hover:border-[#B85B43] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-serif font-bold text-[#241A14]">
                      Table #{tbl.table_number}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAF0E1] text-[#B85B43] font-mono text-[10px] font-bold">
                      {tbl.capacity} Seats
                    </span>
                  </div>

                  <div className="p-3 bg-[#FAF7F0] rounded-xl border border-[#E8DFC9] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#8C7A6D] block">QR Token:</span>
                    <span className="text-xs font-mono text-[#4A392F] truncate block font-semibold">
                      {tbl.qr_token}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#F0E8DC]">
                    <button
                      onClick={() => handleOpenTableQr(tbl.table_number, tbl.qr_token)}
                      className="flex-1 bg-[#B85B43] hover:bg-[#A34B34] text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View Printable QR</span>
                    </button>

                    <Link
                      href={`/table/${tbl.qr_token}`}
                      target="_blank"
                      className="bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#4A392F] p-2 rounded-xl transition-colors"
                      title="Test Tabletop Ordering"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: KOT & BILLING LEDGER */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#241A14]">Operational & Sales Ledger</h2>
                <p className="text-xs text-[#7A6A5E]">
                  Full audit trail of all kitchen tickets, orders, and settlements
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#B85B43] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Ledger CSV</span>
              </button>
            </div>

            {/* KOTs Table */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                    <tr>
                      <th className="p-4">KOT Number</th>
                      <th className="p-4">Table</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Print Status</th>
                      <th className="p-4">Items</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DC]">
                    {kots.length > 0 ? (
                      kots.map((k) => (
                        <tr key={k.id} className="hover:bg-[#FAF7F0] transition-colors">
                          <td className="p-4 font-bold font-mono text-[#241A14]">{k.kot_number}</td>
                          <td className="p-4 font-bold text-[#B85B43]">Table #{k.table_number}</td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                k.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {k.status}
                            </span>
                          </td>
                          <td className="p-4 text-[#665448] font-mono text-[11px]">{k.printed_status}</td>
                          <td className="p-4 text-[#665448] font-semibold">{k.items_count} items</td>
                          <td className="p-4 font-extrabold text-[#241A14]">
                            ₹{Number(k.total_amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-4 text-[#8C7A6D] font-mono text-[11px]">
                            {new Date(k.created_at).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#8C7A6D]">
                          No KOT tickets recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EDIT MENU ITEM (PRICE & AVAILABILITY) */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveMenuItem(editingItem);
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#FFFDF9] border border-[#E6DCCF] rounded-3xl p-6 shadow-2xl space-y-4 text-[#241A14]"
            >
              <div className="flex items-center justify-between border-b border-[#F0E8DC] pb-3">
                <h3 className="text-base font-serif font-bold text-[#241A14]">Edit Menu Item & Rate</h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-[#8C7A6D] hover:text-[#241A14] text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-[#665448] block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingItem.description || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    step="1"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] font-bold text-base outline-none"
                  />
                </div>

                <div className="pt-2">
                  <label className="font-bold text-[#665448] block mb-1.5">Availability Status</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, is_available: true })}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        editingItem.is_available
                          ? "bg-emerald-100 text-emerald-800 border-emerald-400 shadow-2xs"
                          : "bg-[#FAF7F0] text-[#7A6A5E] border-[#E2D6C5]"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>In Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, is_available: false })}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        !editingItem.is_available
                          ? "bg-rose-100 text-rose-800 border-rose-400 shadow-2xs"
                          : "bg-[#FAF7F0] text-[#7A6A5E] border-[#E2D6C5]"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      <span>86'd (Sold Out)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E8DC]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E8DA] text-[#665448] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-6 py-2.5 rounded-xl bg-[#B85B43] hover:bg-[#A34B34] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-md flex items-center gap-2"
                >
                  {isSavingItem ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE MENU ITEM */}
      <AnimatePresence>
        {isCreatingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.form
              onSubmit={handleCreateMenuItem}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#FFFDF9] border border-[#E6DCCF] rounded-3xl p-6 shadow-2xl space-y-4 text-[#241A14]"
            >
              <div className="flex items-center justify-between border-b border-[#F0E8DC] pb-3">
                <h3 className="text-base font-serif font-bold text-[#241A14]">Add New Menu Item</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(false)}
                  className="text-[#8C7A6D] hover:text-[#241A14] text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#665448] block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                    placeholder="e.g. Quattro Formaggi Pizza"
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Category</label>
                  <select
                    value={newItemData.category_id}
                    onChange={(e) => setNewItemData({ ...newItemData, category_id: Number(e.target.value) })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] outline-none font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newItemData.description}
                    onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                    placeholder="Artisanal sourdough crust, fresh mozzarella, gorgonzola..."
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={newItemData.price}
                    onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] font-bold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E8DC]">
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E8DA] text-[#665448] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#B85B43] hover:bg-[#A34B34] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Create Item
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PRINTABLE TABLE QR CODE */}
      <AnimatePresence>
        {qrModalTable && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#FFFDF9] text-[#241A14] rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-[#E6DCCF]"
            >
              <div className="border-b border-[#F0E8DC] pb-3 flex flex-col items-center">
                <div className="w-28 h-16 rounded-xl overflow-hidden border-2 border-[#9E3E26]/40 shadow-md mb-2.5 bg-white">
                  <img
                    src="/jaadoo_logo.jpg"
                    alt="Jaadoo Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-xl font-serif font-extrabold uppercase tracking-wider text-[#241A14]">
                  Table #{qrModalTable.number}
                </h3>
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#B85B43] mt-0.5">
                  JAADOO • THE PIZZA PROJECT
                </p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-white rounded-2xl border border-[#E6DCCF] flex justify-center shadow-inner">
                <img src={qrModalTable.qrDataUrl} alt={`QR Table ${qrModalTable.number}`} className="w-56 h-56 rounded-lg" />
              </div>

              <p className="text-xs text-[#665448] font-sans">
                Scan with phone camera to browse the artisanal menu and order directly from your table.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.write(`
                        <html>
                          <head>
                            <title>Table #${qrModalTable.number} - QR Card</title>
                            <style>
                              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; background: #FAF7F0; color: #241A14; }
                              .card { background: #fff; padding: 24px; border-radius: 16px; border: 2px solid #E2D6C5; max-width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                              h1 { margin: 0 0 4px 0; font-size: 26px; font-weight: 800; }
                              p { color: #B85B43; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px 0; }
                              img { width: 280px; height: 280px; border-radius: 12px; }
                              .foot { margin-top: 16px; font-size: 11px; color: #776; font-weight: 500; }
                            </style>
                          </head>
                          <body onload="window.print()">
                            <div class="card">
                              <h1>TABLE #${qrModalTable.number}</h1>
                              <p>JAADOO • THE PIZZA PROJECT</p>
                              <img src="${qrModalTable.qrDataUrl}" />
                              <div class="foot">Scan to Order • 32 Sitaphal ki gali, Ganesh Ghati, Udaipur</div>
                            </div>
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }
                  }}
                  className="flex-1 bg-[#B85B43] hover:bg-[#A34B34] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  Print Card
                </button>

                <button
                  onClick={() => setQrModalTable(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#4A392F] text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
