"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  IndianRupee,
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
  Users,
  Receipt,
  RotateCw,
  SlidersHorizontal,
  AlertTriangle,
  UtensilsCrossed,
  Flame,
  CheckCircle2,
  ChevronDown,
  Package,
  FolderPlus,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { menuData, MENU_ITEM_ID_MAP } from "@/data/menu";
import { RESTAURANT_FLOORS, RESTAURANT_TABLES, getTableFloor, getFloorName } from "@/data/floors";
import { formatBookingId } from "@/lib/bookingId";
import { adminSession } from "@/lib/authFetch";

const {
  fetch: adminFetch,
  tokenKey: ADMIN_TOKEN_KEY,
  refreshKey: ADMIN_REFRESH_KEY,
  expiredEvent: ADMIN_SESSION_EXPIRED,
  refreshedEvent: ADMIN_TOKEN_REFRESHED,
} = adminSession;

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

interface RawMaterial {
  id: number;
  sku: string;
  name: string;
  unit_of_measure: string;
  current_stock: string;
  reorder_threshold: string;
}

interface MenuCategory {
  id: number;
  name: string;
  display_order?: number;
  is_active?: boolean;
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
  booking_id?: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  booking_date: string;
  reservation_date?: string;
  guest_count?: number;
  customer?: { name?: string; phone?: string; email?: string };
  time_slot: string;
  status: string;
  advance_amount: number | string;
  payment_status: string;
  upi_utr?: string;
  special_requests?: string;
  floor_number?: number;
  floor_name?: string;
  table_id?: number;
  table_name?: string;
  is_historical_limited?: boolean;
  cancellation_refund_amount?: number | string;
  cancellation_refund_status?: string;
}

interface TableOverview {
  id: number;
  table_number: string;
  capacity: number;
  qr_token: string;
  is_active: boolean;
  is_occupied?: boolean;
  active_session_count: number;
  floor_number?: number;
  floor_name?: string;
  floor_table_num?: number;
}

interface KOTRecord {
  id: number;
  kot_number: string;
  table_number: string;
  table_id?: number;
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
  const [activeTab, setActiveTab] = useState<"analytics" | "operations" | "inventory" | "menu" | "reservations" | "tables" | "ledger">("analytics");

  // Helper for date string
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Operations Command Center State
  const [opDate, setOpDate] = useState<string>(() => getLocalDateString(0));
  const [opSubTab, setOpSubTab] = useState<"kots">("kots");
  const [opTableFilter, setOpTableFilter] = useState<"all" | "active" | "available">("all");
  const [opFloorFilter, setOpFloorFilter] = useState<number | "all">("all");
  const [opSummary, setOpSummary] = useState<any>(null);
  const [opTableOverviews, setOpTableOverviews] = useState<any[]>([]);
  const [opReservations, setOpReservations] = useState<any[]>([]);
  const [opKots, setOpKots] = useState<any[]>([]);
  const [opDough, setOpDough] = useState<any>(null);
  const [isOpLoading, setIsOpLoading] = useState(false);
  const [selectedOpTable, setSelectedOpTable] = useState<any | null>(null);

  const isOpToday = opDate === getLocalDateString(0);
  const isOpFuture = opDate > getLocalDateString(0);

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
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: "", display_order: 1 });
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editCategoryData, setEditCategoryData] = useState({ name: "", display_order: 1 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reservations Data
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resSearch, setResSearch] = useState("");
  const [resDateFilter, setResDateFilter] = useState("");
  const [resFloorFilter, setResFloorFilter] = useState<number | "all">("all");
  const [selectedResDetails, setSelectedResDetails] = useState<Reservation | null>(null);

  // Tables Data
  const [tables, setTables] = useState<TableOverview[]>([]);
  const [tableFloorFilter, setTableFloorFilter] = useState<number | "all">("all");
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
    return "";
  };

  const getWsBase = () => {
    return process.env.NEXT_PUBLIC_WS_URL || "wss://cafe-piza-api.onrender.com";
  };

  // Raw material inventory
  const [rawItems, setRawItems] = useState<RawMaterial[]>([]);
  const [rawSearch, setRawSearch] = useState("");
  const [rawLowOnly, setRawLowOnly] = useState(false);
  const [stockUpdate, setStockUpdate] = useState<{ item: RawMaterial; mode: "PURCHASE" | "WASTE" | "COUNT"; qty: string; ref: string } | null>(null);
  const [newRaw, setNewRaw] = useState<{ name: string; sku: string; unit: string; stock: string; reorder: string } | null>(null);

  const fetchRawItems = useCallback(async () => {
    if (!token) return;
    try {
      const res = await adminFetch(`${getApiBase()}/api/v1/inventory`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRawItems(await res.json());
      else showToast("Could not load raw material inventory");
    } catch {
      showToast("Network error loading inventory");
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "inventory") fetchRawItems();
  }, [activeTab, fetchRawItems]);

  const handleStockUpdate = async () => {
    if (!stockUpdate || !token) return;
    const qty = Number(stockUpdate.qty);
    if (!Number.isFinite(qty) || qty < 0 || (stockUpdate.mode !== "COUNT" && qty === 0)) {
      showToast("Enter a valid quantity");
      return;
    }
    const current = Number(stockUpdate.item.current_stock);
    const change = stockUpdate.mode === "PURCHASE" ? qty : stockUpdate.mode === "WASTE" ? -qty : qty - current;
    if (stockUpdate.mode === "WASTE" && qty > current) {
      showToast("Cannot remove more than is in stock");
      return;
    }
    if (change === 0) {
      setStockUpdate(null);
      return;
    }
    try {
      const res = await adminFetch(`${getApiBase()}/api/v1/inventory/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          inventory_item_id: stockUpdate.item.id,
          transaction_type: stockUpdate.mode === "COUNT" ? "ADJUSTMENT" : stockUpdate.mode,
          quantity_change: change,
          reference_id: stockUpdate.ref.trim() || null,
        }),
      });
      if (res.ok) {
        showToast(`${stockUpdate.item.name} stock updated`);
        setStockUpdate(null);
        fetchRawItems();
      } else {
        showToast("Failed to update stock");
      }
    } catch {
      showToast("Network error updating stock");
    }
  };

  const handleCreateRawItem = async () => {
    if (!newRaw || !token) return;
    const stock = Number(newRaw.stock || 0);
    const reorder = Number(newRaw.reorder || 0);
    if (!newRaw.name.trim() || !newRaw.sku.trim() || !(stock >= 0) || !(reorder >= 0)) {
      showToast("Name, SKU and valid quantities are required");
      return;
    }
    try {
      const res = await adminFetch(`${getApiBase()}/api/v1/inventory/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newRaw.name.trim(),
          sku: newRaw.sku.trim().toUpperCase(),
          unit_of_measure: newRaw.unit,
          current_stock: stock,
          reorder_threshold: reorder,
        }),
      });
      if (res.ok) {
        showToast(`${newRaw.name.trim()} added to inventory`);
        setNewRaw(null);
        fetchRawItems();
      } else {
        showToast("Failed to add raw material (SKU may already exist)");
      }
    } catch {
      showToast("Network error adding raw material");
    }
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
        adminFetch(`${apiBase}/api/v1/menu/categories`),
        adminFetch(`${apiBase}/api/v1/menu/items`),
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
    const headers = { Authorization: `Bearer ${token}` };
    const requests = token ? Promise.allSettled([
      adminFetch(`${apiBase}/api/v1/analytics/dashboard`, { headers }),
      adminFetch(`${apiBase}/api/v1/reservations`, { headers }),
      adminFetch(`${apiBase}/api/v1/tables`, { headers }),
      adminFetch(`${apiBase}/api/v1/pos/kots`, { headers }),
    ]) : null;

    // 1. Always sync menu
    await fetchMenuData();

    if (!token) {
      if (!silent) setIsLoading(false);
      return;
    }
    const responses = await requests!;

    // 2. Analytics Dashboard (Protected)
    try {
      const anaRes = responses[0].status === "fulfilled" ? responses[0].value : null;
      if (anaRes?.ok) {
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
      const rRes = responses[1].status === "fulfilled" ? responses[1].value : null;
      if (rRes?.ok) {
        const rData = await rRes.json();
        if (Array.isArray(rData)) {
          setReservations(
            rData.map((r: any) => {
              const floorInfo = getTableFloor(r.table_id || r.table_name || 1);
              const canonicalId = (r.booking_id && String(r.booking_id).toUpperCase().startsWith("RES-"))
                ? String(r.booking_id).toUpperCase()
                : `RES-${String(r.id).padStart(4, "0")}`;
              return {
                id: r.id,
                booking_id: canonicalId,
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
                floor_number: r.floor_number || floorInfo.floor,
                floor_name: r.floor_number ? getFloorName(r.floor_number) : floorInfo.name,
                table_id: r.table_id,
                table_name: r.table_name || (r.table_id ? `Table ${r.table_id}` : "Auto Assigned"),
                is_historical_limited: Boolean(r.is_historical_limited),
                cancellation_refund_amount: r.cancellation_refund_amount ?? 0,
                cancellation_refund_status: r.cancellation_refund_status ?? undefined,
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn("Reservations fetch error:", err);
    }

    // 4. Tables (Protected)
    try {
      const tRes = responses[2].status === "fulfilled" ? responses[2].value : null;
      if (tRes?.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) {
          setTables(
            tData.map((t: any) => {
              const fl = getTableFloor(t.id, t.floor_number);
              const relNum = t.floor_table_num || fl.floor_table_num;
              return {
                id: t.id,
                table_number: `Table ${relNum}`,
                floor_table_num: relNum,
                capacity: t.capacity || fl.capacity,
                qr_token: t.qr_token || `qr_sec_${t.id}`,
                is_active: t.status !== "Maintenance",
                active_session_count: t.status === "Occupied" ? 1 : 0,
                floor_number: t.floor_number || fl.floor,
                floor_name: t.floor_name || fl.name,
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn("Tables fetch error:", err);
    }

    // 5. KOTs / Ledger (Protected)
    try {
      const kRes = responses[3].status === "fulfilled" ? responses[3].value : null;
      if (kRes?.ok) {
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

  // Fetch Operations Data for target date (silent mode prevents loading flash on background sync)
  const fetchOperationsData = useCallback(
    async (targetDate?: string, silent = false) => {
      if (!token) return;
      if (!silent) setIsOpLoading(true);
      const target = targetDate || opDate;
      const apiBase = getApiBase();
      const headers = { Authorization: `Bearer ${token}` };
      const dateParam = target ? `?target_date=${target}` : "";
      try {
        const [sumRes, tablesRes, kotsRes, doughRes, resRes] = await Promise.all([
          adminFetch(`${apiBase}/api/v1/pos/summary${dateParam}`, { headers }),
          adminFetch(`${apiBase}/api/v1/pos/table-sessions${dateParam}`, { headers }),
          adminFetch(`${apiBase}/api/v1/pos/kots${dateParam}`, { headers }),
          adminFetch(`${apiBase}/api/v1/pos/daily-dough-capacity${target ? `?target_date=${target}` : ""}`, { headers }),
          adminFetch(`${apiBase}/api/v1/reservations${target ? `?reservation_date=${target}` : ""}`, { headers }),
        ]);

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setOpSummary(sumData);
        }
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setOpTableOverviews(Array.isArray(tablesData) ? tablesData : []);
        }
        if (kotsRes.ok) {
          const kotsData = await kotsRes.json();
          setOpKots(Array.isArray(kotsData) ? kotsData : []);
        }
        if (doughRes.ok) {
          const doughData = await doughRes.json();
          setOpDough(doughData);
        }
        if (resRes.ok) {
          const resData = await resRes.json();
          setOpReservations(Array.isArray(resData) ? resData : []);
        }
      } catch (err) {
        console.warn("Operations data fetch error:", err);
      } finally {
        if (!silent) setIsOpLoading(false);
      }
    },
    [token, opDate]
  );

  useEffect(() => {
    if (token) {
      fetchOperationsData(opDate);
    }
  }, [token, opDate, fetchOperationsData]);

  // Dashboard revenue filters (each card queries /analytics/revenue for its own business-date range)
  type RevenueFigure = { revenue: number; kots: number } | null;
  const isoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shiftDays = (iso: string, days: number) => {
    const [y, m, d] = iso.split("-").map(Number);
    return isoDate(new Date(y, m - 1, d + days));
  };
  const shortDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };
  const todayIso = isoDate(new Date());
  const [revDay, setRevDay] = useState(todayIso);
  const [revWeekEnd, setRevWeekEnd] = useState(todayIso);
  const [revMonth, setRevMonth] = useState(todayIso.slice(0, 7));
  const [revYear, setRevYear] = useState(todayIso.slice(0, 4));
  const [revFigures, setRevFigures] = useState<Record<"day" | "prevDay" | "week" | "month" | "year", RevenueFigure>>({
    day: null,
    prevDay: null,
    week: null,
    month: null,
    year: null,
  });

  const fetchRevenue = useCallback(
    async (start: string, end: string): Promise<RevenueFigure> => {
      if (!token) return null;
      try {
        const res = await adminFetch(`${getApiBase()}/api/v1/analytics/revenue?start=${start}&end=${end}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    const [y, m] = revMonth.split("-").map(Number);
    const monthEnd = isoDate(new Date(y, m, 0));
    Promise.all([
      fetchRevenue(revDay, revDay),
      fetchRevenue(shiftDays(revDay, -1), shiftDays(revDay, -1)),
      fetchRevenue(shiftDays(revWeekEnd, -6), revWeekEnd),
      fetchRevenue(`${revMonth}-01`, monthEnd),
      fetchRevenue(`${revYear}-01-01`, `${revYear}-12-31`),
    ]).then(([day, prevDay, week, month, year]) => setRevFigures({ day, prevDay, week, month, year }));
  }, [token, revDay, revWeekEnd, revMonth, revYear, fetchRevenue, metrics]); // metrics: refetch whenever the dashboard refreshes

  // Cancel a reservation via the backend cancellation policy (computes refund, releases dough & reminders)
  const [confirmCancelRes, setConfirmCancelRes] = useState(false);
  const [isCancellingRes, setIsCancellingRes] = useState(false);

  const handleCancelReservation = async (resId: number) => {
    if (!token) return;
    setIsCancellingRes(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/v1/reservations/${resId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(`Cannot cancel: ${String(data.detail || "Server error").replace("INVALID_STATUS_TRANSITION: ", "")}`);
        return;
      }
      const refund = Number(data.cancellation_refund_amount || 0);
      setSelectedResDetails((prev) =>
        prev && prev.id === resId
          ? {
              ...prev,
              status: data.status,
              payment_status: data.payment_status,
              cancellation_refund_amount: data.cancellation_refund_amount,
              cancellation_refund_status: data.cancellation_refund_status,
            }
          : prev
      );
      setConfirmCancelRes(false);
      showToast(
        refund > 0
          ? `Reservation cancelled. Refund due to guest: ₹${refund.toFixed(2)}`
          : "Reservation cancelled. No refund due under the cancellation policy."
      );
      await Promise.all([fetchOperationsData(opDate, true), fetchData(true)]);
    } catch {
      showToast("Network error cancelling reservation");
    } finally {
      setIsCancellingRes(false);
    }
  };

  // Guest Arrived = check in + seat in one step: opens/links the table's bill session and credits the deposit
  const [arrivalTableId, setArrivalTableId] = useState<number | "">("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Open the details popup with fresh per-booking UI state (no leftover cancel confirm / table pick)
  const openReservationDetails = (r: Reservation) => {
    setConfirmCancelRes(false);
    setArrivalTableId("");
    setSelectedResDetails(r);
  };

  const handleGuestArrived = async (r: Reservation) => {
    if (!token) return;
    const tableId = r.table_id || (arrivalTableId === "" ? undefined : arrivalTableId);
    if (!tableId) {
      showToast("Choose a table for this guest first");
      return;
    }
    setIsCheckingIn(true);
    try {
      const res = await adminFetch(`${getApiBase()}/api/v1/reservations/${r.id}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ table_id: tableId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(String(data.detail || "Could not check the guest in").replace(/^[A-Z_]+: /, ""));
        return;
      }
      const tbl = RESTAURANT_TABLES.find((t) => t.id === tableId);
      setSelectedResDetails((prev) =>
        prev && prev.id === r.id
          ? {
              ...prev,
              status: data.status || "SEATED",
              table_id: tableId,
              table_name: data.table_name || tbl?.table_number || prev.table_name,
              floor_number: tbl?.floor || prev.floor_number,
              floor_name: tbl ? getFloorName(tbl.floor) : prev.floor_name,
            }
          : prev
      );
      setArrivalTableId("");
      showToast(`${r.customer_name} checked in and seated at ${tbl ? `${tbl.table_number} (${getFloorName(tbl.floor)})` : "their table"}`);
      await Promise.all([fetchOperationsData(opDate, true), fetchData(true)]);
    } catch {
      showToast("Network error checking the guest in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Handle seating and reservation status update with live session check-in
  const handleUpdateOpReservationStatus = async (resId: number, newStatus: string) => {
    if (!token) return;
    const previousOpReservations = opReservations;
    const previousReservations = reservations;
    setOpReservations((prev) => prev.map((reservation) => reservation.id === resId ? { ...reservation, status: newStatus } : reservation));
    setReservations((prev) => prev.map((reservation) => reservation.id === resId ? { ...reservation, status: newStatus } : reservation));
    const apiBase = getApiBase();
    try {
      if (newStatus === "SEATED") {
        const targetRes = opReservations.find((r) => r.id === resId) || reservations.find((r) => r.id === resId);
        if (targetRes && targetRes.table_id) {
          const checkinRes = await adminFetch(`${apiBase}/api/v1/reservations/${resId}/checkin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ table_id: targetRes.table_id }),
          });
          if (checkinRes.ok) {
            showToast(`Reservation #${resId} checked in & seated at Table #${targetRes.table_id}`);
            await Promise.all([fetchOperationsData(opDate, true), fetchData(true)]);
            return true;
          }
        }
      }

      const res = await adminFetch(`${apiBase}/api/v1/reservations/${resId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Reservation #${resId} marked as ${newStatus}`);
        await Promise.all([fetchOperationsData(opDate, true), fetchData(true)]);
        return true;
      } else {
        setOpReservations(previousOpReservations);
        setReservations(previousReservations);
        showToast(`Failed to update reservation #${resId}`);
      }
    } catch {
      setOpReservations(previousOpReservations);
      setReservations(previousReservations);
      showToast("Error updating reservation status");
    }
    return false;
  };

  // Real-time multi-channel WebSocket connection for live sync + background poll
  useEffect(() => {
    const wsBase = getWsBase();
    const channels = ["pos", "tables", "menu", "admin"];
    const sockets: WebSocket[] = [];
    let isCleanedUp = false;
    let reconnectTimeout: any = null;

    const connectAll = () => {
      if (isCleanedUp) return;
      channels.forEach((ch) => {
        try {
          const ws = new WebSocket(`${wsBase}/ws/${ch}`);
          sockets.push(ws);

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === "PONG") return;

              // Menu modifications
              if (data.type === "MENU_UPDATED") {
                fetchMenuData();
                showToast(`Live Update: ${data.name || "Menu"} was modified`);
              }

              // Kitchen / KOT / Order / Session / Reservation events from POS or system
              if (
                data.event === "KOT_CREATED" ||
                data.event === "KOT_UPDATED" ||
                data.event === "SESSION_CLOSED" ||
                data.event === "SESSIONS_RESET" ||
                data.event === "ORDER_CREATED" ||
                data.event === "RESERVATION_CREATED" ||
                data.event === "RESERVATION_UPDATED" ||
                data.event === "TABLE_UPDATED" ||
                data.type === "RESERVATION_CREATED" ||
                data.type === "RESERVATION_UPDATED"
              ) {
                // Silently refresh operations and dashboard data
                fetchOperationsData(opDate, true);
                fetchData(true);
              }
            } catch {}
          };
        } catch {}
      });
    };

    connectAll();

    // Reconnection check
    const checkConnection = () => {
      const anyOpen = sockets.some((s) => s.readyState === WebSocket.OPEN);
      if (!anyOpen && !isCleanedUp) {
        sockets.forEach((s) => {
          try { s.close(); } catch {}
        });
        sockets.length = 0;
        reconnectTimeout = setTimeout(connectAll, 4000);
      }
    };
    const healthInterval = setInterval(checkConnection, 10000);

    // WebSockets provide immediate updates; poll less often as a fallback.
    const pollInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (token) {
        fetchData(true);
        fetchOperationsData(opDate, true);
      } else {
        fetchMenuData();
      }
    }, 30000);

    return () => {
      isCleanedUp = true;
      sockets.forEach((s) => {
        try { s.close(); } catch {}
      });
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(healthInterval);
      clearInterval(pollInterval);
    };
  }, [token, opDate, fetchData, fetchOperationsData, fetchMenuData]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const apiBase = getApiBase();
      const res = await adminFetch(`${apiBase}/api/v1/auth/login`, {
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
      localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(ADMIN_REFRESH_KEY, data.refresh_token);
    } catch {
      setLoginError("Could not reach backend server. Please verify network connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_REFRESH_KEY);
  };

  // Keep React state in sync with adminFetch: renewed token, or session that could not be renewed
  useEffect(() => {
    const onRefreshed = (e: Event) => setToken((e as CustomEvent<string>).detail);
    const onExpired = () => {
      setToken(null);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_REFRESH_KEY);
      setLoginError("Your session expired. Please log in again.");
    };
    window.addEventListener(ADMIN_TOKEN_REFRESHED, onRefreshed);
    window.addEventListener(ADMIN_SESSION_EXPIRED, onExpired);
    return () => {
      window.removeEventListener(ADMIN_TOKEN_REFRESHED, onRefreshed);
      window.removeEventListener(ADMIN_SESSION_EXPIRED, onExpired);
    };
  }, []);

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
      const res = await adminFetch(`${apiBase}/api/v1/menu/items/${item.id}`, {
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
      const res = await adminFetch(`${apiBase}/api/v1/menu/items`, {
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

  // Category Handlers
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCategoryData.name.trim()) return;
    const apiBase = getApiBase();
    try {
      const res = await adminFetch(`${apiBase}/api/v1/menu/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCategoryData.name.trim(),
          display_order: Number(newCategoryData.display_order) || 1,
          is_active: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setCategories((prev) => [...prev, created]);
        setIsCreatingCategory(false);
        setNewCategoryData({ name: "", display_order: 1 });
        showToast(`Category "${created.name}" created successfully!`);
        fetchMenuData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to create category: ${err.detail || "Server error"}`);
      }
    } catch {
      showToast("Error creating category.");
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingCategory || !editCategoryData.name.trim()) return;
    const apiBase = getApiBase();
    try {
      const res = await adminFetch(`${apiBase}/api/v1/menu/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editCategoryData.name.trim(),
          display_order: Number(editCategoryData.display_order) || 1,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setEditingCategory(null);
        showToast(`Category "${updated.name}" updated successfully!`);
        fetchMenuData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`Failed to update category: ${err.detail || "Server error"}`);
      }
    } catch {
      showToast("Error updating category.");
    }
  };

  const handleDeleteCategory = async (catId: number, catName: string) => {
    if (!confirm(`Are you sure you want to deactivate category "${catName}"?`)) return;
    if (!token) return;
    const apiBase = getApiBase();
    try {
      const res = await adminFetch(`${apiBase}/api/v1/menu/categories/${catId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== catId));
        showToast(`Category "${catName}" removed.`);
        fetchMenuData();
      }
    } catch {
      showToast("Error deleting category.");
    }
  };

  const handleDeleteMenuItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this food item?")) return;
    if (!token) return;
    const apiBase = getApiBase();
    try {
      const res = await adminFetch(`${apiBase}/api/v1/menu/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
        showToast("Food item deleted successfully.");
        fetchMenuData();
      }
    } catch {
      showToast("Error deleting food item.");
    }
  };

  const handleOpenAddItemForCategory = (categoryId: number) => {
    setNewItemData((prev) => ({ ...prev, category_id: categoryId }));
    setIsCreatingItem(true);
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
      const rawQ = resSearch.trim().toLowerCase();
      if (!rawQ) {
        const matchesDate = !resDateFilter || r.booking_date === resDateFilter;
        const matchesFloor = resFloorFilter === "all" || r.floor_number === Number(resFloorFilter);
        return matchesDate && matchesFloor;
      }

      const cleanNumQ = rawQ.replace(/^(res[-_\s]*|#)/i, "").trim();
      const resIdStr = String(r.id);
      const resCanonical = `res-${resIdStr.padStart(4, "0")}`.toLowerCase();
      const resShort = `res-${resIdStr}`.toLowerCase();

      const matchesId =
        (cleanNumQ !== "" && (resIdStr === cleanNumQ || resIdStr.includes(cleanNumQ))) ||
        resCanonical.includes(rawQ) ||
        resShort.includes(rawQ) ||
        (r.booking_id && r.booking_id.toLowerCase().includes(rawQ));

      const matchesSearch =
        matchesId ||
        r.customer_name?.toLowerCase().includes(rawQ) ||
        r.customer_phone?.includes(rawQ) ||
        r.table_name?.toLowerCase().includes(rawQ) ||
        r.floor_name?.toLowerCase().includes(rawQ) ||
        r.upi_utr?.toLowerCase().includes(rawQ);

      const matchesDate = !resDateFilter || r.booking_date === resDateFilter;
      const matchesFloor = resFloorFilter === "all" || r.floor_number === Number(resFloorFilter);
      return Boolean(matchesSearch && matchesDate && matchesFloor);
    });
  }, [reservations, resSearch, resDateFilter, resFloorFilter]);

  const recentReservations = useMemo(() => {
    return filteredReservations.filter((r) => !r.is_historical_limited);
  }, [filteredReservations]);

  const historicalReservations = useMemo(() => {
    return filteredReservations.filter((r) => r.is_historical_limited);
  }, [filteredReservations]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    const baseList = tables.length > 0 ? tables : RESTAURANT_TABLES.map((rt) => ({
      id: rt.id,
      table_number: `Table ${rt.floor_table_num}`,
      floor_table_num: rt.floor_table_num,
      capacity: rt.capacity,
      qr_token: rt.qr_token,
      is_active: true,
      active_session_count: 0,
      floor_number: rt.floor,
      floor_name: rt.floor_name,
    }));
    return baseList.filter((t) => {
      if (tableFloorFilter === "all") return true;
      return t.floor_number === Number(tableFloorFilter);
    });
  }, [tables, tableFloorFilter]);

  // Max value for revenue bar chart
  const maxRevenue = useMemo(() => {
    if (!salesHistory.length) return 1;
    return Math.max(...salesHistory.map((s) => s.revenue), 1000);
  }, [salesHistory]);

  // Memoized Operations Metrics & Filters
  const opSalesTotal = useMemo(() => {
    return opKots.reduce((sum, k) => sum + (Number(k.total_amount) || 0), 0);
  }, [opKots]);

  const opOpenKotsCount = useMemo(() => {
    return opKots.filter((k) => k.status !== "SERVED" && k.status !== "CANCELLED").length;
  }, [opKots]);

  // Unified display data with fallback to ensure tables and bookings always show live
  const displayTableOverviews = useMemo(() => {
    if (opTableOverviews.length > 0) return opTableOverviews;
    if (tables.length > 0) {
      return tables.map((t) => {
        const fl = getTableFloor(t.id, t.floor_number);
        const relNum = t.floor_table_num || fl.floor_table_num;
        return {
          table_id: t.id,
          table_number: `Table ${relNum}`,
          floor_table_num: relNum,
          capacity: t.capacity || fl.capacity || 4,
          floor_number: t.floor_number || fl.floor,
          floor_name: t.floor_name || fl.name,
          active_session_count: t.is_occupied ? 1 : 0,
          total_sessions_today: 0,
          sessions: [],
        };
      });
    }
    return RESTAURANT_TABLES.map((rt) => ({
      table_id: rt.id,
      table_number: rt.table_number,
      floor_table_num: rt.floor_table_num,
      capacity: rt.capacity,
      floor_number: rt.floor,
      floor_name: rt.floor_name,
      active_session_count: 0,
      total_sessions_today: 0,
      sessions: [],
    }));
  }, [opTableOverviews, tables]);

  const opActiveTablesCount = useMemo(() => {
    return displayTableOverviews.filter((t) => (t.active_session_count || 0) > 0).length;
  }, [displayTableOverviews]);

  const filteredOpTables = useMemo(() => {
    let list = displayTableOverviews;
    if (opFloorFilter !== "all") {
      list = list.filter((tbl) => {
        const floorNum = tbl.floor_number || getTableFloor(tbl.table_id).floor;
        return floorNum === Number(opFloorFilter);
      });
    }
    if (opTableFilter === "active") {
      return list.filter((t) => (t.active_session_count || 0) > 0);
    }
    if (opTableFilter === "available") {
      return list.filter((t) => (t.active_session_count || 0) === 0);
    }
    return list;
  }, [displayTableOverviews, opFloorFilter, opTableFilter]);

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
                alt="Jaadoo Pizza Project"
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
            className="fixed top-20 right-6 z-[60] bg-[#2A1E17] text-[#FAF6F0] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border border-[#E8AA62]/40"
          >
            <Sparkles className="w-4 h-4 text-[#E8AA62] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="bg-[#FFFDF9] border-b border-[#E6DCce] px-4 sm:px-6 py-4 sticky top-0 z-40 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="w-20 h-12 sm:w-24 sm:h-14 rounded-xl overflow-hidden border-2 border-[#9E3E26]/40 shadow-md bg-white shrink-0">
            <img
              src="/jaadoo_logo.jpg"
              alt="Jaadoo Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-base font-serif font-extrabold tracking-wide text-[#241A14]">
              JAADOO PIZZA PROJECT
            </h1>
            <div className="mt-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-[0.22em] text-[#B85B43]">
                Owner Executive Portal
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Header */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
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
      <div className="bg-[#F3EDE2] border-b border-[#E4DCD0] px-4 sm:px-6 py-2.5 overflow-x-auto flex items-center gap-2">
        {[
          { id: "analytics", label: "Executive Analytics", icon: TrendingUp },
          { id: "operations", label: "Operations", icon: SlidersHorizontal },
          { id: "menu", label: "Menu", icon: Utensils },
          { id: "inventory", label: "Inventory", icon: Package },
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
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full min-w-0 mx-auto space-y-6">
        {/* TAB 1: EXECUTIVE ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Primary KPI Metric Cards (each with its own business-date filter) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              {/* Card 1: Daily revenue (any date in the last 7 days) */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>{revDay === todayIso ? "Today's Revenue" : "Daily Revenue"}</span>
                  <IndianRupee className="w-4 h-4 text-[#B85B43]" />
                </div>
                <input
                  type="date"
                  value={revDay}
                  min={shiftDays(todayIso, -6)}
                  max={todayIso}
                  onChange={(e) => e.target.value && setRevDay(e.target.value)}
                  aria-label="Revenue date"
                  className="mt-2 bg-[#FAF6EE] border border-[#E0D4C2] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#4A392F] outline-none focus:border-[#B85B43] cursor-pointer"
                />
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(revFigures.day?.revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2 flex items-center justify-between">
                  <span>{shortDate(shiftDays(revDay, -1))}: ₹{Number(revFigures.prevDay?.revenue || 0).toLocaleString("en-IN")}</span>
                  <span className="text-[#B85B43] font-bold">{revFigures.day?.kots || 0} {revFigures.day?.kots === 1 ? "KOT" : "KOTs"}</span>
                </div>
              </div>

              {/* Card 2: Weekly revenue (7-day weeks counting back from today) */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>Weekly Revenue</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <select value={revWeekEnd} onChange={(e) => setRevWeekEnd(e.target.value)} aria-label="Revenue week" className="mt-2 bg-[#FAF6EE] border border-[#E0D4C2] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#4A392F] outline-none focus:border-[#B85B43] cursor-pointer">
                  {Array.from({ length: 12 }, (_, i) => shiftDays(todayIso, -7 * i)).map((weekEnd, i) => (
                    <option key={weekEnd} value={weekEnd}>
                      {i === 0 ? "Last 7 days" : `${shortDate(shiftDays(weekEnd, -6))} – ${shortDate(weekEnd)}`}
                    </option>
                  ))}
                </select>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(revFigures.week?.revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2 flex items-center justify-between">
                  <span>{shortDate(shiftDays(revWeekEnd, -6))} – {shortDate(revWeekEnd)}</span>
                  <span className="text-[#B85B43] font-bold">{revFigures.week?.kots || 0} {revFigures.week?.kots === 1 ? "KOT" : "KOTs"}</span>
                </div>
              </div>

              {/* Card 3: Monthly revenue (any month, last 24 months) */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>Monthly Revenue</span>
                  <Calendar className="w-4 h-4 text-[#B85B43]" />
                </div>
                <select value={revMonth} onChange={(e) => setRevMonth(e.target.value)} aria-label="Revenue month" className="mt-2 bg-[#FAF6EE] border border-[#E0D4C2] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#4A392F] outline-none focus:border-[#B85B43] cursor-pointer">
                  {Array.from({ length: 24 }, (_, i) => {
                    const [y, m] = todayIso.split("-").map(Number);
                    const d = new Date(y, m - 1 - i, 1);
                    return { value: isoDate(d).slice(0, 7), label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
                  }).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(revFigures.month?.revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2 flex items-center justify-between">
                  <span>Avg Ticket: ₹{Math.round(revFigures.month?.kots ? revFigures.month.revenue / revFigures.month.kots : 0).toLocaleString("en-IN")}</span>
                  <span className="text-[#B85B43] font-bold">{revFigures.month?.kots || 0} {revFigures.month?.kots === 1 ? "KOT" : "KOTs"}</span>
                </div>
              </div>

              {/* Card 4: Yearly revenue */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-xs text-[#7A6A5E] font-bold uppercase tracking-wider">
                  <span>Yearly Revenue</span>
                  <TrendingUp className="w-4 h-4 text-[#B85B43]" />
                </div>
                <select value={revYear} onChange={(e) => setRevYear(e.target.value)} aria-label="Revenue year" className="mt-2 bg-[#FAF6EE] border border-[#E0D4C2] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#4A392F] outline-none focus:border-[#B85B43] cursor-pointer">
                  {Array.from({ length: 5 }, (_, i) => String(Number(todayIso.slice(0, 4)) - i)).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="text-3xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(revFigures.year?.revenue || 0).toLocaleString("en-IN")}
                </div>
                <div className="text-[11px] text-[#7A6A5E] mt-2 flex items-center justify-between">
                  <span>Jan – Dec {revYear}</span>
                  <span className="text-[#B85B43] font-bold">{revFigures.year?.kots || 0} {revFigures.year?.kots === 1 ? "KOT" : "KOTs"}</span>
                </div>
              </div>

              {/* Card 5: Total Lifetime Revenue */}
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

            {/* Floor Tables & Billing (moved from Operations) */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif font-bold uppercase tracking-wider text-[#241A14]">
                    Floor Tables & Billing
                  </h3>
                  <span className="text-xs text-[#7A6A5E]">
                    ({filteredOpTables.length} tables shown)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Floor Filter Tabs matching POS */}
                  <div className="flex flex-wrap items-center bg-[#FAF7F0] p-1 rounded-lg border border-[#E4DCD0] text-xs">
                    <button
                      type="button"
                      onClick={() => setOpFloorFilter("all")}
                      className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                        opFloorFilter === "all"
                          ? "bg-[#261C18] text-white shadow-xs"
                          : "text-[#665448] hover:text-[#241A14]"
                      }`}
                    >
                      All Floors
                    </button>
                    {RESTAURANT_FLOORS.map((fl) => (
                      <button
                        key={fl.id}
                        type="button"
                        onClick={() => setOpFloorFilter(fl.id)}
                        className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                          opFloorFilter === fl.id
                            ? "bg-[#261C18] text-white shadow-xs"
                            : "text-[#665448] hover:text-[#241A14]"
                        }`}
                      >
                        <span>{fl.name}</span>
                        {fl.isComingSoon && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded font-normal">
                            Soon
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Occupancy Filter */}
                  <div className="flex items-center bg-[#FAF7F0] p-1 rounded-lg border border-[#E4DCD0] text-xs">
                    {(["all", "active", "available"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOpTableFilter(mode)}
                        className={`px-3 py-1 rounded-md capitalize font-bold transition-colors cursor-pointer ${
                          opTableFilter === mode
                            ? "bg-[#261C18] text-white shadow-xs"
                            : "text-[#665448] hover:text-[#241A14]"
                        }`}
                      >
                        {mode === "all"
                          ? `All (${displayTableOverviews.length})`
                          : mode === "active"
                          ? `Occupied (${opActiveTablesCount})`
                          : `Ready (${displayTableOverviews.length - opActiveTablesCount})`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredOpTables.length === 0 ? (
                <div className="text-center py-12 px-4 bg-[#FFFDF9] rounded-2xl border border-[#E4DCD0] space-y-2">
                  {opFloorFilter === 6 ? (
                    <>
                      <div className="inline-block p-3 bg-amber-50 rounded-full border border-amber-200 mb-1">
                        <Sparkles className="w-6 h-6 text-amber-700 mx-auto" />
                      </div>
                      <h4 className="text-sm font-bold text-[#241A14]">Floor 6: Everest Sky Deck</h4>
                      <p className="text-xs text-[#7A6A5E] max-w-sm mx-auto">
                        Exclusive rooftop sky deck with 360° views of Old City Udaipur & Lake Pichola is opening soon!
                      </p>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed className="w-8 h-8 text-[#A8988B] mx-auto" />
                      <h4 className="text-sm font-bold text-[#241A14]">No Tables Found</h4>
                      <p className="text-xs text-[#7A6A5E]">No tables match the selected filter on this date.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {(opFloorFilter === "all"
                    ? RESTAURANT_FLOORS.filter((f) => !f.isComingSoon)
                    : RESTAURANT_FLOORS.filter((f) => f.id === opFloorFilter)
                  ).map((floor) => {
                    const floorTables = filteredOpTables.filter(
                      (tbl) => (tbl.floor_number || getTableFloor(tbl.table_id).floor) === floor.id
                    );
                    if (floorTables.length === 0) return null;

                    return (
                      <div key={floor.id} className="space-y-3">
                        <div className="flex items-center justify-between bg-[#F8F5F0] px-4 py-2.5 rounded-xl border border-[#E4DCD0] shadow-2xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#B85B43]" />
                            <h3 className="font-serif font-bold text-sm text-[#241A14]">
                              Floor {floor.id}: {floor.name}
                            </h3>
                            <span className="text-xs text-[#7A6A5E] font-sans">
                              ({floorTables.length} {floorTables.length === 1 ? "Table" : "Tables"})
                            </span>
                          </div>
                          <span className="text-xs text-[#7A6A5E] font-sans hidden sm:inline">
                            {floor.desc}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {floorTables.map((tbl) => {
                            const floorInfo = tbl.floor_number ? RESTAURANT_FLOORS.find((f) => f.id === tbl.floor_number) : getTableFloor(tbl.table_id);
                            const floorDetail = getTableFloor(tbl.table_id, tbl.floor_number);
                            const floorTableNum = tbl.floor_table_num || floorDetail.floor_table_num;
                            const displayTableName = `TABLE ${String(floorTableNum).padStart(2, "0")}`;
                            const floorDisplayName = tbl.floor_name || floorInfo?.name || floorDetail.name;
                            const isOccupied = (tbl.active_session_count || 0) > 0;

                            return (
                              <div
                                key={tbl.table_id}
                                className={`rounded-2xl border p-4.5 space-y-3.5 transition-all shadow-sm ${
                                  isOccupied
                                    ? "bg-[#FFFDF9] border-amber-300 ring-1 ring-amber-200"
                                    : "bg-[#FFFDF9] border-[#E6DCCF]"
                                }`}
                              >
                                <div className="flex items-start justify-between border-b border-[#F0E8DC] pb-2.5">
                                  <div>
                                    <div className="flex items-baseline gap-2">
                                      <h4 className="font-sans font-extrabold text-base text-[#241A14]">
                                        {displayTableName}
                                      </h4>
                                      <span className="text-xs font-semibold text-[#B85B43]">
                                        • {floorDisplayName}
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-[#7A6A5E]">
                                      {tbl.capacity || floorDetail.capacity} Seats Physical Capacity
                                    </span>
                                  </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isOccupied
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-900 border-emerald-300"
                            }`}
                          >
                            {isOccupied ? "Occupied" : "Ready"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#241A14]">Total Bill:</span>
                          <span className="font-mono font-extrabold text-sm text-[#B85B43]">
                            ₹{(tbl.sessions || []).reduce((sum: number, s: any) => sum + Number(s.gross_amount || s.total_amount || 0), 0).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedOpTable(tbl)}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#241A14] border border-[#E0D4C2] font-bold text-xs transition-colors cursor-pointer"
                        >
                          Bill Summary
                        </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>

            {/* 14-Day Sales Trend Bar Chart */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
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
              <div className="overflow-x-auto pb-2">
                <div className="pt-6 pb-2 grid min-w-[560px] grid-cols-14 gap-2 items-end h-52 border-b border-[#E6DCCF]">
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

        {/* ========================================================================= */}
        {/* TAB: OPERATIONS COMMAND & DATE CONTROLLER (REAL-TIME & HISTORICAL ARCHIVE) */}
        {/* ========================================================================= */}
        {activeTab === "operations" && (
          <div className="space-y-6">
            {/* 1. Header & Operational Date Controller Bar */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#B85B43]/10 text-[#B85B43]">
                      <SlidersHorizontal className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg font-sans font-bold text-[#241A14]">Operations Command Center</h2>
                  </div>
                  <p className="text-xs text-[#7A6A5E] mt-1">
                    Check tables booked on any date, verify live & historical sales, monitor open KOTs, and audit dough capacity.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchOperationsData(opDate)}
                    disabled={isOpLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#241A14] border border-[#E0D4C2] text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#B85B43] ${isOpLoading ? "animate-spin" : ""}`} />
                    <span>{isOpLoading ? "Syncing..." : "Refresh Data"}</span>
                  </button>
                </div>
              </div>

              {/* Operational Date Controller (Exact Match with POS) */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAF7F0] p-3.5 rounded-xl border border-[#E4DCD0] text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-sans font-bold uppercase text-[#4A392F] tracking-wider text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#B85B43]" />
                    OPERATIONS DATE:
                  </span>

                  <div className="flex items-center gap-1.5 bg-[#FFFDF9] px-3 py-1.5 rounded-lg border border-[#E4DCD0] shadow-xs">
                    <input
                      type="date"
                      value={opDate}
                      onChange={(e) => setOpDate(e.target.value)}
                      className="bg-transparent font-mono font-bold text-xs text-[#241A14] focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Quick Switchers */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOpDate(getLocalDateString(0))}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                        isOpToday
                          ? "bg-[#261C18] text-white shadow-xs"
                          : "bg-[#FFFDF9] text-[#665448] hover:bg-[#EBE2D4] border border-[#E4DCD0]"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpDate(getLocalDateString(-1))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        opDate === getLocalDateString(-1)
                          ? "bg-[#261C18] text-white shadow-xs"
                          : "bg-[#FFFDF9] text-[#665448] hover:bg-[#EBE2D4] border border-[#E4DCD0]"
                      }`}
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpDate(getLocalDateString(-2))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        opDate === getLocalDateString(-2)
                          ? "bg-[#261C18] text-white shadow-xs"
                          : "bg-[#FFFDF9] text-[#665448] hover:bg-[#EBE2D4] border border-[#E4DCD0]"
                      }`}
                    >
                      2 Days Ago
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpDate(getLocalDateString(1))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        opDate === getLocalDateString(1)
                          ? "bg-[#261C18] text-white shadow-xs"
                          : "bg-[#FFFDF9] text-[#665448] hover:bg-[#EBE2D4] border border-[#E4DCD0]"
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                      isOpToday
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isOpFuture
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    {isOpToday ? "Live Shift" : isOpFuture ? "Future Booking" : "History Archive"}
                  </span>

                  {!isOpToday && (
                    <button
                      type="button"
                      onClick={() => setOpDate(getLocalDateString(0))}
                      className="inline-flex items-center gap-1 text-[11px] text-[#B85B43] font-bold hover:underline cursor-pointer ml-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Return to Today</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Top Summary KPI Cards for Selected Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Tables */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#7A6A5E] flex items-center justify-between">
                  <span>ACTIVE TABLES</span>
                  <Users className="w-4 h-4 text-[#8C7A6D]" />
                </div>
                <div className="text-2xl font-extrabold font-sans text-[#241A14] mt-2 flex items-baseline gap-2">
                  <span>{opActiveTablesCount}</span>
                  <span className="text-xs font-normal text-[#8C7A6D] font-sans">
                    / {displayTableOverviews.length} total
                  </span>
                </div>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  {isOpToday ? "Currently seated dining sessions" : "Sessions active on this date"}
                </p>
              </div>

              {/* Card 2: Open / Total KOTs */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#7A6A5E] flex items-center justify-between">
                  <span>OPEN KOTS</span>
                  <Receipt className="w-4 h-4 text-[#8C7A6D]" />
                </div>
                <div className="text-2xl font-extrabold font-sans text-[#241A14] mt-2 flex items-baseline gap-2">
                  <span>{opOpenKotsCount}</span>
                  <span className="text-xs font-normal text-[#8C7A6D] font-sans">
                    ({opKots.length} total tickets)
                  </span>
                </div>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  Kitchen tickets placed for this date
                </p>
              </div>

              {/* Card 3: Operations Sales */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#7A6A5E] flex items-center justify-between">
                  <span>OPERATIONS SALES</span>
                  <TrendingUp className="w-4 h-4 text-[#4A5842]" />
                </div>
                <div className="text-2xl font-extrabold font-sans text-[#241A14] mt-2">
                  ₹{Number(opSalesTotal || 0).toLocaleString("en-IN")}
                </div>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  {opSummary?.order_count || opKots.length} orders recorded
                </p>
              </div>

              {/* Card 4: Daily Dough & Protected Capacity */}
              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wider font-bold text-[#7A6A5E] flex items-center justify-between">
                  <span>DOUGH CAPACITY</span>
                  <Flame className="w-4 h-4 text-[#B85B43]" />
                </div>
                <div className="text-2xl font-extrabold font-sans text-[#241A14] mt-2 flex items-baseline gap-2">
                  <span>{opDough?.walk_in_available ?? "—"}</span>
                  <span className="text-xs font-normal text-[#8C7A6D] font-sans">
                    walk-in units
                  </span>
                </div>
                <p className="text-[11px] text-[#7A6A5E] mt-1">
                  {opDough?.total_active_protected ?? opDough?.protected_units ?? 0} units reserved for bookings
                </p>
              </div>
            </div>

            {/* 3. Operations Sub-Tabs (KOTs) */}
            <div className="flex items-center gap-2 border-b border-[#E4DCD0] pb-2">
              <button
                type="button"
                onClick={() => setOpSubTab("kots")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  opSubTab === "kots"
                    ? "bg-[#261C18] text-[#FBF9F5] shadow-sm"
                    : "bg-[#FFFDF9] text-[#665448] hover:text-[#241A14] hover:bg-[#F3EDE2] border border-[#E4DCD0]"
                }`}
              >
                KOT Orders ({opKots.length})
              </button>
            </div>

            {/* SUB-VIEW 1: FLOOR TABLES & SESSIONS ON SELECTED DATE */}
            {opSubTab === "tables" && (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-[#FFFDF9] p-3.5 rounded-xl border border-[#E4DCD0]">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-sans font-bold text-[#241A14]">
                      Cafe Floor Layout & Dining Sessions
                    </h3>
                    <span className="text-xs text-[#7A6A5E]">
                      ({filteredOpTables.length} tables shown)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Floor Filter Tabs matching POS */}
                    <div className="flex flex-wrap items-center bg-[#FAF7F0] p-1 rounded-lg border border-[#E4DCD0] text-xs">
                      <button
                        type="button"
                        onClick={() => setOpFloorFilter("all")}
                        className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                          opFloorFilter === "all"
                            ? "bg-[#261C18] text-white shadow-xs"
                            : "text-[#665448] hover:text-[#241A14]"
                        }`}
                      >
                        All Floors
                      </button>
                      {RESTAURANT_FLOORS.map((fl) => (
                        <button
                          key={fl.id}
                          type="button"
                          onClick={() => setOpFloorFilter(fl.id)}
                          className={`px-3 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            opFloorFilter === fl.id
                              ? "bg-[#261C18] text-white shadow-xs"
                              : "text-[#665448] hover:text-[#241A14]"
                          }`}
                        >
                          <span>{fl.name}</span>
                          {fl.isComingSoon && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded font-normal">
                              Soon
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Occupancy Filter */}
                    <div className="flex items-center bg-[#FAF7F0] p-1 rounded-lg border border-[#E4DCD0] text-xs">
                      {(["all", "active", "available"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setOpTableFilter(mode)}
                          className={`px-3 py-1 rounded-md capitalize font-bold transition-colors cursor-pointer ${
                            opTableFilter === mode
                              ? "bg-[#261C18] text-white shadow-xs"
                              : "text-[#665448] hover:text-[#241A14]"
                          }`}
                        >
                          {mode === "all"
                            ? `All (${displayTableOverviews.length})`
                            : mode === "active"
                            ? `Occupied (${opActiveTablesCount})`
                            : `Available (${displayTableOverviews.length - opActiveTablesCount})`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredOpTables.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-[#FFFDF9] rounded-2xl border border-[#E4DCD0] space-y-2">
                    {opFloorFilter === 6 ? (
                      <>
                        <div className="inline-block p-3 bg-amber-50 rounded-full border border-amber-200 mb-1">
                          <Sparkles className="w-6 h-6 text-amber-700 mx-auto" />
                        </div>
                        <h4 className="text-sm font-bold text-[#241A14]">Floor 6: Everest Sky Deck</h4>
                        <p className="text-xs text-[#7A6A5E] max-w-sm mx-auto">
                          Exclusive rooftop sky deck with 360° views of Old City Udaipur & Lake Pichola is opening soon!
                        </p>
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed className="w-8 h-8 text-[#A8988B] mx-auto" />
                        <h4 className="text-sm font-bold text-[#241A14]">No Tables Found</h4>
                        <p className="text-xs text-[#7A6A5E]">No tables match the selected filter on this date.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(opFloorFilter === "all"
                      ? RESTAURANT_FLOORS.filter((f) => !f.isComingSoon)
                      : RESTAURANT_FLOORS.filter((f) => f.id === opFloorFilter)
                    ).map((floor) => {
                      const floorTables = filteredOpTables.filter(
                        (tbl) => (tbl.floor_number || getTableFloor(tbl.table_id).floor) === floor.id
                      );
                      if (floorTables.length === 0) return null;

                      return (
                        <div key={floor.id} className="space-y-3">
                          <div className="flex items-center justify-between bg-[#F8F5F0] px-4 py-2.5 rounded-xl border border-[#E4DCD0] shadow-2xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#B85B43]" />
                              <h3 className="font-serif font-bold text-sm text-[#241A14]">
                                Floor {floor.id}: {floor.name}
                              </h3>
                              <span className="text-xs text-[#7A6A5E] font-sans">
                                ({floorTables.length} {floorTables.length === 1 ? "Table" : "Tables"})
                              </span>
                            </div>
                            <span className="text-xs text-[#7A6A5E] font-sans hidden sm:inline">
                              {floor.desc}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {floorTables.map((tbl) => {
                              const floorInfo = tbl.floor_number ? RESTAURANT_FLOORS.find((f) => f.id === tbl.floor_number) : getTableFloor(tbl.table_id);
                              const floorDetail = getTableFloor(tbl.table_id, tbl.floor_number);
                              const floorTableNum = tbl.floor_table_num || floorDetail.floor_table_num;
                              const displayTableName = `TABLE ${String(floorTableNum).padStart(2, "0")}`;
                              const floorDisplayName = tbl.floor_name || floorInfo?.name || floorDetail.name;
                              const isOccupied = (tbl.active_session_count || 0) > 0;
                              const activeSessions = (tbl.sessions || []).filter((s: any) => s.is_active);
                              const currentSession = activeSessions[0] || (tbl.sessions && tbl.sessions[0]);

                              // Match any active booking for this table on selected date (matching POS)
                              const bookedReservation = displayOpReservations.find((r) => {
                                const matchId = r.table_id === tbl.table_id;
                                const matchName = r.table_name && (
                                  (r.table_name.toLowerCase().replace(/\s+/g, "") === `table${floorTableNum}` ||
                                   r.table_name.toLowerCase().replace(/\s+/g, "") === `table${tbl.table_id}`) &&
                                  (!r.floor_number || r.floor_number === (tbl.floor_number || floorDetail.floor))
                                );
                                const isActive = ["CONFIRMED", "ARRIVED", "SEATED", "HOLD", "PAYMENT_PENDING"].includes(r.status?.toUpperCase() || "");
                                return (matchId || matchName) && isActive;
                              });

                              return (
                                <div
                                  key={tbl.table_id}
                                  className={`rounded-2xl border p-4.5 space-y-3.5 transition-all shadow-sm ${
                                    isOccupied
                                      ? "bg-[#FFFDF9] border-amber-300 ring-1 ring-amber-200"
                                      : "bg-[#FFFDF9] border-[#E6DCCF]"
                                  }`}
                                >
                                  <div className="flex items-start justify-between border-b border-[#F0E8DC] pb-2.5">
                                    <div>
                                      <div className="flex items-baseline gap-2">
                                        <h4 className="font-sans font-extrabold text-base text-[#241A14]">
                                          {displayTableName}
                                        </h4>
                                        <span className="text-xs font-semibold text-[#B85B43]">
                                          • {floorDisplayName}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-[#7A6A5E]">
                                        {tbl.capacity || floorDetail.capacity} Seats Physical Capacity
                                      </span>
                                    </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isOccupied
                                  ? "bg-amber-100 text-amber-900 border-amber-300"
                                  : "bg-emerald-100 text-emerald-900 border-emerald-300"
                              }`}
                            >
                              {isOccupied ? "Occupied" : "Available"}
                            </span>
                          </div>

                          {/* Booked Reservation Banner matching POS */}
                          {bookedReservation && (
                            <div className="p-2.5 bg-[#FAF0E1] border border-[#E8DFC9] rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#9E3E26] flex items-center gap-1 uppercase tracking-wider text-[10px]">
                                  <UserCheck className="w-3.5 h-3.5 text-[#9E3E26]" />
                                  Reserved Guest
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  bookedReservation.status === "SEATED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : bookedReservation.status === "ARRIVED"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}>
                                  {bookedReservation.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-stone-900 font-semibold text-xs">
                                <span className="truncate">{bookedReservation.customer_name || bookedReservation.customer?.name || "Guest"}</span>
                                <span className="text-[11px] font-mono text-stone-600 shrink-0 ml-1">
                                  {bookedReservation.time_slot} ({bookedReservation.guest_count || bookedReservation.party_size}p)
                                </span>
                              </div>
                            </div>
                          )}

                          {currentSession ? (
                            <div className="space-y-2.5 text-xs">
                              <div className="flex items-center justify-between text-[#665448]">
                                <span className="font-semibold">Session Status:</span>
                                <span className="font-bold text-[#241A14]">
                                  {currentSession.is_active ? "Active Floor Session" : "Closed / Settled"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[#665448]">
                                <span className="font-semibold">Opened Time:</span>
                                <span className="font-mono text-[#241A14]">
                                  {currentSession.opened_at
                                    ? new Date(currentSession.opened_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[#665448]">
                                <span className="font-semibold">Guest Count:</span>
                                <span className="font-bold text-[#241A14]">
                                  {currentSession.guest_count || tbl.capacity} Guests
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-[#F0E8DC]">
                                <span className="font-bold text-[#241A14]">Current Bill:</span>
                                <span className="font-mono font-extrabold text-sm text-[#B85B43]">
                                  ₹{Number(currentSession.total_amount || 0).toLocaleString("en-IN")}
                                </span>
                              </div>

                              {currentSession.items && currentSession.items.length > 0 && (
                                <div className="pt-2 border-t border-[#F0E8DC]">
                                  <div className="text-[11px] font-bold text-[#4A392F] mb-1">
                                    Ordered Items ({currentSession.items.length}):
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {currentSession.items.slice(0, 4).map((it: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#E0D4C2] text-[10px] text-[#241A14] font-medium"
                                      >
                                        {it.quantity}x {it.name}
                                      </span>
                                    ))}
                                    {currentSession.items.length > 4 && (
                                      <span className="text-[10px] text-[#7A6A5E] font-medium self-center">
                                        +{currentSession.items.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedOpTable({ ...tbl, session: currentSession })}
                                className="w-full mt-2 py-1.5 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#241A14] border border-[#E0D4C2] font-bold text-xs transition-colors cursor-pointer"
                              >
                                View Session Details
                              </button>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-xs text-[#8C7A6D] space-y-1">
                              <p className="font-medium">No session opened on {opDate}.</p>
                              <p className="text-[11px] text-[#A8988B]">Table is free for reservations or walk-ins.</p>
                            </div>
                          )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            )}

            {/* SUB-VIEW 2: TABLE BOOKINGS ON SELECTED DATE (SPECIFICALLY REQUESTED) */}
            {opSubTab === "bookings" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FFFDF9] p-3.5 rounded-xl border border-[#E4DCD0]">
                  <div>
                    <h3 className="text-sm font-sans font-bold text-[#241A14]">
                      Table Bookings for <span className="font-mono">{opDate}</span>
                    </h3>
                    <p className="text-xs text-[#7A6A5E]">
                      {filteredOpReservations.length} bookings recorded for this date
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A6D]" />
                      <input
                        type="text"
                        value={opResSearch}
                        onChange={(e) => setOpResSearch(e.target.value)}
                        placeholder="Search guest, phone, table..."
                        className="bg-[#FAF7F0] border border-[#E0D4C2] focus:border-[#B85B43] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#241A14] outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-lg border border-[#E4DCD0] text-xs">
                      {(["all", "CONFIRMED", "ARRIVED", "SEATED", "COMPLETED", "CANCELLED"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setOpResFilter(st)}
                          className={`px-2.5 py-1 rounded-md capitalize font-bold transition-colors cursor-pointer ${
                            opResFilter === st
                              ? "bg-[#261C18] text-white shadow-xs"
                              : "text-[#665448] hover:text-[#241A14]"
                          }`}
                        >
                          {st.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredOpReservations.length === 0 ? (
                  <div className="text-center py-12 px-4 bg-[#FFFDF9] rounded-2xl border border-[#E4DCD0] space-y-2">
                    <Calendar className="w-8 h-8 text-[#A8988B] mx-auto" />
                    <h4 className="text-sm font-bold text-[#241A14]">No Table Bookings Found</h4>
                    <p className="text-xs text-[#7A6A5E]">
                      There are no reservations booked for {opDate}. Change the date above to inspect other days.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOpReservations.map((res: any) => {
                      const cust = res.customer;
                      const custName = res.customer_name || cust?.name || "Guest";
                      const custPhone = res.customer_phone || cust?.phone || "No phone provided";
                      const st = String(res.status || "CONFIRMED").toUpperCase();

                      const statusBadge =
                        st === "CONFIRMED"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : st === "ARRIVED"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : st === "SEATED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : st === "COMPLETED"
                          ? "bg-stone-100 text-stone-700 border-stone-200"
                          : "bg-rose-50 text-rose-800 border-rose-200";

                      return (
                        <div
                          key={res.id}
                          className="bg-[#FFFDF9] rounded-2xl border border-[#E6DCCF] p-4.5 shadow-sm space-y-3.5 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between border-b border-[#F0E8DC] pb-2.5">
                              <div>
                                <span className="font-mono font-bold text-sm text-[#B85B43]">
                                  RES-{String(res.id).padStart(4, "0")}
                                </span>
                                <div className="text-xs font-semibold text-[#241A14] mt-0.5">
                                  {res.reservation_date || res.booking_date} • {res.time_slot}
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                                {res.status}
                              </span>
                            </div>

                            <div className="text-xs space-y-2 text-[#4A392F]">
                              <div className="flex items-center justify-between">
                                <span className="font-sans font-bold text-sm text-[#241A14]">{custName}</span>
                                <span className="font-bold text-[#665448]">{res.party_size || res.guest_count} Guests</span>
                              </div>

                              <div className="text-[#7A6A5E] font-mono text-[11px]">{custPhone}</div>

                              <div className="flex items-center justify-between text-xs bg-[#FAF7F0] p-2 rounded-lg border border-[#E0D4C2]">
                                <span className="font-semibold text-[#665448]">Assigned Table:</span>
                                <span className="font-bold text-[#241A14]">
                                  {res.table_name || (res.table_id ? `Table #${res.table_id}` : "Unassigned")}
                                </span>
                              </div>

                              {res.advance_amount !== undefined && Number(res.advance_amount) > 0 && (
                                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-bold flex items-center justify-between">
                                  <span>Deposit Paid:</span>
                                  <span>₹{Number(res.advance_amount).toFixed(0)} ({res.payment_status || "PAID"})</span>
                                </div>
                              )}

                              {res.upi_utr && (
                                <div className="text-[10px] text-[#8C7A6D] font-mono">
                                  UTR: {res.upi_utr}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#F0E8DC]">
                            {!res.table_id && st !== "CANCELLED" && st !== "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpAssigningRes(res);
                                  setSelectedAssignTableId(displayTableOverviews[0]?.table_id || 1);
                                }}
                                className="py-1.5 px-3 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#B85B43] border border-[#E0D4C2] font-bold text-xs transition-colors cursor-pointer shadow-xs"
                              >
                                Assign Table
                              </button>
                            )}
                            {st !== "SEATED" && st !== "COMPLETED" && st !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOpReservationStatus(res.id, "SEATED")}
                                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                              >
                                Seat Guests
                              </button>
                            )}
                            {st === "CONFIRMED" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOpReservationStatus(res.id, "ARRIVED")}
                                className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                              >
                                Arrived
                              </button>
                            )}
                            {st !== "CANCELLED" && st !== "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateOpReservationStatus(res.id, "CANCELLED")}
                                className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-VIEW 3: KOT ORDERS ON SELECTED DATE */}
            {opSubTab === "kots" && (
              <div className="space-y-4">
                <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-[#E6DCCF] flex items-center justify-between bg-[#F3EDE2]">
                    <h3 className="text-sm font-sans font-bold text-[#241A14]">
                      KOT Kitchen Tickets on <span className="font-mono">{opDate}</span>
                    </h3>
                    <span className="text-xs font-bold text-[#B85B43]">
                      Total Sales: ₹{Number(opSalesTotal || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF7F0] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                        <tr>
                          <th className="p-4">KOT Ticket</th>
                          <th className="p-4">Table</th>
                          <th className="p-4">Order / Time</th>
                          <th className="p-4">Items Summary</th>
                          <th className="p-4">Total Amount</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0E8DC]">
                        {opKots.length > 0 ? (
                          opKots.map((k: any) => (
                            <tr key={k.id} className="hover:bg-[#FAF7F0] transition-colors">
                              <td className="p-4 font-mono font-bold text-[#B85B43]">
                                {k.kot_number || `#KOT-${k.id}`}
                              </td>
                              <td className="p-4 font-bold text-[#241A14]">
                                {(() => {
                                  const kFl = getTableFloor(k.table_id || k.table_number);
                                  return `Table #${kFl.floor_table_num} (${kFl.short})`;
                                })()}
                              </td>
                              <td className="p-4 text-[#665448]">
                                {k.created_at
                                  ? new Date(k.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </td>
                              <td className="p-4">
                                {k.items && k.items.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {k.items.map((it: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 rounded bg-[#FAF7F0] border border-[#E0D4C2] text-[10px] text-[#241A14]"
                                      >
                                        {it.quantity}x {it.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[#8C7A6D]">{k.items_count || 0} items</span>
                                )}
                              </td>
                              <td className="p-4 font-mono font-bold text-[#241A14]">
                                ₹{Number(k.total_amount || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    k.status === "SERVED"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : k.status === "READY"
                                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                                      : "bg-amber-100 text-amber-800 border border-amber-300"
                                  }`}
                                >
                                  {k.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-[#8C7A6D]">
                              No KOT kitchen tickets placed on {opDate}.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY & FOOD CATEGORIES MANAGEMENT */}
        {activeTab === "menu" && (
          <div className="space-y-6">
            {/* 1. Header with Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-sans font-bold text-[#241A14]">
                    Menu & Categories
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F3EDE2] text-[#B85B43] border border-[#E0D4C2]">
                    {categories.length} Categories • {menuItems.length} Food Items
                  </span>
                </div>
                <p className="text-xs text-[#7A6A5E] mt-1">
                  Manage food categories, add items to any category, and edit names, descriptions, prices and stock status across POS and customer digital ordering.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryData({ name: "", display_order: categories.length + 1 });
                    setIsCreatingCategory(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#261C18] hover:bg-[#3D2C24] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4 text-[#EAD8C7]" />
                  <span>+ New Category</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewItemData({
                      name: "",
                      category_id: selectedCategoryFilter === "all" ? (categories[0]?.id || 1) : Number(selectedCategoryFilter),
                      description: "",
                      price: 350,
                    });
                    setIsCreatingItem(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#B85B43] hover:bg-[#A34B34] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Food Item</span>
                </button>
              </div>
            </div>

            {/* 2. CATEGORIES SECTION (CARDS HUB) */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#F0E8DC] pb-3">
                <div>
                  <h3 className="font-sans font-bold text-sm text-[#241A14] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#B85B43]" />
                    Food Item Category Sections
                  </h3>
                  <p className="text-[11px] text-[#7A6A5E]">
                    Select any category below to filter items, add food items directly to it, or edit the category name.
                  </p>
                </div>
                <div className="text-xs font-bold text-[#8C7A6D]">
                  {categories.length} Total Categories
                </div>
              </div>

              {/* Grid of Category Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {categories.map((c, idx) => {
                  const catItems = menuItems.filter((i) => i.category_id === c.id);
                  const inStock = catItems.filter((i) => i.is_available).length;
                  const isSelected = selectedCategoryFilter === c.id;

                  return (
                    <div
                      key={c.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isSelected
                          ? "bg-[#FAF5ED] border-[#B85B43] shadow-sm ring-1 ring-[#B85B43]"
                          : "bg-[#FFFDF9] border-[#E8DFC9] hover:border-[#CDBFA8]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B85B43]">
                              Category #{c.display_order || idx + 1}
                            </span>
                            <h4 className="font-sans font-extrabold text-sm text-[#241A14] mt-0.5 leading-snug">
                              {c.name}
                            </h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0E1] text-[#9E3E26] border border-[#E8DFC9] shrink-0">
                            {catItems.length} {catItems.length === 1 ? "Item" : "Items"}
                          </span>
                        </div>

                        <div className="text-[11px] text-[#7A6A5E] flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{inStock} Available in Stock</span>
                        </div>
                      </div>

                      {/* Category Action Buttons */}
                      <div className="pt-3 mt-3 border-t border-[#F0E8DC] flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenAddItemForCategory(c.id)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#241A14] border border-[#E0D4C2] font-bold text-[11px] transition-colors cursor-pointer text-center"
                          title={`Add a new food item into ${c.name}`}
                        >
                          + Add Item
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(c);
                            setEditCategoryData({ name: c.name, display_order: c.display_order || idx + 1 });
                          }}
                          className="py-1.5 px-2.5 rounded-xl bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#665448] hover:text-[#241A14] border border-[#E0D4C2] font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                          title="Edit Category Name & Order"
                        >
                          <Edit3 className="w-3 h-3 text-[#B85B43]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryFilter(isSelected ? "all" : c.id)}
                          className={`py-1.5 px-2.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#241A14] text-white"
                              : "bg-[#FAF7F0] hover:bg-[#F3EDE2] text-[#665448] border border-[#E0D4C2]"
                          }`}
                          title="Filter table below to this category"
                        >
                          {isSelected ? "Active" : "View"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Filter & Search Bar */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full min-w-0 flex-1 sm:w-auto sm:min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6D]" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search food item name, price, or ingredients..."
                  className="w-full bg-[#FAF6EE] border border-[#E0D4C2] focus:border-[#B85B43] focus:bg-white rounded-xl pl-10 pr-4 py-2 text-xs text-[#241A14] placeholder-[#A8988B] outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategoryFilter === "all"
                      ? "bg-[#241A14] text-white shadow-xs"
                      : "bg-[#FAF6EE] border border-[#E0D4C2] text-[#665448] hover:bg-[#F0E8DA]"
                  }`}
                >
                  All Categories ({menuItems.length})
                </button>
                {categories.map((c) => {
                  const count = menuItems.filter((i) => i.category_id === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        selectedCategoryFilter === c.id
                          ? "bg-[#241A14] text-white shadow-xs"
                          : "bg-[#FAF6EE] border border-[#E0D4C2] text-[#665448] hover:bg-[#F0E8DA]"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedCategoryFilter === c.id ? "bg-white/20 text-white" : "bg-[#EAE0D2] text-[#665448]"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Category Notice Bar */}
            {selectedCategoryFilter !== "all" && (
              <div className="flex items-center justify-between p-3.5 bg-[#FAF5ED] rounded-xl border border-[#E0D4C2] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#241A14]">Filtered Category:</span>
                  <span className="px-2.5 py-1 rounded-md bg-[#B85B43] text-white font-bold uppercase text-[10px] tracking-wider">
                    {categories.find((c) => c.id === selectedCategoryFilter)?.name || "Selected"}
                  </span>
                  <span className="text-[#7A6A5E]">
                    ({filteredMenuItems.length} items shown)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddItemForCategory(Number(selectedCategoryFilter))}
                  className="inline-flex items-center gap-1 text-[#B85B43] hover:underline font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item to this Category</span>
                </button>
              </div>
            )}

            {/* Food Items Table */}
            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                    <tr>
                      <th className="p-4">Food Item</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Price (₹)</th>
                      <th className="p-4">Live Stock Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DC]">
                    {filteredMenuItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-[#8C7A6D]">
                          <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#B85B43]" />
                          <p className="font-semibold text-sm text-[#4A392F]">No food items matching your filter</p>
                          <p className="text-[11px] text-[#A8988B] mt-1">
                            Use &quot;+ Add Food Item&quot; to add a new dish to this category.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredMenuItems.map((item) => {
                        const category = categories.find((c) => c.id === item.category_id);
                        return (
                          <tr key={item.id} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="p-4 font-bold text-[#241A14]">{item.name}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-md bg-[#FAF0E1] text-[10px] text-[#B85B43] font-bold uppercase tracking-wider border border-[#E8DFC9]">
                                {category?.name || "General"}
                              </span>
                            </td>
                            <td className="p-4 text-[#665448] max-w-xs truncate">{item.description || "—"}</td>
                            <td className="p-4 font-extrabold text-[#B85B43] text-sm">₹{item.price}</td>
                            <td className="p-4">
                              <button
                                type="button"
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
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="inline-flex items-center gap-1 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#241A14] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#B85B43]" />
                                <span>Edit Item</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMenuItem(item.id)}
                                className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Delete Food Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {/* TAB: RAW MATERIAL INVENTORY */}
        {activeTab === "inventory" && (() => {
          const qtyFmt = (v: string | number) => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
          const isLow = (r: RawMaterial) => Number(r.current_stock) <= Number(r.reorder_threshold);
          const lowCount = rawItems.filter(isLow).length;
          const q = rawSearch.trim().toLowerCase();
          const shown = rawItems.filter(
            (r) => (!rawLowOnly || isLow(r)) && (!q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q))
          );
          return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-sans font-bold text-[#241A14]">Raw Material Inventory</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F3EDE2] text-[#B85B43] border border-[#E0D4C2]">
                    {rawItems.length} Materials • {lowCount} Low Stock
                  </span>
                </div>
                <p className="text-xs text-[#7A6A5E] mt-1">
                  Track kitchen and bar raw materials. Record purchases, wastage and stock counts to keep levels accurate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewRaw({ name: "", sku: "", unit: "kg", stock: "", reorder: "" })}
                className="inline-flex items-center gap-1.5 bg-[#B85B43] hover:bg-[#A34B34] text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Raw Material</span>
              </button>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C7A6D]" />
                <input
                  type="text"
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Search material name or SKU..."
                  aria-label="Search raw materials"
                  className="w-full bg-[#FAF6EE] border border-[#E0D4C2] focus:border-[#B85B43] focus:bg-white rounded-xl pl-10 pr-4 py-2 text-xs text-[#241A14] placeholder-[#A8988B] outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                {([false, true] as const).map((low) => (
                  <button
                    key={String(low)}
                    type="button"
                    onClick={() => setRawLowOnly(low)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      rawLowOnly === low
                        ? "bg-[#241A14] text-white shadow-xs"
                        : "bg-[#FAF6EE] border border-[#E0D4C2] text-[#665448] hover:bg-[#F0E8DA]"
                    }`}
                  >
                    {low ? `Low Stock (${lowCount})` : `All (${rawItems.length})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                    <tr>
                      <th className="p-4">Material</th>
                      <th className="p-4">In Stock</th>
                      <th className="p-4">Reorder At</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E8DC]">
                    {shown.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-[#8C7A6D]">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#B85B43]" />
                          <p className="font-semibold text-sm text-[#4A392F]">No raw materials found</p>
                        </td>
                      </tr>
                    ) : (
                      shown.map((r) => {
                        const stock = Number(r.current_stock);
                        const status = stock <= 0 ? "Out of Stock" : isLow(r) ? "Low Stock" : "In Stock";
                        return (
                          <tr key={r.id} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-[#241A14]">{r.name}</div>
                              <div className="text-[10px] font-mono text-[#8C7A6D]">{r.sku}</div>
                            </td>
                            <td className="p-4 font-extrabold text-[#241A14] text-sm">
                              {qtyFmt(r.current_stock)} <span className="text-[11px] font-semibold text-[#7A6A5E]">{r.unit_of_measure}</span>
                            </td>
                            <td className="p-4 text-[#665448]">
                              {qtyFmt(r.reorder_threshold)} {r.unit_of_measure}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border whitespace-nowrap ${
                                  status === "In Stock"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : status === "Low Stock"
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => setStockUpdate({ item: r, mode: "PURCHASE", qty: "", ref: "" })}
                                className="inline-flex items-center gap-1 bg-[#FAF6EE] hover:bg-[#F0E8DA] border border-[#E0D4C2] text-[#241A14] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#B85B43]" />
                                <span>Update Stock</span>
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
          );
        })()}

        {/* Update Stock Modal */}
        {stockUpdate && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFDF9] border border-[#E4DCD0] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
              <div className="flex items-start justify-between border-b border-[#F0E8DC] pb-3">
                <div>
                  <h3 className="text-lg font-sans font-extrabold text-[#241A14]">Update Stock: {stockUpdate.item.name}</h3>
                  <p className="text-[#7A6A5E] mt-0.5">
                    Current: {Number(stockUpdate.item.current_stock).toLocaleString("en-IN", { maximumFractionDigits: 3 })} {stockUpdate.item.unit_of_measure}
                  </p>
                </div>
                <button type="button" onClick={() => setStockUpdate(null)} aria-label="Close" className="p-1 rounded-lg text-[#8C7A6D] hover:text-[#241A14] hover:bg-[#F3EDE2] cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["PURCHASE", "Add (Purchase)"],
                  ["WASTE", "Remove (Waste)"],
                  ["COUNT", "Set Count"],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStockUpdate({ ...stockUpdate, mode })}
                    className={`py-2 rounded-xl font-bold cursor-pointer border ${
                      stockUpdate.mode === mode ? "bg-[#261C18] text-white border-[#261C18]" : "bg-[#FAF7F0] text-[#665448] border-[#E0D4C2]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="block space-y-1">
                <span className="font-bold text-[#4A392F]">
                  {stockUpdate.mode === "COUNT" ? "Actual quantity on hand" : "Quantity"} ({stockUpdate.item.unit_of_measure})
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  autoFocus
                  value={stockUpdate.qty}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, qty: e.target.value })}
                  className="w-full bg-[#FAF6EE] border border-[#E0D4C2] focus:border-[#B85B43] rounded-xl px-3 py-2 outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-bold text-[#4A392F]">Reference / note (optional)</span>
                <input
                  type="text"
                  value={stockUpdate.ref}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, ref: e.target.value })}
                  placeholder="e.g. supplier invoice no."
                  maxLength={100}
                  className="w-full bg-[#FAF6EE] border border-[#E0D4C2] focus:border-[#B85B43] rounded-xl px-3 py-2 outline-none"
                />
              </label>

              <div className="pt-2 border-t border-[#F0E8DC] flex justify-end gap-2">
                <button type="button" onClick={() => setStockUpdate(null)} className="px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#E0D4C2] font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleStockUpdate} className="px-4 py-2 rounded-xl bg-[#B85B43] text-white font-bold cursor-pointer">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Raw Material Modal */}
        {newRaw && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFDF9] border border-[#E4DCD0] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-3 text-xs">
              <div className="flex items-start justify-between border-b border-[#F0E8DC] pb-3">
                <h3 className="text-lg font-sans font-extrabold text-[#241A14]">Add Raw Material</h3>
                <button type="button" onClick={() => setNewRaw(null)} aria-label="Close" className="p-1 rounded-lg text-[#8C7A6D] hover:text-[#241A14] hover:bg-[#F3EDE2] cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              {([
                ["name", "Name", "e.g. Parmesan Cheese", "text"],
                ["sku", "SKU", "e.g. RM-PARMESAN", "text"],
                ["stock", "Opening stock", "0", "number"],
                ["reorder", "Reorder at", "0", "number"],
              ] as const).map(([key, label, ph, type]) => (
                <label key={key} className="block space-y-1">
                  <span className="font-bold text-[#4A392F]">{label}</span>
                  <input
                    type={type}
                    min={type === "number" ? "0" : undefined}
                    step={type === "number" ? "any" : undefined}
                    value={newRaw[key]}
                    onChange={(e) => setNewRaw({ ...newRaw, [key]: e.target.value })}
                    placeholder={ph}
                    className="w-full bg-[#FAF6EE] border border-[#E0D4C2] focus:border-[#B85B43] rounded-xl px-3 py-2 outline-none"
                  />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="font-bold text-[#4A392F]">Unit</span>
                <select
                  value={newRaw.unit}
                  onChange={(e) => setNewRaw({ ...newRaw, unit: e.target.value })}
                  className="w-full bg-[#FAF6EE] border border-[#E0D4C2] rounded-xl px-3 py-2 outline-none"
                >
                  {["kg", "g", "l", "ml", "pcs"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
              <div className="pt-2 border-t border-[#F0E8DC] flex justify-end gap-2">
                <button type="button" onClick={() => setNewRaw(null)} className="px-4 py-2 rounded-xl bg-[#FAF7F0] border border-[#E0D4C2] font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleCreateRawItem} className="px-4 py-2 rounded-xl bg-[#B85B43] text-white font-bold cursor-pointer">
                  Add Material
                </button>
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
                  View table bookings, advance deposits, and 7-day historical ledger
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C7A6D]" />
                  <input
                    type="text"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Search by RES ID (e.g. RES-0064, 64), name, phone..."
                    className="bg-[#FFFDF9] border border-[#E0D4C2] focus:border-[#B85B43] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#241A14] placeholder-[#A8988B] outline-none w-72"
                  />
                </div>

                <select
                  value={resFloorFilter}
                  onChange={(e) => setResFloorFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="bg-[#FFFDF9] border border-[#E0D4C2] focus:border-[#B85B43] rounded-xl px-3 py-1.5 text-xs text-[#241A14] outline-none"
                >
                  <option value="all">All Floors</option>
                  {RESTAURANT_FLOORS.filter((f) => !f.isComingSoon).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  value={resDateFilter}
                  onChange={(e) => setResDateFilter(e.target.value)}
                  className="bg-[#FFFDF9] border border-[#E0D4C2] rounded-xl px-3 py-1.5 text-xs text-[#241A14] outline-none"
                />
              </div>
            </div>

            {/* SECTION 1: RECENT RESERVATIONS (LAST 7 DAYS - FULL DETAILS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif font-bold text-[#241A14]">Recent Reservations (Last 7 Days)</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Full Details ({recentReservations.length})
                  </span>
                </div>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                      <tr>
                        <th className="p-4">Reservation ID</th>
                        <th className="p-4">Floor & Table</th>
                        <th className="p-4">Customer Name</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Guests</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Deposit</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0E8DC]">
                      {recentReservations.length > 0 ? (
                        recentReservations.map((r) => (
                          <tr
                            key={r.id}
                            onClick={() => openReservationDetails(r)}
                            className="hover:bg-[#FAF7F0] transition-colors cursor-pointer"
                          >
                            <td className="p-4 font-mono font-bold text-[#B85B43]">
                              {r.booking_id}
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-[#B85B43] block">
                                {r.floor_name || (r.floor_number ? getFloorName(r.floor_number) : "Ground floor")}
                              </span>
                              <span className="text-[11px] font-mono text-[#665448]">
                                {r.table_name || (r.table_id ? `Table ${r.table_id}` : "Auto Assigned")}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-[#241A14]">{r.customer_name}</td>
                            <td className="p-4 text-[#665448] font-mono">{r.customer_phone}</td>
                            <td className="p-4 text-[#665448] font-semibold">{r.party_size} Guests</td>
                            <td className="p-4 text-[#665448]">
                              {r.booking_date} {r.time_slot ? `(${r.time_slot})` : ""}
                            </td>
                            <td className="p-4">
                              <span className="text-emerald-700 font-bold">
                                ₹{Number(r.advance_amount || 0)} ({r.payment_status})
                              </span>
                              {r.upi_utr && (
                                <span className="block text-[10px] text-[#8C7A6D] font-mono">Ref: {r.upi_utr}</span>
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
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReservationDetails(r);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-[#FAF7F0] hover:bg-[#B85B43] hover:text-white text-[#4A392F] border border-[#E0D4C2] text-xs font-bold transition-colors cursor-pointer"
                              >
                                Details →
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-[#8C7A6D]">
                            No recent reservations in the last 7 calendar days.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTION 2: RESERVATION HISTORY (> 7 DAYS - LIMITED DETAILS ONLY) */}
            {historicalReservations.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-serif font-bold text-[#241A14]">Reservation History (Older than 7 Days)</h3>
                    <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-300">
                      Limited Policy View ({historicalReservations.length})
                    </span>
                  </div>
                </div>

                <div className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F3EDE2] text-[#4A392F] uppercase tracking-wider font-bold border-b border-[#E6DCCF]">
                        <tr>
                          <th className="p-4">Reservation / Booking ID</th>
                          <th className="p-4">Customer Name</th>
                          <th className="p-4">Total Guests</th>
                          <th className="p-4">Reservation Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0E8DC]">
                        {historicalReservations.map((r) => (
                          <tr key={r.id} className="hover:bg-[#FAF7F0] transition-colors">
                            <td className="p-4 font-mono font-bold text-[#B85B43]">
                              {r.booking_id}
                            </td>
                            <td className="p-4 font-bold text-[#241A14]">{r.customer_name}</td>
                            <td className="p-4 text-[#665448] font-semibold">{r.party_size} Guests</td>
                            <td className="p-4 text-[#665448]">{r.booking_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: TABLES & QR CODE HUB */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#241A14]">Table Fleet & QR Generation Hub</h2>
                <p className="text-xs text-[#7A6A5E]">
                  Total 13 tables across 5 distinct dining floors with individual guest self-order QR codes
                </p>
              </div>

              {/* Floor Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF7F0] p-1 rounded-xl border border-[#E6DCCF] text-xs">
                <button
                  onClick={() => setTableFloorFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    tableFloorFilter === "all"
                      ? "bg-[#B85B43] text-white shadow-xs"
                      : "text-[#665448] hover:text-[#241A14]"
                  }`}
                >
                  All Floors ({filteredTables.length})
                </button>
                {RESTAURANT_FLOORS.map((fl) => (
                  <button
                    key={fl.id}
                    onClick={() => setTableFloorFilter(fl.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      tableFloorFilter === fl.id
                        ? "bg-[#B85B43] text-white shadow-xs"
                        : "text-[#665448] hover:text-[#241A14]"
                    }`}
                  >
                    <span>{fl.name}</span>
                    {fl.isComingSoon && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded font-normal">
                        Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredTables.map((tbl) => {
                const floorDetail = getTableFloor(tbl.id, tbl.floor_number);
                const relativeNum = floorDetail.floor_table_num;
                return (
                  <div
                    key={tbl.id}
                    className="bg-[#FFFDF9] border border-[#E6DCCF] rounded-2xl p-5 shadow-sm space-y-4 hover:border-[#B85B43] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-sans font-bold text-[#241A14] block">
                          Table #{relativeNum}
                        </span>
                        <span className="text-[11px] font-semibold text-[#B85B43]">
                          {tbl.floor_name || floorDetail.name}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FAF0E1] text-[#B85B43] font-mono text-[10px] font-bold">
                        {tbl.capacity || floorDetail.capacity} Seats
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
                        onClick={() => handleOpenTableQr(`Table ${relativeNum} (${floorDetail.name})`, tbl.qr_token)}
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
                );
              })}
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
                          <td className="p-4 font-bold text-[#B85B43]">
                            {(() => {
                              const kFl = getTableFloor(k.table_id || k.table_number);
                              return `Table #${kFl.floor_table_num} (${kFl.short})`;
                            })()}
                          </td>
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
                <h3 className="text-base font-serif font-bold text-[#241A14]">Edit Menu Item</h3>
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

      {/* MODAL: CREATE CATEGORY */}
      <AnimatePresence>
        {isCreatingCategory && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.form
              onSubmit={handleCreateCategory}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#FFFDF9] border border-[#E6DCCF] rounded-3xl p-6 shadow-2xl space-y-4 text-[#241A14]"
            >
              <div className="flex items-center justify-between border-b border-[#F0E8DC] pb-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-[#B85B43]" />
                  <h3 className="text-base font-serif font-bold text-[#241A14]">Add New Food Category</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="text-[#8C7A6D] hover:text-[#241A14] text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#665448] block mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={newCategoryData.name}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                    placeholder="e.g. Artisanal Garlic Breads, Calzones, Mocktails"
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Display Order (Menu Sort)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newCategoryData.display_order}
                    onChange={(e) => setNewCategoryData({ ...newCategoryData, display_order: Number(e.target.value) })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] font-bold outline-none"
                  />
                  <p className="text-[11px] text-[#8C7A6D] mt-1">Lower numbers appear first on customer menus and POS.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0E8DC]">
                <button
                  type="button"
                  onClick={() => setIsCreatingCategory(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E8DA] text-[#665448] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#B85B43] hover:bg-[#A34B34] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Create Category
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT CATEGORY */}
      <AnimatePresence>
        {editingCategory && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.form
              onSubmit={handleUpdateCategory}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#FFFDF9] border border-[#E6DCCF] rounded-3xl p-6 shadow-2xl space-y-4 text-[#241A14]"
            >
              <div className="flex items-center justify-between border-b border-[#F0E8DC] pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#B85B43]" />
                  <h3 className="text-base font-serif font-bold text-[#241A14]">Edit Food Category</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="text-[#8C7A6D] hover:text-[#241A14] text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#665448] block mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={editCategoryData.name}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#665448] block mb-1">Display Order</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editCategoryData.display_order}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, display_order: Number(e.target.value) })}
                    className="w-full bg-[#FAF7F0] border border-[#E2D6C5] focus:border-[#B85B43] focus:bg-white rounded-xl p-3 text-[#241A14] font-bold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#F0E8DC]">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteCategory(editingCategory.id, editingCategory.name);
                    setEditingCategory(null);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                >
                  Deactivate Category
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-4 py-2.5 rounded-xl bg-[#FAF6EE] hover:bg-[#F0E8DA] text-[#665448] text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#B85B43] hover:bg-[#A34B34] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
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
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#B85B43] mb-2">
                  JAADOO PIZZA PROJECT
                </p>
                <div className="w-28 h-16 rounded-xl overflow-hidden border-2 border-[#9E3E26]/40 shadow-md mb-2.5 bg-white">
                  <img
                    src="/jaadoo_logo.jpg"
                    alt="Jaadoo Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-semibold text-[#665448]">Ground floor</p>
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
                              <p>JAADOO PIZZA PROJECT</p>
                              <h1>Ground floor</h1>
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

        {/* Table Session Details Modal in Operations */}
        {selectedOpTable && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFDF9] border border-[#E4DCD0] rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-start justify-between border-b border-[#F0E8DC] pb-3">
                <div>
                  {(() => {
                    const selFloor = getTableFloor(selectedOpTable.table_id || selectedOpTable.table_number, selectedOpTable.floor_number);
                    const selNum = selectedOpTable.floor_table_num || selFloor.floor_table_num;
                    return (
                      <h3 className="text-xl font-sans font-extrabold text-[#241A14]">
                        Table {selNum} ({selectedOpTable.floor_name || selFloor.name}) Bill Summary
                      </h3>
                    );
                  })()}
                  <p className="text-xs text-[#7A6A5E] mt-0.5">
                    Date: {opDate} • {(selectedOpTable.sessions || []).length} Bills
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOpTable(null)}
                  className="p-1 rounded-lg text-[#8C7A6D] hover:text-[#241A14] hover:bg-[#F3EDE2] cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-[#FAF7F0] p-3 rounded-xl border border-[#E0D4C2]">
                  <span className="font-semibold text-[#665448]">Day Total:</span>
                  <span className="font-mono font-extrabold text-base text-[#B85B43]">
                    ₹{(selectedOpTable.sessions || []).reduce((sum: number, s: any) => sum + Number(s.gross_amount || s.total_amount || 0), 0).toLocaleString("en-IN")}
                  </span>
                </div>

                {(selectedOpTable.sessions || []).length > 0 ? (
                  <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                    {(selectedOpTable.sessions || []).map((s: any) => {
                      const time = (d?: string) =>
                        d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
                      return (
                        <div key={s.session_id} className="rounded-xl border border-[#E0D4C2] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#241A14]">Bill #{s.session_seq}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                s.is_active ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {s.is_active ? "Open" : s.is_settled ? "Settled" : "Closed"}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#7A6A5E]">
                            {time(s.opened_at)} → {s.is_active ? "now" : time(s.closed_at)}
                            {s.customer_name ? ` • ${s.customer_name}` : ""}
                          </div>

                          {(s.items || []).length > 0 ? (
                            <div className="space-y-1 divide-y divide-[#F0E8DC]">
                              {s.items.map((it: any, idx: number) => (
                                <div key={idx} className="pt-1 flex items-center justify-between">
                                  <span className="text-[#241A14]">{it.quantity}x {it.name}</span>
                                  <span className="font-mono text-[#241A14]">
                                    ₹{Number(it.subtotal || it.unit_price * it.quantity || 0).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[#8C7A6D]">No items.</p>
                          )}

                          <div className="pt-2 border-t border-[#F0E8DC] space-y-0.5">
                            <div className="flex justify-between text-[#665448]">
                              <span>Subtotal</span>
                              <span className="font-mono">₹{Number(s.subtotal || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-[#665448]">
                              <span>Tax</span>
                              <span className="font-mono">₹{Number(s.tax_amount || 0).toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between font-bold text-[#241A14]">
                              <span>Total</span>
                              <span className="font-mono text-[#B85B43]">₹{Number(s.gross_amount || s.total_amount || 0).toLocaleString("en-IN")}</span>
                            </div>
                            {Number(s.reservation_credit || 0) > 0 && (
                              <>
                                <div className="flex justify-between text-[#665448]">
                                  <span>Advance Adjusted</span>
                                  <span className="font-mono">−₹{Number(s.reservation_credit).toLocaleString("en-IN")}</span>
                                </div>
                                <div className="flex justify-between font-bold text-[#241A14]">
                                  <span>Net Payable</span>
                                  <span className="font-mono">₹{Number(s.net_amount_due || 0).toLocaleString("en-IN")}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[#8C7A6D] text-center py-4">No bills for this table on {opDate}.</p>
                )}
              </div>

              <div className="pt-2 border-t border-[#F0E8DC] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOpTable(null)}
                  className="px-4 py-2 rounded-xl bg-[#261C18] text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Full Reservation Details Modal */}
        {selectedResDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
            <div className="bg-[#FFFDF9] rounded-2xl w-full max-w-lg p-6 border border-[#E0D4C2] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E0D4C2] pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#B85B43]" />
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#241A14]">
                      Reservation Details
                    </h3>
                    <p className="text-xs font-mono font-bold text-[#B85B43]">
                      {selectedResDetails.booking_id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedResDetails(null); setConfirmCancelRes(false); setArrivalTableId(""); }}
                  className="p-1 rounded-lg hover:bg-[#FAF7F0] text-[#665448] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Guest & Party Info */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#FAF7F0] p-3.5 rounded-xl border border-[#E0D4C2]">
                <div>
                  <span className="text-[#8C7A6D] uppercase text-[10px] font-bold block">Guest Name</span>
                  <span className="font-bold text-[#241A14] text-sm">{selectedResDetails.customer_name}</span>
                </div>
                <div>
                  <span className="text-[#8C7A6D] uppercase text-[10px] font-bold block">Phone</span>
                  <span className="font-mono text-[#241A14]">{selectedResDetails.customer_phone || "Not provided"}</span>
                </div>
                <div>
                  <span className="text-[#8C7A6D] uppercase text-[10px] font-bold block">Party Size</span>
                  <span className="font-bold text-[#241A14]">{selectedResDetails.party_size} Guests</span>
                </div>
                <div>
                  <span className="text-[#8C7A6D] uppercase text-[10px] font-bold block">Date & Time Slot</span>
                  <span className="font-bold text-[#B85B43]">
                    {selectedResDetails.booking_date} • {selectedResDetails.time_slot}
                  </span>
                </div>
              </div>

              {/* Table Seating Info */}
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-[#E0D4C2]">
                  <div>
                    <span className="text-[#8C7A6D] text-[10px] uppercase font-bold block">Assigned Table & Floor</span>
                    <span className="font-bold text-[#241A14]">
                      {selectedResDetails.table_name || (selectedResDetails.table_id ? `Table ${selectedResDetails.table_id}` : "Auto Assigned")}
                    </span>
                    <span className="text-[#8C7A6D] ml-2">
                      ({selectedResDetails.floor_name || (selectedResDetails.floor_number ? getFloorName(selectedResDetails.floor_number) : "Ground Floor")})
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      selectedResDetails.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : selectedResDetails.status === "ARRIVED"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : selectedResDetails.status === "SEATED"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-300"
                        : "bg-stone-100 text-stone-700 border border-stone-300"
                    }`}
                  >
                    {selectedResDetails.status}
                  </span>
                </div>
              </div>

              {/* Deposit & Payment Ledger */}
              <div className="bg-[#FAF7F0] p-3.5 rounded-xl border border-[#E0D4C2] text-xs space-y-2">
                <h4 className="font-serif font-bold text-xs text-[#241A14] uppercase tracking-wider">
                  Payment & Advance Deposit
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#8C7A6D] block">Advance Amount:</span>
                    <span className="font-bold text-emerald-800 font-mono text-sm">
                      ₹{Number(selectedResDetails.advance_amount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6D] block">Payment Status:</span>
                    <span className="font-bold text-[#241A14]">{selectedResDetails.payment_status || "PENDING"}</span>
                  </div>
                  {selectedResDetails.upi_utr && (
                    <div className="col-span-2">
                      <span className="text-[#8C7A6D] block">Bank / UPI Reference (UTR):</span>
                      <span className="font-mono font-bold text-[#241A14]">{selectedResDetails.upi_utr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cancellation outcome */}
              {selectedResDetails.status === "CANCELLED" && (
                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-xs space-y-1">
                  <h4 className="font-serif font-bold text-xs text-rose-900 uppercase tracking-wider">Reservation Cancelled</h4>
                  <div className="flex justify-between text-rose-900">
                    <span>Refund due to guest:</span>
                    <span className="font-mono font-bold">₹{Number(selectedResDetails.cancellation_refund_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-900">
                    <span>Refund status:</span>
                    <span className="font-bold">{(selectedResDetails.cancellation_refund_status || "NO_REFUND").replace(/_/g, " ")}</span>
                  </div>
                  {Number(selectedResDetails.cancellation_refund_amount || 0) > 0 && (
                    <p className="text-[11px] text-rose-800 pt-1">
                      Refunds are not sent automatically. Return this amount to the guest via the original payment method.
                    </p>
                  )}
                </div>
              )}

              {/* Quick Status Actions */}
              {["CONFIRMED", "ARRIVED", "SEATED"].includes(selectedResDetails.status) && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-[#4A392F] uppercase tracking-wider block">
                  Update Reservation Status:
                </span>
                <div className="space-y-2">
                  {["CONFIRMED", "ARRIVED"].includes(selectedResDetails.status) && (
                    <>
                      {!selectedResDetails.table_id && (
                        <label className="block text-xs space-y-1">
                          <span className="font-bold text-[#4A392F]">No table assigned — seat guest at:</span>
                          <select
                            value={arrivalTableId}
                            onChange={(e) => setArrivalTableId(e.target.value ? Number(e.target.value) : "")}
                            className="w-full bg-[#FAF6EE] border border-[#E0D4C2] rounded-xl px-3 py-2 outline-none"
                          >
                            <option value="">Choose a table…</option>
                            {RESTAURANT_TABLES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.table_number} · {getFloorName(t.floor)} ({t.capacity} seats)
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => handleGuestArrived(selectedResDetails)}
                        disabled={isCheckingIn || (!selectedResDetails.table_id && arrivalTableId === "")}
                        className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCheckingIn ? "Checking in…" : "Guest Arrived · Check In & Seat"}
                      </button>
                    </>
                  )}

                  {selectedResDetails.status === "SEATED" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (await handleUpdateOpReservationStatus(selectedResDetails.id, "COMPLETED")) setSelectedResDetails({ ...selectedResDetails, status: "COMPLETED" });
                      }}
                      className="w-full py-2 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
              )}

              {/* Cancel Reservation (only for statuses the backend allows to cancel) */}
              {["HOLD", "PAYMENT_PENDING", "PENDING", "CONFIRMED", "ARRIVED"].includes(selectedResDetails.status) &&
                (confirmCancelRes ? (
                  <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-xs space-y-2.5">
                    <p className="font-bold text-rose-900">
                      Cancel {selectedResDetails.booking_id} for{" "}
                      {selectedResDetails.customer_name}?
                    </p>
                    <p className="text-rose-800">
                      {Number(selectedResDetails.advance_amount || 0) > 0 && selectedResDetails.payment_status === "PAID"
                        ? `The ₹${Number(selectedResDetails.advance_amount).toFixed(2)} advance will be refunded according to your cancellation policy. `
                        : ""}
                      The table and reserved pizza capacity will be released. This cannot be undone.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmCancelRes(false)}
                        disabled={isCancellingRes}
                        className="py-2 rounded-xl bg-white border border-[#E0D4C2] text-[#241A14] font-bold cursor-pointer disabled:opacity-50"
                      >
                        Keep Reservation
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelReservation(selectedResDetails.id)}
                        disabled={isCancellingRes}
                        className="py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isCancellingRes ? "Cancelling..." : "Yes, Cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelRes(true)}
                    className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel Reservation
                  </button>
                ))}

              <div className="pt-3 border-t border-[#E0D4C2] flex justify-end">
                <button
                  type="button"
                  onClick={() => { setSelectedResDetails(null); setConfirmCancelRes(false); setArrivalTableId(""); }}
                  className="px-5 py-2.5 bg-[#261C18] hover:bg-[#B85B43] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
