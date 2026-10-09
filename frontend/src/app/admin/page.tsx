"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

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

  // Menu Data
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({ name: "", category_id: 1, description: "", price: 350 });

  // Reservations Data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resSearch, setResSearch] = useState("");
  const [resDateFilter, setResDateFilter] = useState("");

  // Tables Data
  const [tables, setTables] = useState<TableOverview[]>([]);
  const [qrModalTable, setQrModalTable] = useState<{ number: string; url: string; qrDataUrl: string } | null>(null);

  // Ledger / KOTs Data
  const [kots, setKots] = useState<KOTRecord[]>([]);

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

  // Fetch all dashboard data
  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    const apiBase = getApiBase();

    try {
      // 1. Analytics Dashboard
      const anaRes = await fetch(`${apiBase}/api/v1/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (anaRes.ok) {
        const data = await anaRes.json();
        setMetrics(data.metrics);
        setSalesHistory(data.sales_history || []);
        setPaymentBreakdown(data.payment_breakdown || {});
        setTopItems(data.top_items || []);
        setReservationSummary(data.reservation_summary || {});
      }

      // 2. Menu Items & Categories
      const [catRes, itemRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/menu/categories`),
        fetch(`${apiBase}/api/v1/menu/items`),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (itemRes.ok) setMenuItems(await itemRes.json());

      // 3. Reservations
      const rRes = await fetch(`${apiBase}/api/v1/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (rRes.ok) setReservations(await rRes.json());

      // 4. Tables
      const tRes = await fetch(`${apiBase}/api/v1/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) {
        const tData = await tRes.json();
        setTables(
          tData.map((t: any) => ({
            id: t.id,
            table_number: t.table_number,
            capacity: t.capacity,
            qr_token: t.qr_token || `qr_sec_${t.id}`,
            is_active: t.is_active,
            active_session_count: 0,
          }))
        );
      }

      // 5. KOTs / Ledger
      const kRes = await fetch(`${apiBase}/api/v1/pos/kots/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (kRes.ok) setKots(await kRes.json());
    } catch (err) {
      console.error("Admin data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

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

  // Update menu item
  const handleSaveMenuItem = async (item: MenuItem) => {
    const apiBase = getApiBase();
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
          is_available: item.is_available,
        }),
      });
      if (res.ok) {
        setMenuItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
        setEditingItem(null);
      }
    } catch {
      alert("Failed to update menu item.");
    }
  };

  // Toggle Item Availability (86)
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
        color: { dark: "#1C140E", light: "#FFFFFF" },
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
  // AUTH LOGIN MODAL SCREEN
  // ---------------------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-[#140E0A] flex items-center justify-center p-4 font-sans text-stone-100 selection:bg-[#B85B43] selection:text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#1F1712] border border-[#3A2A20] rounded-2xl p-8 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#2E2018] border border-[#E8AA62]/40 text-[#E8AA62] flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-100 tracking-wide">
              JAADOO OWNER PORTAL
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E8AA62] font-semibold">
              Executive Management & Analytics
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                Admin Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-xl px-4 py-3 pr-11 text-sm text-stone-100 placeholder-stone-600 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#E8AA62] transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#B85B43] hover:bg-[#C86A52] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? "AUTHENTICATING..." : "ENTER OWNER DASHBOARD"}
            </button>
          </form>

          {/* Quick links footer */}
          <div className="pt-4 border-t border-[#3A2A20]/60 flex items-center justify-between text-xs text-stone-400">
            <Link href="/pos" className="hover:text-[#E8AA62] transition-colors flex items-center gap-1">
              <span>Go to POS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/" className="hover:text-[#E8AA62] transition-colors">
              Public Website
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN OWNER DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#120D0A] text-stone-100 font-sans selection:bg-[#B85B43] selection:text-white flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-[#1C140E] border-b border-[#3A2A20] px-6 py-4 sticky top-0 z-40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#2E2018] border border-[#E8AA62]/50 text-[#E8AA62] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-serif font-bold tracking-wide text-stone-100">
              JAADOO • THE PIZZA PROJECT
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#E8AA62]">
              Owner Management & Analytics Portal
            </p>
          </div>
        </div>

        {/* Global Action Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-[#2E2018] hover:bg-[#3D2C22] text-stone-300 hover:text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#E8AA62]" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/pos"
            target="_blank"
            className="inline-flex items-center gap-1.5 bg-[#2E2018] hover:bg-[#3D2C22] text-[#E8AA62] px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#E8AA62]/30 transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Open POS</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
          </Link>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Tabs */}
      <div className="bg-[#18110C] border-b border-[#3A2A20] px-6 py-2 overflow-x-auto flex items-center gap-2">
        {[
          { id: "analytics", label: "Executive Analytics", icon: TrendingUp },
          { id: "menu", label: "Menu & Pricing", icon: Utensils },
          { id: "reservations", label: "Reservations CRM", icon: Calendar },
          { id: "tables", label: "Tables & QR Codes", icon: QrCode },
          { id: "ledger", label: "KOT & Billing Ledger", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#B85B43] text-white shadow-md"
                  : "text-stone-400 hover:text-stone-200 hover:bg-[#251A13]"
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
              <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                  <span>Today&apos;s Revenue</span>
                  <DollarSign className="w-4 h-4 text-[#E8AA62]" />
                </div>
                <div className="text-3xl font-bold font-sans text-white mt-2">
                  ₹{Number(metrics?.today_sales || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
                  <span>Yesterday: ₹{Number(metrics?.yesterday_sales || 0).toLocaleString("en-IN")}</span>
                  <span className="text-[#E8AA62] font-semibold">{metrics?.today_kots_count || 0} KOTs</span>
                </div>
              </div>

              {/* Card 2: 7-Day Revenue */}
              <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                  <span>Last 7 Days</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold font-sans text-white mt-2">
                  ₹{Number(metrics?.week_sales || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-stone-400 mt-2">
                  <span>Rolling weekly revenue</span>
                </div>
              </div>

              {/* Card 3: 30-Day Monthly Revenue */}
              <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                  <span>Monthly Sales (30D)</span>
                  <Calendar className="w-4 h-4 text-[#E8AA62]" />
                </div>
                <div className="text-3xl font-bold font-sans text-white mt-2">
                  ₹{Number(metrics?.month_sales || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-stone-400 mt-2">
                  <span>Avg Ticket: ₹{Math.round(metrics?.avg_ticket_value || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Card 4: Total Lifetime Revenue */}
              <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-stone-400 font-semibold uppercase tracking-wider">
                  <span>All-Time Sales</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold font-sans text-white mt-2">
                  ₹{Number(metrics?.total_revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-stone-400 mt-2 flex items-center justify-between">
                  <span>{metrics?.total_kots || 0} Total Orders</span>
                  <span>{metrics?.total_tables || 12} Tables</span>
                </div>
              </div>
            </div>

            {/* 14-Day Sales Trend Bar Chart */}
            <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-stone-200">
                    Daily Sales History (Last 14 Days)
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Day-by-day revenue progression and customer ticket counts
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 bg-[#2E2018] hover:bg-[#3D2C22] text-[#E8AA62] border border-[#E8AA62]/40 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Bar visualization */}
              <div className="pt-6 pb-2 grid grid-cols-14 gap-2 items-end h-52 border-b border-[#3A2A20]">
                {salesHistory.map((item, idx) => {
                  const heightPercent = Math.max((item.revenue / maxRevenue) * 100, 4);
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-[10px] px-2 py-1 rounded-md border border-[#E8AA62]/40 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                        ₹{item.revenue.toLocaleString("en-IN")} ({item.kots} orders)
                      </div>

                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-[#B85B43] to-[#DE9B52] rounded-t-sm group-hover:brightness-125 transition-all"
                      />
                      <span className="text-[9px] font-mono text-stone-400 rotate-[-45deg] origin-top-left mt-2">
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
              <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-stone-200 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#E8AA62]" />
                  <span>Payment Method Distribution</span>
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#261B14] p-4 rounded-lg border border-[#3A2A20] text-center space-y-1">
                    <Smartphone className="w-5 h-5 text-indigo-400 mx-auto" />
                    <div className="text-xs uppercase font-semibold text-stone-400">UPI Payments</div>
                    <div className="text-lg font-bold text-white">
                      ₹{Number(paymentBreakdown.UPI || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="bg-[#261B14] p-4 rounded-lg border border-[#3A2A20] text-center space-y-1">
                    <Banknote className="w-5 h-5 text-emerald-400 mx-auto" />
                    <div className="text-xs uppercase font-semibold text-stone-400">Cash Register</div>
                    <div className="text-lg font-bold text-white">
                      ₹{Number(paymentBreakdown.CASH || 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="bg-[#261B14] p-4 rounded-lg border border-[#3A2A20] text-center space-y-1">
                    <CreditCard className="w-5 h-5 text-amber-400 mx-auto" />
                    <div className="text-xs uppercase font-semibold text-stone-400">Card Terminal</div>
                    <div className="text-lg font-bold text-white">
                      ₹{Number(paymentBreakdown.CARD || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Selling Menu Items */}
              <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-stone-200 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#E8AA62]" />
                  <span>Top Performing Menu Items</span>
                </h3>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {topItems.length > 0 ? (
                    topItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#261B14] p-3 rounded-lg border border-[#3A2A20] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#3A2A20] text-[#E8AA62] font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-stone-100">{item.name}</span>
                            <span className="text-[10px] text-stone-400 block">{item.quantity} units ordered</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white">₹{item.revenue.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-stone-400 block">₹{item.price} each</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-500 text-center py-6">
                      No order items recorded yet for product performance ranking.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MENU & PRICING MANAGEMENT */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Menu & Live Pricing Control</h2>
                <p className="text-xs text-stone-400">
                  Instantly edit prices, toggle item availability (86), or create new seasonal specials
                </p>
              </div>

              <button
                onClick={() => setIsCreatingItem(true)}
                className="inline-flex items-center gap-2 bg-[#B85B43] hover:bg-[#C86A52] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Item</span>
              </button>
            </div>

            {/* Menu Items Table */}
            <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2E2018] text-stone-300 uppercase tracking-wider font-semibold border-b border-[#3A2A20]">
                    <tr>
                      <th className="p-3.5">Item Name</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Price (₹)</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E2018]">
                    {menuItems.map((item) => {
                      const category = categories.find((c) => c.id === item.category_id);
                      return (
                        <tr key={item.id} className="hover:bg-[#251A13] transition-colors">
                          <td className="p-3.5 font-bold text-stone-100">{item.name}</td>
                          <td className="p-3.5 text-stone-400">
                            <span className="px-2 py-0.5 rounded bg-[#2E2018] text-[10px] text-[#E8AA62] font-medium">
                              {category?.name || "General"}
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-400 max-w-xs truncate">{item.description || "—"}</td>
                          <td className="p-3.5 font-bold text-[#DE9B52]">₹{item.price}</td>
                          <td className="p-3.5">
                            <button
                              onClick={() => handleToggleItemAvailability(item)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                item.is_available
                                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900"
                                  : "bg-rose-950/80 text-rose-300 border border-rose-800/60 hover:bg-rose-900"
                              }`}
                            >
                              {item.is_available ? "In Stock" : "86'd (Sold Out)"}
                            </button>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="inline-flex items-center gap-1 text-stone-300 hover:text-[#E8AA62] text-xs font-semibold p-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
                <h2 className="text-lg font-serif font-bold text-white">Master Reservations Ledger</h2>
                <p className="text-xs text-stone-400">
                  View upcoming table bookings, advance deposits, and customer details
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Search name, phone, UTR..."
                    className="bg-[#1C140E] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 outline-none"
                  />
                </div>

                <input
                  type="date"
                  value={resDateFilter}
                  onChange={(e) => setResDateFilter(e.target.value)}
                  className="bg-[#1C140E] border border-[#3A2A20] rounded-lg px-3 py-1.5 text-xs text-stone-100 outline-none"
                />
              </div>
            </div>

            {/* Reservations Table */}
            <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2E2018] text-stone-300 uppercase tracking-wider font-semibold border-b border-[#3A2A20]">
                    <tr>
                      <th className="p-3.5">Booking ID</th>
                      <th className="p-3.5">Guest Name</th>
                      <th className="p-3.5">Phone</th>
                      <th className="p-3.5">Party Size</th>
                      <th className="p-3.5">Date & Slot</th>
                      <th className="p-3.5">Deposit Status</th>
                      <th className="p-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E2018]">
                    {filteredReservations.length > 0 ? (
                      filteredReservations.map((r) => (
                        <tr key={r.id} className="hover:bg-[#251A13] transition-colors">
                          <td className="p-3.5 font-mono text-[#E8AA62]">#{r.id}</td>
                          <td className="p-3.5 font-bold text-stone-100">{r.customer_name}</td>
                          <td className="p-3.5 text-stone-400 font-mono">{r.customer_phone}</td>
                          <td className="p-3.5 text-stone-300">{r.party_size} Guests</td>
                          <td className="p-3.5 text-stone-300">
                            {r.booking_date} ({r.time_slot})
                          </td>
                          <td className="p-3.5">
                            <span className="text-emerald-400 font-semibold">
                              ₹{Number(r.advance_amount || 0)} ({r.payment_status})
                            </span>
                            {r.upi_utr && (
                              <span className="block text-[10px] text-stone-500 font-mono">UTR: {r.upi_utr}</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.status === "CONFIRMED"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50"
                                  : r.status === "ARRIVED"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800/50"
                                  : r.status === "SEATED"
                                  ? "bg-indigo-950 text-indigo-300 border border-indigo-800/50"
                                  : "bg-stone-900 text-stone-400"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-500">
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
                <h2 className="text-lg font-serif font-bold text-white">Table Fleet & QR Generation Hub</h2>
                <p className="text-xs text-stone-400">
                  Instant access to high-resolution printable table cards and tabletop self-ordering links
                </p>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((tbl) => (
                <div
                  key={tbl.id}
                  className="bg-[#1C140E] border border-[#3A2A20] rounded-xl p-5 shadow-lg space-y-4 hover:border-[#E8AA62]/60 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-serif font-bold text-stone-100">
                      Table #{tbl.table_number}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#2E2018] text-[#E8AA62] font-mono text-[10px] font-semibold">
                      {tbl.capacity} Seats
                    </span>
                  </div>

                  <div className="p-3 bg-[#120D0A] rounded-lg border border-[#2E2018] space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-stone-500 block">QR Token:</span>
                    <span className="text-xs font-mono text-stone-300 truncate block">
                      {tbl.qr_token}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#3A2A20]">
                    <button
                      onClick={() => handleOpenTableQr(tbl.table_number, tbl.qr_token)}
                      className="flex-1 bg-[#B85B43] hover:bg-[#C86A52] text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>View Printable QR</span>
                    </button>

                    <Link
                      href={`/table/${tbl.qr_token}`}
                      target="_blank"
                      className="bg-[#2E2018] hover:bg-[#3D2C22] text-stone-300 p-2 rounded-lg transition-colors"
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
                <h2 className="text-lg font-serif font-bold text-white">Operational & Sales Ledger</h2>
                <p className="text-xs text-stone-400">
                  Full audit trail of all kitchen tickets, orders, and settlements
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 bg-[#2E2018] hover:bg-[#3D2C22] text-[#E8AA62] border border-[#E8AA62]/40 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Ledger CSV</span>
              </button>
            </div>

            {/* KOTs Table */}
            <div className="bg-[#1C140E] border border-[#3A2A20] rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#2E2018] text-stone-300 uppercase tracking-wider font-semibold border-b border-[#3A2A20]">
                    <tr>
                      <th className="p-3.5">KOT Number</th>
                      <th className="p-3.5">Table</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Print Status</th>
                      <th className="p-3.5">Items</th>
                      <th className="p-3.5">Total Amount</th>
                      <th className="p-3.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2E2018]">
                    {kots.length > 0 ? (
                      kots.map((k) => (
                        <tr key={k.id} className="hover:bg-[#251A13] transition-colors">
                          <td className="p-3.5 font-bold font-mono text-stone-100">{k.kot_number}</td>
                          <td className="p-3.5 font-semibold text-[#E8AA62]">Table #{k.table_number}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                k.status === "COMPLETED"
                                  ? "bg-emerald-950 text-emerald-300"
                                  : "bg-amber-950 text-amber-300"
                              }`}
                            >
                              {k.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-400 font-mono text-[11px]">{k.printed_status}</td>
                          <td className="p-3.5 text-stone-300">{k.items_count} items</td>
                          <td className="p-3.5 font-bold text-white">
                            ₹{Number(k.total_amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="p-3.5 text-stone-400 font-mono text-[11px]">
                            {new Date(k.created_at).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-500">
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

      {/* MODAL: EDIT MENU ITEM */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#1F1712] border border-[#3A2A20] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#3A2A20] pb-3">
                <h3 className="text-base font-serif font-bold text-white">Edit Menu Item</h3>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-stone-400 hover:text-white text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Item Name</label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingItem.description || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    value={editingItem.price}
                    onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3A2A20]">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg bg-[#2E2018] hover:bg-[#3D2C22] text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMenuItem(editingItem)}
                  className="px-5 py-2 rounded-lg bg-[#B85B43] hover:bg-[#C86A52] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE MENU ITEM */}
      <AnimatePresence>
        {isCreatingItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.form
              onSubmit={handleCreateMenuItem}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#1F1712] border border-[#3A2A20] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#3A2A20] pb-3">
                <h3 className="text-base font-serif font-bold text-white">Add New Menu Item</h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(false)}
                  className="text-stone-400 hover:text-white text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                    placeholder="e.g. Quattro Formaggi Pizza"
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Category</label>
                  <select
                    value={newItemData.category_id}
                    onChange={(e) => setNewItemData({ ...newItemData, category_id: Number(e.target.value) })}
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newItemData.description}
                    onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                    placeholder="Artisanal sourdough crust, fresh mozzarella, gorgonzola..."
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-stone-400 block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={newItemData.price}
                    onChange={(e) => setNewItemData({ ...newItemData, price: Number(e.target.value) })}
                    className="w-full bg-[#120D0A] border border-[#3A2A20] focus:border-[#E8AA62] rounded-lg p-2.5 text-stone-100 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3A2A20]">
                <button
                  type="button"
                  onClick={() => setIsCreatingItem(false)}
                  className="px-4 py-2 rounded-lg bg-[#2E2018] hover:bg-[#3D2C22] text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#B85B43] hover:bg-[#C86A52] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
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
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white text-[#1C140E] rounded-2xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="border-b border-stone-200 pb-3">
                <h3 className="text-xl font-serif font-bold uppercase tracking-wider text-[#1C140E]">
                  Table #{qrModalTable.number}
                </h3>
                <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#B85B43]">
                  JAADOO • THE PIZZA PROJECT
                </p>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-center">
                <img src={qrModalTable.qrDataUrl} alt={`QR Table ${qrModalTable.number}`} className="w-56 h-56 rounded-lg" />
              </div>

              <p className="text-xs text-stone-600 font-sans">
                Scan to browse the 100% vegetarian artisanal menu and place orders directly from your table.
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
                              body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
                              h1 { margin: 0 0 4px 0; font-size: 28px; }
                              p { color: #8F351F; font-size: 14px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px 0; }
                              img { width: 320px; height: 320px; border: 2px solid #ddd; border-radius: 12px; }
                              .foot { margin-top: 16px; font-size: 12px; color: #666; }
                            </style>
                          </head>
                          <body onload="window.print()">
                            <h1>TABLE #${qrModalTable.number}</h1>
                            <p>JAADOO • THE PIZZA PROJECT</p>
                            <img src="${qrModalTable.qrDataUrl}" />
                            <div class="foot">Scan with phone camera to order • 32 Sitaphal ki gali, Ganesh Ghati, Udaipur</div>
                          </body>
                        </html>
                      `);
                      win.document.close();
                    }
                  }}
                  className="flex-1 bg-[#1C140E] hover:bg-[#2E2018] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Print Card
                </button>

                <button
                  onClick={() => setQrModalTable(null)}
                  className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
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
