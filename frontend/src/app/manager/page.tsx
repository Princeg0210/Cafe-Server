"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Wallet,
  CalendarDays,
  UtensilsCrossed,
  RefreshCw,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Eye,
  Check,
  X,
  Plus,
  Edit2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { managerSession } from "@/lib/authFetch";
import { formatBookingId } from "@/lib/bookingId";

const {
  fetch: managerFetch,
  tokenKey: MANAGER_TOKEN_KEY,
  refreshKey: MANAGER_REFRESH_KEY,
  expiredEvent: MANAGER_SESSION_EXPIRED,
  refreshedEvent: MANAGER_TOKEN_REFRESHED,
} = managerSession;

// Types
interface OverviewData {
  period: {
    start: string;
    end: string;
    duration_days: number;
    prior_start: string;
    prior_end: string;
  };
  revenue: {
    gross_subtotal: string;
    discounts: string;
    taxes: string;
    total_dining_consumption: string;
    reservation_credits_applied: string;
    net_pos_checkout_due: string;
    net_sales: string;
    prior_net_sales: string;
    revenue_growth_pct: number | null;
    completed_bills_count: number;
    aov: string;
    accounting_note?: string;
  };
  collections: {
    net_checkout_collections: string;
    advance_deposits_collected: string;
    total_funds_collected: string;
    by_method: Record<string, string>;
    counts_by_method: Record<string, number>;
  };
  upi_reconciliation: {
    verified_settled_amount: string;
    verified_settled_count: number;
    review_required_amount: string;
    review_required_count: number;
    failed_amount: string;
    failed_count: number;
    payment_ledger_upi_amount: string;
    unverified_upi_records_count: number;
  };
  petty_cash: {
    is_configured: boolean;
    status: string;
    opening_balance: string | null;
    closing_balance: string | null;
    audit_note: string;
  };
  expenses: {
    received_expenses: string;
    received_count: number;
    ordered_commitments: string;
    ordered_count: number;
    suppliers_breakdown: Record<string, string>;
  };
  profit_and_loss: {
    status: string;
    calculation_basis: string;
    net_sales: string;
    cost_basis_amount: string;
    provisional_surplus: string;
    is_provisional: boolean;
    disclosure: string;
  };
  outstanding: {
    amount: string;
    count: number;
  };
  reservations: {
    total_count: number;
    by_status: Record<string, number>;
    advance_collected: string;
  };
}

interface AnalyticsData {
  period: { start: string; end: string };
  time_series: Array<{
    date: string;
    formatted_date: string;
    gross_sales: string;
    net_sales: string;
    checkout_due: string;
    collections: string;
    orders_count: number;
    expenses: string;
    provisional_surplus: string;
  }>;
  payment_methods: Array<{
    method: string;
    amount: string;
    count: number;
    share_pct: number;
  }>;
  top_items: Array<{
    name: string;
    category: string;
    price: string;
    quantity: number;
    revenue: string;
  }>;
  expense_suppliers: Array<{
    supplier_name: string;
    total_cost: string;
    po_count: number;
  }>;
  reservation_analytics: Array<{
    status: string;
    count: number;
    guest_count: number;
  }>;
}

interface PaymentItem {
  id: number;
  bill_id: number;
  dining_session_id: number | null;
  table_id: number | null;
  payment_method: string;
  amount_paid: string;
  transaction_reference: string | null;
  idempotency_key: string | null;
  created_at: string | null;
  is_bill_paid: boolean;
  is_verified_bank_credit: boolean;
  verification_status: string;
  verification_provider: string | null;
  verified_at: string | null;
}

interface ReservationItem {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  guest_count: number;
  reservation_date: string;
  time_slot: string;
  status: string;
  payment_status: string;
  advance_amount: number;
  table_id?: number | null;
  table_name?: string | null;
  floor_number?: number | null;
  booking_id?: string;
  upi_utr?: string | null;
}

interface MenuCategoryItem {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface MenuItemRecord {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price: number;
  tax_rate: number;
  is_available: boolean;
  is_active: boolean;
}

export default function KunalManagerPortal() {
  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "analytics" | "payments" | "petty_cash" | "reservations" | "menu"
  >("overview");

  // Global Date Filter
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "7d" | "30d" | "custom">("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Sync / Real-time state
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"connected" | "connecting" | "polling">("connecting");

  // Portal Data States
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsTotalCount, setPaymentsTotalCount] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsFilterTotal, setPaymentsFilterTotal] = useState("0.00");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  // Reservations Data States
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [resSearch, setResSearch] = useState("");
  const [resStatusFilter, setResStatusFilter] = useState("ALL");
  const [verifyingRes, setVerifyingRes] = useState<ReservationItem | null>(null);
  const [enteredUtr, setEnteredUtr] = useState("");
  const [isSubmittingVerify, setIsSubmittingVerify] = useState(false);

  // Menu Data States
  const [categories, setCategories] = useState<MenuCategoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">("ALL");
  const [menuSearch, setMenuSearch] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null>(null);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);

  // Form states for menu edit / add
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formTax, setFormTax] = useState("5.00");
  const [formDesc, setFormDesc] = useState("");
  const [formCatId, setFormCatId] = useState<number>(1);
  const [formAvailable, setFormAvailable] = useState(true);
  const [newCatName, setNewCatName] = useState("");

  // Generic status/action notification toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper: Format Rupee Currency
  const formatINR = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "₹0.00";
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Compute Active Date Range Strings in Asia/Kolkata
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().split("T")[0];

    if (datePreset === "today") {
      const todayStr = toYMD(now);
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      return { start: yStr, end: yStr };
    }
    if (datePreset === "7d") {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      return { start: toYMD(past), end: toYMD(now) };
    }
    if (datePreset === "30d") {
      const past = new Date(now);
      past.setDate(past.getDate() - 29);
      return { start: toYMD(past), end: toYMD(now) };
    }
    if (datePreset === "custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    const todayStr = toYMD(now);
    return { start: todayStr, end: todayStr };
  }, [datePreset, customStart, customEnd]);

  // Auth Initialization Check
  useEffect(() => {
    const stored = localStorage.getItem(MANAGER_TOKEN_KEY);
    if (stored) {
      setToken(stored);
    }
    setIsInitializing(false);

    const onRefreshed = (e: Event) => setToken((e as CustomEvent<string>).detail);
    const onExpired = () => {
      setToken(null);
      localStorage.removeItem(MANAGER_TOKEN_KEY);
      localStorage.removeItem(MANAGER_REFRESH_KEY);
      showToast("Manager session expired. Please sign in again.", "error");
    };

    window.addEventListener(MANAGER_TOKEN_REFRESHED, onRefreshed);
    window.addEventListener(MANAGER_SESSION_EXPIRED, onExpired);
    return () => {
      window.removeEventListener(MANAGER_TOKEN_REFRESHED, onRefreshed);
      window.removeEventListener(MANAGER_SESSION_EXPIRED, onExpired);
    };
  }, []);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await managerFetch(
        `/api/v1/manager/overview?start=${activeDateRange.start}&end=${activeDateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      } else if (res.status === 403) {
        showToast("Access forbidden: Requires Manager or Admin role.", "error");
      }
    } catch (err) {
      console.error("Overview fetch error:", err);
    }
  }, [token, activeDateRange]);

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await managerFetch(
        `/api/v1/manager/analytics?start=${activeDateRange.start}&end=${activeDateRange.end}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
    }
  }, [token, activeDateRange]);

  // Fetch Payments Ledger
  const fetchPayments = useCallback(async () => {
    if (!token) return;
    try {
      let url = `/api/v1/manager/payments?start=${activeDateRange.start}&end=${activeDateRange.end}&page=${paymentsPage}&page_size=50`;
      if (paymentMethodFilter) url += `&method=${encodeURIComponent(paymentMethodFilter)}`;
      if (paymentSearch.trim()) url += `&search=${encodeURIComponent(paymentSearch.trim())}`;

      const res = await managerFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setPayments(data.items || []);
        setPaymentsTotalCount(data.total_count || 0);
        setPaymentsTotalPages(data.total_pages || 1);
        setPaymentsFilterTotal(data.filtered_total_amount || "0.00");
      }
    } catch (err) {
      console.error("Payments fetch error:", err);
    }
  }, [token, activeDateRange, paymentsPage, paymentMethodFilter, paymentSearch]);

  // Fetch Reservations CRM
  const fetchReservations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await managerFetch(`/api/v1/reservations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data || []);
      }
    } catch (err) {
      console.error("Reservations fetch error:", err);
    }
  }, [token]);

  // Fetch Menu Data
  const fetchMenu = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        managerFetch("/api/v1/menu/categories"),
        managerFetch("/api/v1/menu/items"),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (itemRes.ok) setMenuItems(await itemRes.json());
    } catch (err) {
      console.error("Menu fetch error:", err);
    }
  }, []);

  // Master Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchOverview(),
      fetchAnalytics(),
      fetchPayments(),
      fetchReservations(),
      fetchMenu(),
    ]);
    setLastSynced(new Date());
    setIsRefreshing(false);
  }, [fetchOverview, fetchAnalytics, fetchPayments, fetchReservations, fetchMenu]);

  // Trigger Data Loads on Tab or Filter Changes
  useEffect(() => {
    if (token) {
      handleRefresh();
    }
  }, [token, activeDateRange]);

  // WebSocket Data Sync Listener using Established Project Architecture
  useEffect(() => {
    if (!token) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const getWsBase = () => {
      if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "");
      if (typeof window !== "undefined") {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (isLocal) {
          return "ws://127.0.0.1:8000";
        }
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${proto}//${window.location.host}`;
      }
      return "wss://cafe-piza-api.onrender.com";
    };

    const connectWs = () => {
      setSyncStatus("connecting");
      const wsBase = getWsBase();
      // Directly targets the FastAPI root mount @router.websocket("/ws/{channel}")
      const wsUrl = `${wsBase}/ws/admin`;

      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setSyncStatus("connected");
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (
              [
                "BILL_PAID",
                "ORDER_CREATED",
                "RESERVATION_UPDATED",
                "MENU_UPDATED",
                "KOT_UPDATE",
              ].includes(msg.type)
            ) {
              if (msg.type === "MENU_UPDATED") fetchMenu();
              else if (msg.type === "RESERVATION_UPDATED") fetchReservations();
              else {
                fetchOverview();
                fetchAnalytics();
                fetchPayments();
              }
              setLastSynced(new Date());
            }
          } catch {
            // Ignore non-json ping/pong
          }
        };
        ws.onerror = () => {
          setSyncStatus("polling");
        };
        ws.onclose = () => {
          setSyncStatus("polling");
          reconnectTimeout = setTimeout(connectWs, 8000);
        };
      } catch {
        setSyncStatus("polling");
      }
    };

    connectWs();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token, fetchOverview, fetchAnalytics, fetchPayments, fetchReservations, fetchMenu]);

  // Handle Login Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await managerFetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput.trim(),
          password: passwordInput,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.detail || "Invalid manager credentials. Please check username & password.");
        return;
      }

      const data = await res.json();
      setToken(data.access_token);
      localStorage.setItem(MANAGER_TOKEN_KEY, data.access_token);
      if (data.refresh_token) localStorage.setItem(MANAGER_REFRESH_KEY, data.refresh_token);
      showToast("Welcome to Kunal Manager Portal", "success");
    } catch {
      setLoginError("Could not connect to the API server. Please check your network.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem(MANAGER_TOKEN_KEY);
    localStorage.removeItem(MANAGER_REFRESH_KEY);
    showToast("Signed out successfully.", "info");
  };

  // Actions for Reservations
  const handleReservationCheckin = async (resId: number) => {
    if (!token) return;
    try {
      const res = await managerFetch(`/api/v1/reservations/${resId}/checkin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Guest checked in successfully!`, "success");
        fetchReservations();
        fetchOverview();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Checkin failed", "error");
      }
    } catch {
      showToast("Network error checking in guest", "error");
    }
  };

  const handleReservationStatusUpdate = async (resId: number, newStatus: string) => {
    if (!token) return;
    try {
      const res = await managerFetch(`/api/v1/reservations/${resId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Reservation status updated to ${newStatus}`, "success");
        fetchReservations();
        fetchOverview();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Status update failed", "error");
      }
    } catch {
      showToast("Network error updating status", "error");
    }
  };

  // Open Advance Verification Dialog
  const openStaffVerifyModal = (r: ReservationItem) => {
    setVerifyingRes(r);
    setEnteredUtr(r.upi_utr || "");
  };

  // Execute Staff Advance Verification with Validated Body
  const submitStaffVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !verifyingRes) return;
    const cleanUtr = enteredUtr.trim().replace(/\s+/g, "");
    if (cleanUtr.length < 4) {
      showToast("Please enter a valid Bank UTR reference (min 4 characters).", "error");
      return;
    }

    setIsSubmittingVerify(true);
    try {
      const res = await managerFetch(`/api/v1/reservations/${verifyingRes.id}/staff-verify-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ upi_utr: cleanUtr }),
      });
      if (res.ok) {
        showToast(`Advance deposit verified and settled via UTR ${cleanUtr}!`, "success");
        setVerifyingRes(null);
        fetchReservations();
        fetchOverview();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Staff verification failed", "error");
      }
    } catch {
      showToast("Network error verifying payment", "error");
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // Actions for Menu Management
  const handleToggleMenuAvailability = async (item: MenuItemRecord) => {
    if (!token) return;
    try {
      const res = await managerFetch(`/api/v1/menu/items/${item.id}/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      if (res.ok) {
        showToast(`${item.name} is now ${!item.is_available ? "In Stock" : "Sold Out"}`, "success");
        fetchMenu();
      } else {
        showToast("Failed to toggle availability", "error");
      }
    } catch {
      showToast("Network error updating item", "error");
    }
  };

  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const priceNum = parseFloat(formPrice);
    const taxNum = parseFloat(formTax);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast("Please enter a valid price.", "error");
      return;
    }

    try {
      if (editingItem) {
        const res = await managerFetch(`/api/v1/menu/items/${editingItem.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formName.trim(),
            category_id: formCatId,
            price: priceNum,
            tax_rate: taxNum,
            description: formDesc.trim() || null,
            is_available: formAvailable,
          }),
        });
        if (res.ok) {
          showToast(`Updated ${formName} successfully!`, "success");
          setEditingItem(null);
          fetchMenu();
        } else {
          showToast("Failed to update menu item", "error");
        }
      } else {
        const res = await managerFetch(`/api/v1/menu/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formName.trim(),
            category_id: formCatId,
            price: priceNum,
            tax_rate: taxNum,
            description: formDesc.trim() || null,
            is_available: formAvailable,
          }),
        });
        if (res.ok) {
          showToast(`Created ${formName} successfully!`, "success");
          setIsNewItemModalOpen(false);
          fetchMenu();
        } else {
          showToast("Failed to create menu item", "error");
        }
      }
    } catch {
      showToast("Network error saving menu item", "error");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newCatName.trim()) return;
    try {
      const res = await managerFetch("/api/v1/menu/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCatName.trim(),
          display_order: categories.length + 1,
        }),
      });
      if (res.ok) {
        showToast(`Category '${newCatName}' created!`, "success");
        setNewCatName("");
        setIsNewCatModalOpen(false);
        fetchMenu();
      } else {
        showToast("Failed to create category", "error");
      }
    } catch {
      showToast("Network error creating category", "error");
    }
  };

  // Filtered reservations list
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (resStatusFilter !== "ALL" && (r.status || "").toUpperCase() !== resStatusFilter) {
        return false;
      }
      if (resSearch.trim()) {
        const q = resSearch.toLowerCase();
        const bId = (r.booking_id || formatBookingId(r.customer_name, r.customer_phone, r.id)).toLowerCase();
        const name = (r.customer_name || "").toLowerCase();
        const phone = (r.customer_phone || "").toLowerCase();
        if (!bId.includes(q) && !name.includes(q) && !phone.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [reservations, resStatusFilter, resSearch]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((i) => {
      if (selectedCategory !== "ALL" && i.category_id !== selectedCategory) {
        return false;
      }
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase();
        return i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, menuSearch]);

  // Open Edit Item Modal
  const openEditModal = (item: MenuItemRecord) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormPrice(String(item.price));
    setFormTax(String(item.tax_rate));
    setFormDesc(item.description || "");
    setFormCatId(item.category_id);
    setFormAvailable(item.is_available);
  };

  // Open Add Item Modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormName("");
    setFormPrice("");
    setFormTax("5.00");
    setFormDesc("");
    setFormCatId(categories[0]?.id || 1);
    setFormAvailable(true);
    setIsNewItemModalOpen(true);
  };

  // -------------------------------------------------------------
  // RENDERING: 1. Initial Loading
  // -------------------------------------------------------------
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#2D6A4F] border-t-transparent rounded-full animate-spin" />
          <p className="font-serif italic text-[#133826] text-base">Initializing Kunal Manager Portal...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: 2. Authentication Login Screen
  // -------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between font-sans selection:bg-[#52B788]/20">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2DACF] p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-[#EBF5EE] rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="text-center relative z-10 mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden border border-[#E2DACF] shadow-sm bg-white p-1">
                <Image
                  src="/jaadoo_logo.jpg"
                  alt="Jaadoo Pizza Project"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
              <span className="text-[11px] font-sans font-bold tracking-[0.2em] uppercase text-[#2D6A4F] block">
                Official Staff Access
              </span>
              <h1 className="text-3xl font-serif font-bold text-[#133826] mt-1">
                Kunal Manager Portal
              </h1>
              <p className="text-xs text-[#5A6A5E] mt-2 font-sans">
                Financial Operations · Business Analytics · Reservations CRM
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-[#133826] mb-1.5 uppercase tracking-wider">
                  Username / Staff ID
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. kunal"
                  className="w-full px-4 py-3 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-[#133826] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#133826] mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-[#133826] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-3.5 px-4 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-sans font-bold text-sm tracking-wide rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Permissions...</span>
                  </>
                ) : (
                  <span>Access Manager Portal</span>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#EAE3D9] text-center text-[11px] text-[#718074]">
              Protected Management System · Café Piza / Jaadoo Pizza Project
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDERING: 3. Authenticated Manager Portal Shell
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141E16] font-sans flex flex-col selection:bg-[#52B788]/25">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "bg-[#1B4332] text-white border-[#52B788]"
              : toastMessage.type === "error"
              ? "bg-red-800 text-white border-red-500"
              : "bg-[#263228] text-white border-stone-600"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-[#52B788]" />}
          {toastMessage.type === "error" && <AlertCircle className="w-4 h-4 text-red-300" />}
          {toastMessage.type === "info" && <Info className="w-4 h-4 text-stone-300" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP HEADER: Brand Logo + Identity + Navigation Controls */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2DACF] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Left Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#E2DACF] shadow-xs shrink-0">
              <Image
                src="/jaadoo_logo.jpg"
                alt="Jaadoo Logo"
                width={44}
                height={44}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg sm:text-xl text-[#133826] leading-none">
                  Jaadoo Pizza Project
                </span>
                <span className="hidden sm:inline-block bg-[#EBF5EE] text-[#2D6A4F] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#B7E4C7]">
                  Manager
                </span>
              </div>
              <p className="text-[11px] font-serif italic text-[#5A6A5E] mt-0.5">
                Wood-fired · Udaipur · Est. 2024
              </p>
            </div>
          </div>

          {/* Right Identity Title & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4 ml-auto">
            <div className="text-right hidden md:block">
              <h2 className="font-serif font-bold text-base text-[#1B4332] leading-tight">
                Kunal Manager Portal
              </h2>
              <div className="flex items-center justify-end gap-1.5 text-[11px] text-[#5A6A5E]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === "connected"
                      ? "bg-emerald-500 animate-pulse"
                      : syncStatus === "connecting"
                      ? "bg-amber-400 animate-ping"
                      : "bg-amber-500"
                  }`}
                />
                <span>
                  {syncStatus === "connected"
                    ? "Live Connected"
                    : syncStatus === "connecting"
                    ? "Connecting..."
                    : "Periodic Polling"} · Synced{" "}
                  {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Authoritative Data"
              className="p-2.5 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] hover:bg-[#F3EFEA] text-[#133826] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#2D6A4F]" : ""}`} />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50/50 hover:bg-red-100/70 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION BAR & DATE FILTER STRIP */}
        <div className="bg-[#FAF8F5] border-t border-[#EAE3D9] px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* 6 Core Tabs */}
            <nav className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: "overview", label: "Overview", icon: Layers },
                { id: "analytics", label: "Financial Analytics", icon: TrendingUp },
                { id: "payments", label: "Payments & Collections", icon: CreditCard },
                { id: "petty_cash", label: "Petty Cash", icon: Wallet },
                { id: "reservations", label: "Reservations CRM", icon: CalendarDays },
                { id: "menu", label: "Menu Management", icon: UtensilsCrossed },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-[#1B4332] text-white shadow-xs"
                        : "text-[#4A5568] hover:text-[#133826] hover:bg-[#F0EBE1]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Date Range Selector Strip (Asia/Kolkata Calendar Dates) */}
            <div className="flex items-center gap-1.5 self-end md:self-auto bg-white p-1 rounded-xl border border-[#E2DACF] shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#718074] px-2 hidden sm:inline">
                Period:
              </span>
              {(["today", "yesterday", "7d", "30d", "custom"] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                    datePreset === preset
                      ? "bg-[#2D6A4F] text-white"
                      : "text-[#5A6A5E] hover:text-[#133826] hover:bg-stone-100"
                  }`}
                >
                  {preset === "7d" ? "7 Days" : preset === "30d" ? "30 Days" : preset}
                </button>
              ))}

              {datePreset === "custom" && (
                <div className="flex items-center gap-1.5 pl-2 border-l border-stone-200">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="text-xs p-1 rounded border border-stone-300 bg-stone-50"
                  />
                  <span className="text-xs text-stone-400">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="text-xs p-1 rounded border border-stone-300 bg-stone-50"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ============================================================= */}
        {/* TAB 1: OVERVIEW — EXECUTIVE FINANCIAL DASHBOARD               */}
        {/* ============================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Period Badge Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#E2DACF] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#2D6A4F]" />
                <span className="text-xs text-[#5A6A5E]">Active Business Period (IST):</span>
                <span className="text-xs font-bold text-[#133826]">
                  {activeDateRange.start} {activeDateRange.start !== activeDateRange.end ? `to ${activeDateRange.end}` : "(Single Day)"}
                </span>
                {overview?.revenue?.revenue_growth_pct !== null && overview?.revenue?.revenue_growth_pct !== undefined && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      overview.revenue.revenue_growth_pct >= 0
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {overview.revenue.revenue_growth_pct >= 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {overview.revenue.revenue_growth_pct > 0 ? "+" : ""}
                    {overview.revenue.revenue_growth_pct}% vs Prior Period
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#718074]">
                Authoritative calculation engine · Half-open UTC timestamp bounds
              </div>
            </div>

            {/* 7 TOP-LEVEL METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Dining Sales (Clarified Consumption vs POS Due) */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden group hover:border-[#2D6A4F] transition-all">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Total Dining Sales</span>
                  <Receipt className="w-4 h-4 text-[#2D6A4F]" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#133826]">
                    {formatINR(overview?.revenue?.total_dining_consumption || overview?.revenue?.net_sales)}
                  </div>
                  <div className="mt-2 text-[11px] text-[#718074] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Gross Food & Beverage:</span>
                      <span className="font-semibold text-stone-700">{formatINR(overview?.revenue?.gross_subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discounts Applied:</span>
                      <span className="font-semibold text-amber-700">-{formatINR(overview?.revenue?.discounts)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST Tax (5%):</span>
                      <span className="font-semibold text-stone-700">+{formatINR(overview?.revenue?.taxes)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-semibold border-t border-dashed border-stone-200 pt-1 mt-1">
                      <span>Advance Deposits Credited:</span>
                      <span>-{formatINR(overview?.revenue?.reservation_credits_applied)}</span>
                    </div>
                    <div className="flex justify-between text-[#133826] font-bold">
                      <span>Net POS Checkout Due:</span>
                      <span>{formatINR(overview?.revenue?.net_pos_checkout_due)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: UPI Collections */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden group hover:border-[#2D6A4F] transition-all">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Verified UPI Collections</span>
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#133826]">
                    {formatINR(overview?.upi_reconciliation?.verified_settled_amount)}
                  </div>
                  <div className="mt-2 text-[11px] text-[#718074] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Bank Settled Credits:</span>
                      <span className="font-semibold text-emerald-700">
                        {overview?.upi_reconciliation?.verified_settled_count || 0} txn
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Requires Staff Review:</span>
                      <span className="font-semibold text-amber-700">
                        {formatINR(overview?.upi_reconciliation?.review_required_amount)} ({overview?.upi_reconciliation?.review_required_count || 0})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>POS Ledger UPI Total:</span>
                      <span className="font-semibold text-stone-700">{formatINR(overview?.collections?.by_method?.UPI)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Total Recorded Purchases / Expenses */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden group hover:border-[#2D6A4F] transition-all">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Recorded Purchases</span>
                  <DollarSign className="w-4 h-4 text-stone-600" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#133826]">
                    {formatINR(overview?.expenses?.received_expenses)}
                  </div>
                  <div className="mt-2 text-[11px] text-[#718074] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Received Invoices:</span>
                      <span className="font-semibold text-stone-700">{overview?.expenses?.received_count || 0} orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ordered / Committed:</span>
                      <span className="font-semibold text-stone-600">
                        {formatINR(overview?.expenses?.ordered_commitments)} ({overview?.expenses?.ordered_count || 0})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Category Source:</span>
                      <span className="font-semibold text-stone-700">Inventory POs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Profit & Loss (Provisional) */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden group hover:border-[#2D6A4F] transition-all">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Operating Surplus</span>
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                    Provisional
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#133826]">
                    {formatINR(overview?.profit_and_loss?.provisional_surplus)}
                  </div>
                  <div className="mt-2 text-[11px] text-[#718074] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Total Dining Sales:</span>
                      <span className="font-semibold text-stone-700">{formatINR(overview?.profit_and_loss?.net_sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Less Received Purchases:</span>
                      <span className="font-semibold text-stone-700">-{formatINR(overview?.expenses?.received_expenses)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-amber-700 font-medium italic">
                      <span>Recipe COGS:</span>
                      <span>Linkage pending</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: Petty Cash Status */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Petty Cash Balance</span>
                  <Wallet className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-3">
                  <div className="text-lg font-serif font-bold text-stone-500 italic">
                    Not Configured
                  </div>
                  <p className="mt-2 text-[11px] text-[#718074] leading-snug">
                    A dedicated petty cash ledger does not currently exist in the database. Balance is reported honestly without fabricating numbers.
                  </p>
                </div>
              </div>

              {/* Card 6: Outstanding Amounts */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Outstanding Receivables</span>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#133826]">
                    {formatINR(overview?.outstanding?.amount)}
                  </div>
                  <div className="mt-2 text-[11px] text-[#718074] space-y-0.5">
                    <div className="flex justify-between">
                      <span>Unsettled Bills Count:</span>
                      <span className="font-semibold text-stone-700">{overview?.outstanding?.count || 0} bills</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-amber-700">Awaiting Checkout</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 7: Reservations & Sales Velocity */}
              <div className="bg-white rounded-2xl p-5 border border-[#E2DACF] shadow-xs relative overflow-hidden sm:col-span-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5A6A5E]">
                  <span>Reservations & Order Velocity</span>
                  <CalendarDays className="w-4 h-4 text-[#2D6A4F]" />
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-[#718074] block">Total Bookings</span>
                    <span className="text-xl font-serif font-bold text-[#133826]">
                      {overview?.reservations?.total_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718074] block">Advance Collected</span>
                    <span className="text-xl font-serif font-bold text-emerald-800">
                      {formatINR(overview?.reservations?.advance_collected)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718074] block">Settled Bills</span>
                    <span className="text-xl font-serif font-bold text-[#133826]">
                      {overview?.revenue?.completed_bills_count || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718074] block">Avg Ticket (AOV)</span>
                    <span className="text-xl font-serif font-bold text-[#133826]">
                      {formatINR(overview?.revenue?.aov)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT METHOD BREAKDOWN STRIP */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2DACF] shadow-xs">
              <h3 className="font-serif font-bold text-base text-[#133826] mb-4">
                Collections Breakdown by Payment Method
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                  { key: "UPI", label: "UPI Collections", color: "border-l-4 border-l-emerald-600 bg-emerald-50/30" },
                  { key: "CASH", label: "Cash Register", color: "border-l-4 border-l-amber-600 bg-amber-50/30" },
                  { key: "CARD", label: "Card Swipe / POS", color: "border-l-4 border-l-blue-600 bg-blue-50/30" },
                  { key: "OTHER", label: "Other Methods", color: "border-l-4 border-l-stone-500 bg-stone-50/30" },
                ].map((item) => {
                  const amt = overview?.collections?.by_method?.[item.key] || "0.00";
                  const count = overview?.collections?.counts_by_method?.[item.key] || 0;
                  return (
                    <div key={item.key} className={`p-4 rounded-xl border border-[#EAE3D9] ${item.color}`}>
                      <span className="text-xs font-semibold text-[#5A6A5E] block">{item.label}</span>
                      <span className="text-xl font-serif font-bold text-[#133826] block mt-1">
                        {formatINR(amt)}
                      </span>
                      <span className="text-[11px] text-[#718074] mt-1 block">
                        {count} completed transactions
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AUDIT & DISCLOSURE FOOTNOTE */}
            <div className="p-4 rounded-xl bg-[#EBF5EE] border border-[#B7E4C7] text-xs text-[#1B4332] flex items-start gap-3">
              <Info className="w-5 h-5 shrink-0 text-[#2D6A4F] mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Authoritative Data Integrity & Accounting Notes:</span>
                <p className="text-[11px] leading-relaxed text-[#2D6A4F]">
                  Total Dining Sales reflects served orders (e.g. ₹1,200). When an advance reservation deposit is credited (e.g. ₹500), Net POS Checkout Due is the remaining balance payable (₹700). Customer-entered raw references are not counted as confirmed collections until settled in bank credit records. Operating surplus reflects recorded supplier receipts; dish-level recipe COGS is pending complete recipe-inventory linking.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: FINANCIAL ANALYTICS & CHARTS                           */}
        {/* ============================================================= */}
        {activeTab === "analytics" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Daily Revenue Time-Series Trend */}
            <div className="bg-white rounded-2xl p-6 border border-[#E2DACF] shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#133826]">
                    Revenue & Collections Daily Trend
                  </h3>
                  <p className="text-xs text-[#5A6A5E]">
                    Daily progression of Total Dining Sales and Verified Collections in Asia/Kolkata
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#1B4332]" />
                    <span>Dining Sales</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#52B788]" />
                    <span>Collections</span>
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              {analytics?.time_series && analytics.time_series.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-64 flex items-end gap-2 pt-8 pb-4 px-2 border-b border-[#EAE3D9] overflow-x-auto scrollbar-none">
                    {(() => {
                      const maxVal = Math.max(
                        ...analytics.time_series.map((d) => Math.max(parseFloat(d.net_sales), parseFloat(d.collections))),
                        1000
                      );
                      return analytics.time_series.map((point) => {
                        const netH = (parseFloat(point.net_sales) / maxVal) * 100;
                        const colH = (parseFloat(point.collections) / maxVal) * 100;
                        return (
                          <div
                            key={point.date}
                            className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group relative"
                          >
                            <div className="absolute -top-12 bg-[#133826] text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none shadow-lg">
                              <div>{point.formatted_date}</div>
                              <div>Sales: {formatINR(point.net_sales)}</div>
                              <div>Paid: {formatINR(point.collections)}</div>
                            </div>

                            <div className="w-full flex items-end justify-center gap-1 h-44">
                              <div
                                style={{ height: `${Math.max(netH, 2)}%` }}
                                className="w-3.5 bg-[#1B4332] rounded-t-sm transition-all group-hover:bg-[#2D6A4F]"
                              />
                              <div
                                style={{ height: `${Math.max(colH, 2)}%` }}
                                className="w-3.5 bg-[#52B788] rounded-t-sm transition-all group-hover:bg-[#74C69D]"
                              />
                            </div>
                            <span className="text-[10px] text-[#718074] font-medium truncate w-full text-center">
                              {point.formatted_date}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-[#718074]">
                  No sales recorded for the selected period.
                </div>
              )}
            </div>

            {/* 2-Column: Top Items & Payment Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Selling Menu Items */}
              <div className="bg-white rounded-2xl p-6 border border-[#E2DACF] shadow-xs">
                <h3 className="font-serif font-bold text-base text-[#133826] mb-1">
                  Top-Selling Menu Items
                </h3>
                <p className="text-xs text-[#5A6A5E] mb-4">
                  Ranked by actual completed order revenue
                </p>

                {analytics?.top_items && analytics.top_items.length > 0 ? (
                  <div className="divide-y divide-[#EAE3D9]">
                    {analytics.top_items.map((item, idx) => (
                      <div key={item.name} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-[#EBF5EE] text-[#2D6A4F] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-[#133826] block truncate">{item.name}</span>
                            <span className="text-[10px] text-[#718074]">{item.category} · {formatINR(item.price)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-[#133826] block">{formatINR(item.revenue)}</span>
                          <span className="text-[10px] text-[#718074]">{item.quantity} orders</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#718074]">
                    No menu item orders in this period.
                  </div>
                )}
              </div>

              {/* Expense Breakdown by Supplier */}
              <div className="bg-white rounded-2xl p-6 border border-[#E2DACF] shadow-xs">
                <h3 className="font-serif font-bold text-base text-[#133826] mb-1">
                  Supplier Purchase Expenses
                </h3>
                <p className="text-xs text-[#5A6A5E] mb-4">
                  Received purchase orders and supplier distributions
                </p>

                {analytics?.expense_suppliers && analytics.expense_suppliers.length > 0 ? (
                  <div className="divide-y divide-[#EAE3D9]">
                    {analytics.expense_suppliers.map((supp) => (
                      <div key={supp.supplier_name} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#133826] block">{supp.supplier_name}</span>
                          <span className="text-[10px] text-[#718074]">{supp.po_count} invoices processed</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#133826] block">{formatINR(supp.total_cost)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#718074]">
                    No supplier invoices recorded for this period.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: PAYMENTS & COLLECTIONS AUDIT                           */}
        {/* ============================================================= */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter & Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2DACF] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#718074]" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Search by UTR, Bill ID, Reference..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  />
                </div>

                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs font-semibold text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                >
                  <option value="">All Payment Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs bg-[#EBF5EE] px-4 py-2 rounded-xl border border-[#B7E4C7]">
                <span className="text-[#2D6A4F]">Filtered Ledger Total:</span>
                <span className="font-bold text-[#133826]">{formatINR(paymentsFilterTotal)}</span>
                <span className="text-[10px] text-[#5A6A5E]">({paymentsTotalCount} transactions)</span>
              </div>
            </div>

            {/* Payments Audit Table */}
            <div className="bg-white rounded-2xl border border-[#E2DACF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#EAE3D9] text-[#5A6A5E] uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Txn ID / Bill</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Reference / UTR</th>
                      <th className="py-3 px-4">Audit Status</th>
                      <th className="py-3 px-4">Timestamp (IST)</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE3D9]">
                    {payments.length > 0 ? (
                      payments.map((p) => {
                        const isVerified = p.is_verified_bank_credit || p.verification_status === "VERIFIED_CASH";
                        return (
                          <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium">
                              <span className="font-bold text-[#133826]">#{p.id}</span>
                              <span className="text-[11px] text-[#718074] block">Bill #{p.bill_id}</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#133826]">
                              {p.payment_method}
                            </td>
                            <td className="py-3.5 px-4 font-serif font-bold text-sm text-[#133826]">
                              {formatINR(p.amount_paid)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                              {p.transaction_reference || "—"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  p.is_verified_bank_credit
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : p.verification_status === "VERIFIED_CASH"
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-stone-100 text-stone-700 border border-stone-300"
                                }`}
                              >
                                {isVerified ? (
                                  <Check className="w-3 h-3 text-emerald-700" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                )}
                                {p.verification_status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-[#718074]">
                              {p.created_at ? new Date(p.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedPayment(p)}
                                className="p-1.5 rounded-lg border border-[#D7CDBF] bg-white hover:bg-stone-50 text-[#133826] cursor-pointer"
                                title="View Audit Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          No transactions found matching the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {paymentsTotalPages > 1 && (
                <div className="p-4 border-t border-[#EAE3D9] flex items-center justify-between text-xs">
                  <span className="text-[#718074]">
                    Page {paymentsPage} of {paymentsTotalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={paymentsPage <= 1}
                      onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-[#D7CDBF] bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={paymentsPage >= paymentsTotalPages}
                      onClick={() => setPaymentsPage((p) => Math.min(paymentsTotalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-[#D7CDBF] bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Audit Detail Modal */}
            {selectedPayment && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2DACF] animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-lg text-[#133826]">
                      Payment Audit Details
                    </h3>
                    <button
                      onClick={() => setSelectedPayment(null)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-[#718074]">Transaction ID:</span>
                      <span className="font-mono font-bold text-[#133826]">#{selectedPayment.id}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-[#718074]">Bill Reference:</span>
                      <span className="font-mono font-bold text-[#133826]">Bill #{selectedPayment.bill_id}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-[#718074]">Payment Method:</span>
                      <span className="font-bold text-[#133826]">{selectedPayment.payment_method}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-[#718074]">Amount Paid:</span>
                      <span className="font-serif font-bold text-base text-[#133826]">
                        {formatINR(selectedPayment.amount_paid)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-[#718074]">Reference / UTR:</span>
                      <span className="font-mono text-stone-700">{selectedPayment.transaction_reference || "None"}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-stone-100">
                      <span className="text-[#718074]">Verification Status:</span>
                      <span className="font-bold text-[#2D6A4F]">{selectedPayment.verification_status}</span>
                    </div>
                    {selectedPayment.verification_provider && (
                      <div className="flex justify-between py-1.5 border-b border-stone-100">
                        <span className="text-[#718074]">Bank Source:</span>
                        <span className="font-mono text-stone-700">{selectedPayment.verification_provider}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5">
                      <span className="text-[#718074]">Recorded Timestamp:</span>
                      <span className="text-stone-700">
                        {selectedPayment.created_at ? new Date(selectedPayment.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="w-full mt-6 py-2.5 bg-[#1B4332] text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Close Inspection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: PETTY CASH MANAGEMENT (HONEST AUDIT STATE)             */}
        {/* ============================================================= */}
        {activeTab === "petty_cash" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-8 border border-[#E2DACF] shadow-xs max-w-3xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#EBF5EE] text-[#2D6A4F] flex items-center justify-center mb-5">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="font-serif font-bold text-2xl text-[#133826]">
                Petty Cash Ledger Architecture
              </h3>
              <p className="text-sm text-[#5A6A5E] mt-2 leading-relaxed">
                As required by Section 7 of the project specification: We do not invent an artificial cash balance from unrelated payment records.
              </p>

              <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Active Ledger Status: Not Configured in Database</span>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    The existing database schema does not currently include a dedicated petty cash transaction table. Per our development guardrails, schema migrations require explicit owner approval.
                  </p>
                </div>
              </div>

              {/* Proposed Architecture */}
              <div className="mt-8 border-t border-[#EAE3D9] pt-6">
                <h4 className="font-serif font-bold text-base text-[#133826] mb-3">
                  Proposed Production Ledger Schema
                </h4>
                <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#D7CDBF] font-mono text-xs text-stone-800 space-y-1.5 overflow-x-auto">
                  <div><strong>Table:</strong> petty_cash_transactions</div>
                  <div>- id: Integer (Primary Key)</div>
                  <div>- transaction_type: &apos;INFLOW&apos; | &apos;OUTFLOW&apos; | &apos;ADJUSTMENT&apos;</div>
                  <div>- amount: Numeric(10, 2) [Decimal-safe]</div>
                  <div>- category: &apos;Dairy&apos;, &apos;Vegetables&apos;, &apos;Gas&apos;, &apos;Ice&apos;, &apos;Cleaning&apos;, &apos;Misc&apos;</div>
                  <div>- description: String(255)</div>
                  <div>- reference_number: String(100) (Nullable)</div>
                  <div>- performed_by_user_id: ForeignKey(&apos;users.id&apos;)</div>
                  <div>- created_at: DateTime (UTC timestamp)</div>
                </div>
                <p className="text-[11px] text-[#718074] mt-3 italic">
                  Once authorized, this minimal ledger will enable physical drawer reconciliation, opening/closing counts, and daily petty expense logging without disrupting sales accounting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: RESERVATIONS CRM                                       */}
        {/* ============================================================= */}
        {activeTab === "reservations" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2DACF] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#718074]" />
                  <input
                    type="text"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Search Booking ID (e.g. PRIN5743), Guest Name, Phone..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  />
                </div>

                <select
                  value={resStatusFilter}
                  onChange={(e) => setResStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs font-semibold text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="ARRIVED">Arrived</option>
                  <option value="SEATED">Seated</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="NO_SHOW">No Show</option>
                </select>
              </div>

              <div className="text-xs font-semibold text-[#5A6A5E]">
                Showing {filteredReservations.length} reservations
              </div>
            </div>

            {/* Reservations Cards / Table */}
            <div className="bg-white rounded-2xl border border-[#E2DACF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#EAE3D9] text-[#5A6A5E] uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Booking ID</th>
                      <th className="py-3 px-4">Guest Details</th>
                      <th className="py-3 px-4">Date & Slot</th>
                      <th className="py-3 px-4">Party Size</th>
                      <th className="py-3 px-4">Advance Deposit</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Manager Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE3D9]">
                    {filteredReservations.length > 0 ? (
                      filteredReservations.map((r) => {
                        const bId = r.booking_id || formatBookingId(r.customer_name, r.customer_phone, r.id);
                        const isPaid = (r.payment_status || "").toUpperCase() === "PAID";
                        return (
                          <tr key={r.id} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#133826]">
                              <span className="bg-[#EBF5EE] text-[#2D6A4F] px-2 py-0.5 rounded text-[11px] border border-[#B7E4C7]">
                                {bId}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#133826] block">
                                {r.customer_name || "Guest"}
                              </span>
                              <span className="text-[11px] text-[#718074]">{r.customer_phone || "—"}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-[#133826] block">{r.reservation_date}</span>
                              <span className="text-[11px] text-[#718074]">{r.time_slot}</span>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#133826]">
                              {r.guest_count} guests
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif font-bold text-sm text-[#133826]">
                                  {formatINR(r.advance_amount)}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                    isPaid
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-amber-100 text-amber-800"
                                  }`}
                                >
                                  {r.payment_status}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <select
                                value={(r.status || "CONFIRMED").toUpperCase()}
                                onChange={(e) => handleReservationStatusUpdate(r.id, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-[#D7CDBF] bg-white text-[11px] font-bold text-[#133826] focus:outline-none"
                              >
                                <option value="CONFIRMED">CONFIRMED</option>
                                <option value="ARRIVED">ARRIVED</option>
                                <option value="SEATED">SEATED</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                                <option value="NO_SHOW">NO_SHOW</option>
                              </select>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {r.status === "CONFIRMED" && (
                                  <button
                                    onClick={() => handleReservationCheckin(r.id)}
                                    className="px-2.5 py-1 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                                  >
                                    Check In
                                  </button>
                                )}
                                {!isPaid && (
                                  <button
                                    onClick={() => openStaffVerifyModal(r)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                                    title="Verify Deposit"
                                  >
                                    Verify Advance
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-stone-500">
                          No reservations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Advance Payment Verification Modal */}
            {verifyingRes && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E2DACF] animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-lg text-[#133826]">
                      Verify Advance Payment
                    </h3>
                    <button
                      onClick={() => setVerifyingRes(null)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={submitStaffVerifyPayment} className="space-y-4 text-xs">
                    <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE3D9] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#718074]">Guest:</span>
                        <span className="font-bold text-[#133826]">{verifyingRes.customer_name || "Guest"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#718074]">Advance Amount:</span>
                        <span className="font-bold text-emerald-800">{formatINR(verifyingRes.advance_amount)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#133826] mb-1">
                        Bank / UPI Reference (UTR)
                      </label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={50}
                        value={enteredUtr}
                        onChange={(e) => setEnteredUtr(e.target.value)}
                        placeholder="e.g. 426819283741"
                        className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs font-mono text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                      <span className="text-[10px] text-[#718074] mt-1 block">
                        Confirm UTR from bank SMS, Soundbox, or statement before verifying.
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setVerifyingRes(null)}
                        className="flex-1 py-2.5 rounded-xl border border-[#D7CDBF] bg-white font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingVerify}
                        className="flex-1 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isSubmittingVerify ? "Verifying..." : "Confirm & Settle"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 6: MENU MANAGEMENT                                        */}
        {/* ============================================================= */}
        {activeTab === "menu" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Menu Controls */}
            <div className="bg-white rounded-2xl p-4 border border-[#E2DACF] shadow-xs flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-[280px]">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-[#1B4332] text-white"
                      : "bg-[#FAF8F5] text-[#5A6A5E] hover:bg-stone-100"
                  }`}
                >
                  All Items ({menuItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? "bg-[#1B4332] text-white"
                        : "bg-[#FAF8F5] text-[#5A6A5E] hover:bg-stone-100"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewCatModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-[#D7CDBF] bg-white hover:bg-stone-50 text-xs font-bold text-[#133826] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Category</span>
                </button>
                <button
                  onClick={openAddModal}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Menu Item</span>
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="bg-white rounded-2xl border border-[#E2DACF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#EAE3D9] text-[#5A6A5E] uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price (₹)</th>
                      <th className="py-3 px-4">Tax (GST)</th>
                      <th className="py-3 px-4">Availability</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE3D9]">
                    {filteredMenuItems.length > 0 ? (
                      filteredMenuItems.map((item) => {
                        const cat = categories.find((c) => c.id === item.category_id);
                        return (
                          <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-[#133826] block">{item.name}</span>
                              {item.description && (
                                <span className="text-[11px] text-[#718074] line-clamp-1">
                                  {item.description}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#5A6A5E]">
                              {cat?.name || "General"}
                            </td>
                            <td className="py-3.5 px-4 font-serif font-bold text-sm text-[#133826]">
                              {formatINR(item.price)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-stone-600">
                              {item.tax_rate}%
                            </td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={() => handleToggleMenuAvailability(item)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                                  item.is_available
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-red-100 text-red-800 border border-red-300"
                                }`}
                              >
                                {item.is_available ? "In Stock" : "Sold Out"}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg border border-[#D7CDBF] bg-white hover:bg-stone-50 text-[#133826] cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-stone-500">
                          No menu items found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Menu Item Edit / Add Modal */}
            {(editingItem || isNewItemModalOpen) && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2DACF] animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-lg text-[#133826]">
                      {editingItem ? `Edit: ${editingItem.name}` : "Add New Menu Item"}
                    </h3>
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setIsNewItemModalOpen(false);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveMenuItem} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-[#133826] mb-1">Item Name</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Margherita Classico"
                        className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-[#133826] mb-1">Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value)}
                          placeholder="e.g. 450"
                          className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#133826] mb-1">GST Tax (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formTax}
                          onChange={(e) => setFormTax(e.target.value)}
                          placeholder="5.00"
                          className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#133826] mb-1">Category</label>
                      <select
                        value={formCatId}
                        onChange={(e) => setFormCatId(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#133826] mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={formDesc}
                        onChange={(e) => setFormDesc(e.target.value)}
                        placeholder="San Marzano tomato sauce, fresh buffalo mozzarella, basil..."
                        className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="formAvailable"
                        checked={formAvailable}
                        onChange={(e) => setFormAvailable(e.target.checked)}
                        className="w-4 h-4 rounded text-[#2D6A4F]"
                      />
                      <label htmlFor="formAvailable" className="font-semibold text-[#133826]">
                        Item Available In Kitchen
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setIsNewItemModalOpen(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-[#D7CDBF] bg-white font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Save Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* New Category Modal */}
            {isNewCatModalOpen && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E2DACF] animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif font-bold text-lg text-[#133826]">
                      Create Category
                    </h3>
                    <button
                      onClick={() => setIsNewCatModalOpen(false)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-[#133826] mb-1">Category Name</label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="e.g. Artisanal Tisanes"
                        className="w-full px-3 py-2 rounded-xl border border-[#D7CDBF] bg-[#FAF8F5] text-xs text-[#133826] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsNewCatModalOpen(false)}
                        className="flex-1 py-2.5 rounded-xl border border-[#D7CDBF] bg-white font-bold text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold text-xs cursor-pointer shadow-xs"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
