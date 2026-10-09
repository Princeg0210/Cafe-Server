"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Clock,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Receipt,
  Users,
  UtensilsCrossed,
  Flame,
  Check,
  RotateCw,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronDown,
  Lock,
  LogOut,
  ShieldCheck,
  Calendar,
  UserCheck,
  XCircle,
  X,
  Phone,
  Mail,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";

interface SessionItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

interface TableSession {
  session_id: number;
  session_seq: number;
  session_token: string;
  status: string;
  opened_at: string;
  closed_at?: string;
  customer_name?: string;
  total_amount: number;
  items_count: number;
  is_active: boolean;
  is_settled: boolean;
  items: SessionItem[];
  reservation_id?: number;
  subtotal?: number;
  tax_amount?: number;
  gross_amount?: number;
  reservation_deposit_paid?: number;
  reservation_credit?: number;
  net_amount_due?: number;
  remainder_action?: string;
  remainder_amount?: number;
}

interface TableOverview {
  table_id: number;
  table_number: string;
  capacity: number;
  status: string;
  active_session_count: number;
  total_sessions_today: number;
  sessions: TableSession[];
}

interface KOTItem {
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

interface KOT {
  id: number;
  kot_number: string;
  sequence_number: number;
  business_date: string;
  table_number: string;
  table_id: number;
  dining_session_id: number;
  order_id: number;
  order_number: string;
  total_amount: number;
  items_count: number;
  status: string;
  printed_status: string;
  created_at: string;
  items: KOTItem[];
  print_job_id?: number;
}

interface ItemSummary {
  name: string;
  quantity: number;
}

interface CategorySummary {
  category: string;
  quantity: number;
}

interface DailyDoughCapacity {
  branch_id?: number;
  production_date?: string;
  total_dough_limit: number | null;
  total_allocated_dough: number;
  total_active_protected: number;
  walk_in_available: number | null;
  note?: string;
}

interface POSSummary {
  business_date: string;
  total_kots: number;
  tables_served: number;
  total_items: number;
  avg_items_per_kot: number;
  avg_kot_value: number;
  kots_per_hour: number;
  peak_hour: string;
  item_summary: ItemSummary[];
  category_summary: CategorySummary[];
  comparison: {
    today?: { kots: number; pizzas: number; pasta: number; beverages: number };
    yesterday?: { kots: number; pizzas: number; pasta: number; beverages: number };
  };
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

interface Reservation {
  id: number;
  branch_id: number;
  customer_id: number;
  guest_count: number;
  reservation_date: string;
  time_slot: string;
  status: string;
  payment_status?: string;
  advance_amount?: number;
  payment_reference?: string;
  payment_method?: string;
  table_id?: number;
  floor_number?: number;
  table_name?: string;
  is_deposit_credited?: boolean;
  credited_bill_id?: number;
  created_at: string;
  customer?: Customer;
}

interface PendingPaymentReview {
  credit_id: number;
  utr: string;
  amount: number;
  merchant_vpa: string;
  provider_source: string;
  status: string;
  review_reason: string;
  raw_event_payload?: string;
  verified_at: string;
}

export const getTableFloor = (tableIdOrNum: number | string) => {
  const num =
    typeof tableIdOrNum === "number"
      ? tableIdOrNum
      : parseInt(String(tableIdOrNum).replace(/\D/g, ""), 10) || 1;
  if (num <= 4) return { floor: 1, name: "Floor 1", short: "F1" };
  if (num <= 8) return { floor: 2, name: "Floor 2", short: "F2" };
  return { floor: 3, name: "Floor 3", short: "F3" };
};

export default function POSDashboard() {
  const [activeTab, setActiveTab] = useState<"tables" | "kots" | "reservations">("tables");

  // Table Sessions State
  const [tableOverviews, setTableOverviews] = useState<TableOverview[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});
  const [showClosedToday, setShowClosedToday] = useState<Record<number, boolean>>({});
  const [tableFilter, setTableFilter] = useState<"all" | "active" | "available">("all");

  // Authentication State
  const [posToken, setPosToken] = useState<string | null>(null);
  const [staffUser, setStaffUser] = useState<{ id: number; username: string; role?: { name: string } } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginUsername, setLoginUsername] = useState("Jaadoo");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // KOT & Summary State
  const [kots, setKots] = useState<KOT[]>([]);
  const [summary, setSummary] = useState<POSSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "failed" | "printed" | "pending">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Record<number, boolean>>({});
  const [closingSessionIds, setClosingSessionIds] = useState<Record<number, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Daily Dough Capacity State
  const [doughCapacity, setDoughCapacity] = useState<DailyDoughCapacity | null>(null);
  const [isLoadingDoughCapacity, setIsLoadingDoughCapacity] = useState(false);

  // Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).toUpperCase()
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const [isResettingAll, setIsResettingAll] = useState(false);

  // Reservations State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isRefreshingRes, setIsRefreshingRes] = useState(false);
  const [resFilter, setResFilter] = useState<"all" | "CONFIRMED" | "ARRIVED" | "SEATED" | "COMPLETED" | "CANCELLED">("all");
  const [updatingResId, setUpdatingResId] = useState<number | null>(null);
  const [pendingReviews, setPendingReviews] = useState<PendingPaymentReview[]>([]);
  const [assigningTableRes, setAssigningTableRes] = useState<Reservation | null>(null);
  const [selectedAssignTableId, setSelectedAssignTableId] = useState<number>(1);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const getWsBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      const isLocal =
        h === "localhost" ||
        h === "127.0.0.1" ||
        h.startsWith("192.168.") ||
        h.startsWith("10.") ||
        h.endsWith(".local");

      if (isLocal) {
        return `ws://${h}:8000`;
      }
      return process.env.NEXT_PUBLIC_WS_URL || "wss://cafe-piza-api.onrender.com";
    }
    return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  };

  // AudioContext unlock
  useEffect(() => {
    const unlockAudio = () => {
      try {
        if (!audioContextRef.current) {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
          }
        }
        if (audioContextRef.current && audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
      } catch {}
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchstart", unlockAudio);
    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, now + 0.1);
      gain2.gain.setValueAtTime(0.45, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.6);
    } catch {}
  };

  // Auth Verification
  const verifyToken = async (tok: string): Promise<boolean> => {
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const u = await res.json();
        setStaffUser(u);
        try {
          localStorage.setItem("jaadoo_pos_user", JSON.stringify(u));
        } catch {}
        return true;
      } else {
        handleLogout();
        return false;
      }
    } catch {
      return false;
    } finally {
      setIsAuthChecking(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("jaadoo_pos_token");
    const savedUser = localStorage.getItem("jaadoo_pos_user");
    if (savedToken) {
      setPosToken(savedToken);
      if (savedUser) {
        try {
          setStaffUser(JSON.parse(savedUser));
        } catch {}
      }
      setIsAuthChecking(false);
      verifyToken(savedToken);
    } else {
      setIsAuthChecking(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLoginError(err.detail || "Invalid credentials. Please verify username and password.");
        setIsLoggingIn(false);
        return;
      }
      const data = await res.json();
      const tok = data.access_token;
      localStorage.setItem("jaadoo_pos_token", tok);
      if (data.user) {
        try {
          localStorage.setItem("jaadoo_pos_user", JSON.stringify(data.user));
        } catch {}
        setStaffUser(data.user);
      }
      setPosToken(tok);
      setIsLoggingIn(false);
    } catch {
      setLoginError("Network connection error. Café backend is unreachable.");
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("jaadoo_pos_token");
    localStorage.removeItem("jaadoo_pos_user");
    setPosToken(null);
    setStaffUser(null);
    setLoginPassword("");
  };

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(0));
  const isTodaySelected = selectedDate === getLocalDateString(0);
  const isFutureDateSelected = selectedDate > getLocalDateString(0);

  const fetchData = async (overrideToken?: string, dateStr?: string) => {
    const tok = overrideToken || posToken;
    if (!tok) return;
    setIsRefreshing(true);
    const target = dateStr || selectedDate;
    const apiBase = getApiBase();
    try {
      const headers = { Authorization: `Bearer ${tok}` };
      const dateParam = target ? `?target_date=${target}` : "";
      setIsLoadingDoughCapacity(true);
      const [kotsRes, sumRes, tablesRes, doughRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/pos/kots${dateParam}`, { headers }),
        fetch(`${apiBase}/api/v1/pos/summary${dateParam}`, { headers }),
        fetch(`${apiBase}/api/v1/pos/table-sessions${dateParam}`, { headers }),
        fetch(`${apiBase}/api/v1/pos/daily-dough-capacity${target ? `?target_date=${target}` : ""}`, { headers }),
      ]);

      if (kotsRes.status === 401 || kotsRes.status === 403) {
        handleLogout();
        return;
      }

      if (kotsRes.ok) {
        const kotsData = await kotsRes.json();
        setKots(kotsData);
      }
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTableOverviews(tablesData);
      }
      if (doughRes.ok) {
        const doughData = await doughRes.json();
        setDoughCapacity(doughData);
      }
    } catch (err) {
      console.error("POS Data fetch error:", err);
    } finally {
      setIsLoadingDoughCapacity(false);
      setIsRefreshing(false);
    }
  };

  const fetchReservations = async (overrideToken?: string, dateStr?: string) => {
    const tok = overrideToken || posToken;
    if (!tok) return;
    setIsRefreshingRes(true);
    const target = dateStr || selectedDate;
    const apiBase = getApiBase();
    try {
      const dateParam = target ? `&reservation_date=${target}` : "";
      const res = await fetch(`${apiBase}/api/v1/reservations?branch_id=1${dateParam}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error("Reservations fetch error:", err);
    } finally {
      setIsRefreshingRes(false);
    }
  };

  const fetchPendingReviews = async (overrideToken?: string) => {
    const tok = overrideToken || posToken;
    if (!tok) return;
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/reservations/pending-reviews`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingReviews(data);
      }
    } catch (err) {
      console.error("Pending reviews fetch error:", err);
    }
  };

  const handleUpdateReservationStatus = async (id: number, newStatus: string) => {
    if (!posToken) return;
    setUpdatingResId(id);
    const apiBase = getApiBase();
    try {
      if (newStatus === "SEATED") {
        const resObj = reservations.find((r) => r.id === id);
        if (resObj && resObj.table_id) {
          const checkinRes = await fetch(`${apiBase}/api/v1/reservations/${id}/checkin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${posToken}`,
            },
            body: JSON.stringify({ table_id: resObj.table_id }),
          });
          if (checkinRes.ok) {
            await Promise.all([fetchReservations(), fetchData(), fetchPendingReviews()]);
            return;
          }
        }
      }

      const res = await fetch(`${apiBase}/api/v1/reservations/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await Promise.all([fetchReservations(), fetchData(), fetchPendingReviews()]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Cannot update reservation: ${err.detail || "Server error"}`);
      }
    } catch {
      alert("Network error updating reservation status.");
    } finally {
      setUpdatingResId(null);
    }
  };

  const handleReviewAction = async (creditId: number, utr: string, action: "VERIFY" | "REJECT") => {
    if (!posToken) return;
    const apiBase = getApiBase();
    try {
      if (action === "VERIFY") {
        const match = reservations.find(
          (r) =>
            (r.payment_reference && r.payment_reference.toLowerCase() === utr.toLowerCase()) ||
            r.status === "HOLD" ||
            r.status === "PAYMENT_PENDING"
        );
        const resId = match ? match.id : prompt("Enter Reservation ID to confirm with this verified credit:");
        if (!resId) return;

        const res = await fetch(`${apiBase}/api/v1/reservations/${resId}/staff-verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${posToken}`,
          },
          body: JSON.stringify({ upi_utr: utr }),
        });
        if (res.ok) {
          alert(`Payment for Reservation #${resId} verified and confirmed!`);
          await Promise.all([fetchReservations(), fetchPendingReviews(), fetchData()]);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(`Cannot verify payment: ${err.detail || "Server error"}`);
        }
      } else {
        if (!confirm(`Reject bank credit UTR: ${utr}? Staff review will flag this as reviewed.`)) return;
        setPendingReviews((prev) => prev.filter((p) => p.credit_id !== creditId));
      }
    } catch {
      alert("Network error processing review action.");
    }
  };

  const handleAssignTable = async (reservationId: number, tableId: number) => {
    if (!posToken) return;
    const apiBase = getApiBase();
    try {
      const targetTbl = tableOverviews.find((t) => t.table_id === tableId);
      const res = await fetch(`${apiBase}/api/v1/reservations/${reservationId}/assign-table`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posToken}`,
        },
        body: JSON.stringify({
          table_id: tableId,
          table_name: targetTbl?.table_number ? `Table ${targetTbl.table_number}` : `Table ${tableId}`,
          floor_number: getTableFloor(targetTbl?.table_number || tableId).floor,
        }),
      });
      if (res.ok) {
        setAssigningTableRes(null);
        await Promise.all([fetchReservations(), fetchData()]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Cannot assign table: ${err.detail || "Server error"}`);
      }
    } catch {
      alert("Network error assigning table.");
    }
  };

  useEffect(() => {
    if (!posToken) return;
    fetchData(undefined, selectedDate);
    fetchReservations(undefined, selectedDate);
    fetchPendingReviews(undefined);
    const interval = setInterval(() => {
      fetchData(undefined, selectedDate);
      fetchReservations(undefined, selectedDate);
      fetchPendingReviews(undefined);
    }, 10000);
    return () => clearInterval(interval);
  }, [posToken, selectedDate]);

  useEffect(() => {
    if (!posToken) return;
    const wsBase = getWsBase();
    const connectWs = () => {
      try {
        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch {}
        }
        const ws = new WebSocket(`${wsBase}/ws/pos`);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };
        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connectWs, 4000);
        };
        ws.onerror = () => {
          setIsConnected(false);
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === "KOT_CREATED" || data.event === "KOT_UPDATED") {
              const cleanTable = data.table_number ? data.table_number.replace(/^table\s*/i, "").trim() : "";
              setLastNotification(`New KOT ${data.kot_number} received for Table ${cleanTable}`);
              playChime();
              setTimeout(() => setLastNotification(null), 5000);
              fetchData();
            } else if (data.event === "SESSION_CLOSED") {
              const cleanTable = data.table_number ? data.table_number.replace(/^table\s*/i, "").trim() : "";
              setLastNotification(`Table ${cleanTable || data.table_id} settled.`);
              setTimeout(() => setLastNotification(null), 5000);
              fetchData();
              fetchReservations();
            }
          } catch {}
        };
      } catch {
        setIsConnected(false);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [posToken, soundEnabled]);

  const handleRetryPrint = async (kotId: number) => {
    if (!posToken) return;
    setRetryingIds((prev) => ({ ...prev, [kotId]: true }));
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/pos/kots/${kotId}/retry-print`, {
        method: "POST",
        headers: { Authorization: `Bearer ${posToken}` },
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error("Retry print failed:", err);
    } finally {
      setRetryingIds((prev) => ({ ...prev, [kotId]: false }));
    }
  };

  const handleCloseSession = async (sessionId: number, tableNumber: string, tableId?: number) => {
    if (!posToken) {
      alert("Staff session expired. Please sign in again.");
      return;
    }
    const session = tableOverviews.flatMap((t) => t.sessions).find((s) => s.session_id === sessionId);
    let confirmMsg = `Settle bill and close session for Table ${tableNumber}?`;
    if (session && session.reservation_deposit_paid && Number(session.reservation_deposit_paid) > 0) {
      confirmMsg += `\n\nBill Total: ₹${session.gross_amount || session.total_amount}\nReservation Credit: -₹${session.reservation_credit}\nAmount Due: ₹${session.net_amount_due}`;
    }
    confirmMsg += `\n\nThis will mark the table as Available for walk-in guests.`;
    if (!confirm(confirmMsg)) {
      return;
    }
    setClosingSessionIds((prev) => ({ ...prev, [sessionId]: true }));
    const apiBase = getApiBase();
    try {
      let res = await fetch(`${apiBase}/api/v1/pos/sessions/${sessionId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posToken}`,
        },
      });

      if (!res.ok && tableId) {
        res = await fetch(`${apiBase}/api/v1/pos/tables/${tableId}/settle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${posToken}`,
          },
        });
      }

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || `Table ${tableNumber} settled successfully.`);
        await Promise.all([fetchData(), fetchReservations()]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Cannot settle table: ${err.detail || "Server error"}`);
      }
    } catch {
      alert("Network error: Could not reach café backend server.");
    } finally {
      setClosingSessionIds((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const generatePDFReport = () => {
    const reportDate = summary?.business_date || new Date().toISOString().split("T")[0];
    const printTime = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>JAADOO POS Reset Report - ${reportDate}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #261C18; padding: 24px; background: #fff; line-height: 1.4; }
          .header { text-align: left; border-bottom: 2px solid #261C18; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
          .header p { margin: 4px 0 0 0; font-size: 11px; color: #666; }
          .badge { font-size: 11px; font-weight: 600; color: #555; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .card { background: #FAF8F5; border: 1px solid #E4DCD0; padding: 10px; border-radius: 6px; }
          .card .title { font-size: 9px; text-transform: uppercase; color: #777; font-weight: 600; letter-spacing: 0.5px; }
          .card .val { font-size: 16px; font-weight: 700; color: #261C18; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background: #261C18; color: #fff; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { border-bottom: 1px solid #eee; padding: 6px 10px; }
          tr:nth-child(even) { background: #FAF9F7; }
          .section-title { font-size: 12px; font-weight: 700; margin-top: 20px; margin-bottom: 6px; text-transform: uppercase; border-left: 3px solid #B85B43; padding-left: 6px; }
          .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>JAADOO • THE PIZZA PROJECT • POS OPERATIONAL REPORT</h1>
            <p>32 Sitaphal ki gali, Ganesh Ghati, Udaipur • Session Reset Summary</p>
          </div>
          <div class="badge">Date: ${reportDate} | Generated: ${printTime}</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="title">Total Revenue</div>
            <div class="val">₹${kots.reduce((sum, k) => sum + (Number(k.total_amount) || 0), 0).toLocaleString("en-IN")}</div>
          </div>
          <div class="card">
            <div class="title">Total KOTs</div>
            <div class="val">${summary?.total_kots || kots.length || 0}</div>
          </div>
          <div class="card">
            <div class="title">Tables Served</div>
            <div class="val">${summary?.tables_served || 0}</div>
          </div>
          <div class="card">
            <div class="title">Avg KOT Value</div>
            <div class="val">₹${summary?.avg_kot_value ? Math.round(summary.avg_kot_value) : 0}</div>
          </div>
        </div>

        <div class="section-title">Active Table Sessions Before Reset</div>
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th>Status</th>
              <th>Session ID</th>
              <th>Opened At</th>
              <th>Items</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
    `;

    let activeCount = 0;
    tableOverviews.forEach((tbl) => {
      tbl.sessions.forEach((s) => {
        if (s.is_active) {
          activeCount++;
          htmlContent += `
            <tr>
              <td><strong>Table #${tbl.table_number}</strong></td>
              <td><span style="color: #2e7d32; font-weight: bold;">ACTIVE</span></td>
              <td>#${s.session_seq}</td>
              <td>${new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>${s.items_count} items</td>
              <td><strong>₹${Number(s.total_amount || 0).toLocaleString("en-IN")}</strong></td>
            </tr>
          `;
        }
      });
    });

    if (activeCount === 0) {
      htmlContent += `<tr><td colspan="6" style="text-align:center; color:#888; padding: 12px;">No active sessions found at the time of reset.</td></tr>`;
    }

    htmlContent += `
          </tbody>
        </table>

        <div class="section-title">Live KOT Tickets (${kots.length})</div>
        <table>
          <thead>
            <tr>
              <th>KOT #</th>
              <th>Table</th>
              <th>Status</th>
              <th>Time</th>
              <th>Items</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
    `;

    kots.forEach((kot) => {
      htmlContent += `
        <tr>
          <td><strong>${kot.kot_number}</strong></td>
          <td>${kot.table_number}</td>
          <td>${kot.status}</td>
          <td>${new Date(kot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td>${kot.items_count}</td>
          <td><strong>₹${Number(kot.total_amount || 0).toLocaleString("en-IN")}</strong></td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>

        <div class="footer">
          JAADOO • The Pizza Project • Operational POS System • ${reportDate}
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  const handleResetAllSessions = async () => {
    if (!posToken) {
      alert("Staff session expired. Please sign in again.");
      return;
    }
    if (!confirm("Are you sure you want to RESET ALL POS SESSIONS?\n\nA PDF summary report will be generated and printed automatically.")) {
      return;
    }

    setIsResettingAll(true);
    try {
      generatePDFReport();
    } catch (e) {
      console.error("PDF generation warning:", e);
    }

    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/pos/sessions/reset-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "All active table sessions reset. Tables are now Available.");
        await Promise.all([fetchData(), fetchReservations()]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to reset sessions: ${err.detail || "Server error"}`);
      }
    } catch {
      alert("Network error: Could not reach café backend server.");
    } finally {
      setIsResettingAll(false);
    }
  };

  const toggleSession = (sessionId: number) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: prev[sessionId] === undefined ? false : !prev[sessionId],
    }));
  };

  const isSessionExpanded = (session: TableSession) => {
    if (expandedSessions[session.session_id] !== undefined) {
      return expandedSessions[session.session_id];
    }
    return session.is_active && session.items_count > 0;
  };

  const filteredTables = tableOverviews.filter((tbl) => {
    if (tableFilter === "active") return tbl.active_session_count > 0;
    if (tableFilter === "available") return tbl.active_session_count === 0;
    return true;
  });

  // Calculate Operational Summary Metrics from existing data
  const activeTablesCount = tableOverviews.filter((t) => t.active_session_count > 0).length;
  const openKotsCount = kots.filter((k) => k.status !== "COMPLETED").length;
  const totalSalesToday = kots.reduce((sum, k) => sum + (Number(k.total_amount) || 0), 0);
  
  // Needs Attention Items from existing data
  const failedKots = kots.filter((k) => k.printed_status === "FAILED");
  const arrivedUnseatedRes = reservations.filter((r) => r.status.toUpperCase() === "ARRIVED");
  const needsAttentionCount = failedKots.length + pendingReviews.length + arrivedUnseatedRes.length;

  // 1. Initial Checking Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-6 text-center text-[#261C18]">
        <div className="w-8 h-8 border-2 border-[#261C18] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest font-semibold text-stone-600">
          Loading JAADOO POS...
        </p>
      </div>
    );
  }

  // 2. Staff Authentication Gate
  if (!posToken) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans flex flex-col justify-between p-4 sm:p-6">
        <div className="max-w-sm mx-auto my-auto w-full bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-sm space-y-5">
          <div className="text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-14 h-9 rounded-md overflow-hidden border border-[#9E3E26]/30 shadow-2xs bg-white">
                <img
                  src="/jaadoo_logo.jpg"
                  alt="Jaadoo Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#261C18] text-[#FBF9F5] text-[10px] font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-[#B85B43]" />
                <span>Staff Terminal</span>
              </div>
            </div>
            <h1 className="font-serif font-bold text-2xl text-[#261C18]">
              JAADOO <span className="italic font-normal text-[#B85B43]">POS</span>
            </h1>
            <p className="text-xs text-stone-500 font-sans">
              Enter authorized credentials to access live restaurant operations.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. Jaadoo"
                className="w-full text-xs p-2.5 rounded-md border border-stone-200 focus:outline-hidden focus:border-[#B85B43] bg-stone-50/50 font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full text-xs p-2.5 pr-10 rounded-md border border-stone-200 focus:outline-hidden focus:border-[#B85B43] bg-stone-50/50 font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#261C18] hover:bg-[#B85B43] disabled:opacity-50 text-white py-2.5 rounded-md font-sans font-semibold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoggingIn ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                "Sign In to Terminal"
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <Link href="/" className="hover:text-[#261C18] flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Website
            </Link>
            <Link href="/admin" className="text-[#B85B43] hover:underline font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Owner Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredKots = kots
    .filter((kot) => {
      if (filter === "failed") return kot.printed_status === "FAILED";
      if (filter === "printed") return kot.printed_status === "PRINTED";
      if (filter === "pending") return kot.printed_status === "PENDING";
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "asc") return a.sequence_number - b.sequence_number;
      return b.sequence_number - a.sequence_number;
    });

  const filteredReservations = reservations.filter((r) => {
    if (resFilter === "all") return true;
    return r.status.toUpperCase() === resFilter;
  });

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans antialiased">
      
      {/* 1. COMPACT OPERATIONAL HEADER */}
      <header className="sticky top-0 z-40 bg-[#FBF9F5] border-b border-[#E4DCD0] px-4 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Live Indicator */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-11 h-7 rounded-md overflow-hidden border border-[#9E3E26]/30 shadow-2xs bg-white shrink-0">
                <img
                  src="/jaadoo_logo.jpg"
                  alt="Jaadoo Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-serif font-bold text-lg text-[#261C18] tracking-tight">
                JAADOO <span className="font-serif italic font-normal text-[#B85B43]">POS</span>
              </span>
            </Link>

            <span className="h-4 w-[1px] bg-stone-300 mx-0.5" />

            <div className="flex items-center gap-1.5 text-[11px] font-sans font-medium text-stone-700">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-600" : "bg-rose-500"}`} />
              <span className="uppercase tracking-wider font-semibold">
                {selectedDate === getLocalDateString(0) ? "LIVE" : "ARCHIVE"}
              </span>
              <span className="text-stone-400">•</span>
              <span className="font-mono text-stone-600">{selectedDate}</span>
            </div>

            {currentTime && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono text-stone-500 ml-1">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>{currentTime}</span>
              </span>
            )}
          </div>

          {/* Real-time Order Popup */}
          {lastNotification && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#261C18] text-[#FBF9F5] text-xs font-medium border border-stone-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-xs">{lastNotification}</span>
            </div>
          )}

          {/* Navigation Tabs & Staff Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#ECE6DC] p-0.5 rounded-lg text-xs font-medium border border-[#E4DCD0]">
              <button
                onClick={() => setActiveTab("tables")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "tables"
                    ? "bg-[#261C18] text-[#FBF9F5] font-semibold"
                    : "text-stone-700 hover:text-[#261C18]"
                }`}
              >
                Tables ({activeTablesCount}/{tableOverviews.length})
              </button>
              <button
                onClick={() => setActiveTab("kots")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === "kots"
                    ? "bg-[#261C18] text-[#FBF9F5] font-semibold"
                    : "text-stone-700 hover:text-[#261C18]"
                }`}
              >
                KOTs ({kots.length})
              </button>
              <button
                onClick={() => setActiveTab("reservations")}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  activeTab === "reservations"
                    ? "bg-[#261C18] text-[#FBF9F5] font-semibold"
                    : "text-stone-700 hover:text-[#261C18]"
                }`}
              >
                <span>Bookings</span>
                <span className="text-[10px] opacity-80">({reservations.length})</span>
                {pendingReviews.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
                )}
              </button>
            </div>

            {/* Staff User */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-600 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="font-semibold text-stone-800">{staffUser?.username || "Staff"}</span>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) setTimeout(playChime, 50);
              }}
              className={`p-1.5 rounded-md border text-xs cursor-pointer ${
                soundEnabled
                  ? "bg-[#261C18] border-[#261C18] text-[#FBF9F5]"
                  : "bg-white border-[#E4DCD0] text-stone-500"
              }`}
              title={soundEnabled ? "Audio chime ON" : "Audio chime OFF"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchData();
                fetchReservations();
                fetchPendingReviews();
              }}
              disabled={isRefreshing || isRefreshingRes}
              className="p-1.5 rounded-md bg-white hover:bg-stone-100 text-stone-700 border border-[#E4DCD0] text-xs cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isRefreshingRes ? "animate-spin" : ""}`} />
            </button>

            {/* Owner Portal Link */}
            <Link
              href="/admin"
              className="p-1.5 rounded-md bg-white hover:bg-amber-50 text-[#B85B43] border border-[#E4DCD0] text-xs cursor-pointer flex items-center gap-1"
              title="Switch to Owner Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
            </Link>

            {/* Lock */}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs cursor-pointer"
              title="Lock Terminal"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        
        {/* 2. SUMMARY METRICS & OPERATIONAL DATE BAR */}
        <section className="space-y-3">
          
          {/* Operational Date Controller (Compact) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white p-3 rounded-lg border border-[#E4DCD0] text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans font-bold uppercase text-stone-600 tracking-wider text-[11px]">
                OPERATIONS DATE:
              </span>
              
              <div className="flex items-center gap-1.5 bg-[#F6F3EC] px-2.5 py-1 rounded-md border border-[#E4DCD0]">
                <Calendar className="w-3.5 h-3.5 text-[#B85B43]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-mono font-bold text-xs text-[#261C18] focus:outline-hidden cursor-pointer"
                />
              </div>

              {/* Quick Switchers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(0))}
                  className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors cursor-pointer ${
                    isTodaySelected
                      ? "bg-[#261C18] text-white"
                      : "bg-[#F6F3EC] text-stone-700 hover:bg-[#E4DCD0]"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(-1))}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                    selectedDate === getLocalDateString(-1)
                      ? "bg-[#261C18] text-white font-semibold"
                      : "bg-[#F6F3EC] text-stone-700 hover:bg-[#E4DCD0]"
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(-2))}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                    selectedDate === getLocalDateString(-2)
                      ? "bg-[#261C18] text-white font-semibold"
                      : "bg-[#F6F3EC] text-stone-700 hover:bg-[#E4DCD0]"
                  }`}
                >
                  2 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(1))}
                  className={`px-2.5 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                    selectedDate === getLocalDateString(1)
                      ? "bg-[#261C18] text-white font-semibold"
                      : "bg-[#F6F3EC] text-stone-700 hover:bg-[#E4DCD0]"
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                isTodaySelected
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : isFutureDateSelected
                  ? "bg-blue-50 text-blue-800 border-blue-200"
                  : "bg-stone-100 text-stone-700 border-stone-200"
              }`}>
                {isTodaySelected ? "Live Shift" : isFutureDateSelected ? "Future Booking" : "History Archive"}
              </span>

              {!isTodaySelected && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(0))}
                  className="inline-flex items-center gap-1 text-[11px] text-[#B85B43] font-semibold hover:underline cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Return to Today</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Primary Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            
            {/* Metric 1: Active Tables */}
            <div className="bg-white p-4 rounded-lg border border-[#E4DCD0] shadow-2xs">
              <div className="text-[11px] font-sans uppercase tracking-wider font-semibold text-stone-500 flex items-center justify-between">
                <span>ACTIVE TABLES</span>
                <Users className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <div className="text-2xl font-bold font-sans text-[#261C18] mt-1.5 flex items-baseline gap-1.5">
                <span>{activeTablesCount}</span>
                <span className="text-xs font-normal text-stone-400 font-sans">/ {tableOverviews.length} total</span>
              </div>
            </div>

            {/* Metric 2: Open KOTs */}
            <div className="bg-white p-4 rounded-lg border border-[#E4DCD0] shadow-2xs">
              <div className="text-[11px] font-sans uppercase tracking-wider font-semibold text-stone-500 flex items-center justify-between">
                <span>OPEN KOTS</span>
                <Receipt className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <div className="text-2xl font-bold font-sans text-[#261C18] mt-1.5 flex items-baseline gap-1.5">
                <span>{openKotsCount}</span>
                <span className="text-xs font-normal text-stone-400 font-sans">({kots.length} total)</span>
              </div>
            </div>

            {/* Metric 3: Today's Sales */}
            <div className="bg-white p-4 rounded-lg border border-[#E4DCD0] shadow-2xs">
              <div className="text-[11px] font-sans uppercase tracking-wider font-semibold text-stone-500 flex items-center justify-between">
                <span>TODAY&apos;S SALES</span>
                <TrendingUp className="w-3.5 h-3.5 text-[#4A5842]" />
              </div>
              <div className="text-2xl font-bold font-sans text-[#261C18] mt-1.5">
                ₹{totalSalesToday.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Metric 4: Needs Attention */}
            <div className={`p-4 rounded-lg border shadow-2xs ${
              needsAttentionCount > 0
                ? "bg-amber-50/70 border-amber-300"
                : "bg-white border-[#E4DCD0]"
            }`}>
              <div className="text-[11px] font-sans uppercase tracking-wider font-semibold flex items-center justify-between text-stone-500">
                <span className={needsAttentionCount > 0 ? "text-amber-900 font-bold" : ""}>NEEDS ATTENTION</span>
                <AlertTriangle className={`w-3.5 h-3.5 ${needsAttentionCount > 0 ? "text-amber-600" : "text-stone-400"}`} />
              </div>
              <div className={`text-2xl font-bold font-sans mt-1.5 ${needsAttentionCount > 0 ? "text-amber-800" : "text-stone-600"}`}>
                {needsAttentionCount}
              </div>
            </div>
          </div>
        </section>

        {/* 3. DAILY PIZZA CAPACITY (Restrained Operational Component) */}
        <section className="bg-white p-4 rounded-lg border border-[#E4DCD0] shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#B85B43]" />
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-[#261C18]">
                DAILY PIZZA CAPACITY
              </h3>
              {isLoadingDoughCapacity ? (
                <span className="text-[10px] text-stone-400 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Loading...
                </span>
              ) : doughCapacity?.total_dough_limit == null ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                  NO RULE SET
                </span>
              ) : (doughCapacity.walk_in_available ?? 0) === 0 ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  WALK-IN EXHAUSTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  OPERATIONAL
                </span>
              )}
            </div>

            {doughCapacity?.total_dough_limit != null && (
              <span className="text-xs font-sans text-stone-600">
                <strong>{doughCapacity.total_allocated_dough}</strong> / {doughCapacity.total_dough_limit} used
              </span>
            )}
          </div>

          {/* Progress Bar & Breakdown */}
          {doughCapacity?.total_dough_limit != null ? (
            <div className="space-y-2">
              {/* Progress Bar */}
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${Math.min(100, ((doughCapacity.total_allocated_dough) / (doughCapacity.total_dough_limit || 1)) * 100)}%`,
                  }}
                  className="bg-amber-600 transition-all duration-300"
                  title="Allocated / Used"
                />
                <div
                  style={{
                    width: `${Math.min(100, ((doughCapacity.total_active_protected) / (doughCapacity.total_dough_limit || 1)) * 100)}%`,
                  }}
                  className="bg-blue-600 transition-all duration-300"
                  title="Protected for Reservations"
                />
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-sans pt-1">
                <div className="bg-[#FAF8F5] p-2 rounded-md border border-[#E4DCD0]/60">
                  <div className="text-[10px] text-stone-500 uppercase font-semibold">Allocated Used</div>
                  <div className="font-bold text-[#261C18] text-sm mt-0.5">
                    {doughCapacity.total_allocated_dough}
                  </div>
                </div>

                <div className="bg-[#FAF8F5] p-2 rounded-md border border-[#E4DCD0]/60">
                  <div className="text-[10px] text-blue-800 uppercase font-semibold">Protected (Res.)</div>
                  <div className="font-bold text-blue-900 text-sm mt-0.5">
                    {doughCapacity.total_active_protected}
                  </div>
                </div>

                <div className={`p-2 rounded-md border ${
                  (doughCapacity.walk_in_available ?? 0) > 0
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                    : "bg-red-50/50 border-red-200 text-red-900"
                }`}>
                  <div className="text-[10px] uppercase font-semibold opacity-80">Walk-In Available</div>
                  <div className="font-bold text-sm mt-0.5">
                    {doughCapacity.walk_in_available ?? 0}
                  </div>
                </div>

                <div className="hidden sm:block bg-[#FAF8F5] p-2 rounded-md border border-[#E4DCD0]/60">
                  <div className="text-[10px] text-stone-500 uppercase font-semibold">Total Dough Limit</div>
                  <div className="font-bold text-[#261C18] text-sm mt-0.5">
                    {doughCapacity.total_dough_limit}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500 font-sans italic">
              Standard kitchen dough limits apply.
            </p>
          )}
        </section>

        {/* 4. NEEDS ATTENTION COMPACT SECTION (if any exist) */}
        {needsAttentionCount > 0 && (
          <section className="bg-amber-50/80 border border-amber-300 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <div className="flex items-center gap-2 text-amber-900 font-sans font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>OPERATIONAL ATTENTION REQUIRED ({needsAttentionCount})</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-800 uppercase">
                Action Items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Failed Print KOTs */}
              {failedKots.map((kot) => (
                <div key={kot.id} className="bg-white p-3 rounded-md border border-amber-200 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold text-stone-900">{kot.kot_number}</span>
                    <span className="text-stone-500 ml-1.5">• Table {kot.table_number}</span>
                    <p className="text-[11px] text-red-700 font-medium mt-0.5">Thermal print job failed</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRetryPrint(kot.id)}
                    disabled={retryingIds[kot.id]}
                    className="px-2.5 py-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white font-semibold text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {retryingIds[kot.id] ? "Printing..." : "Retry Print"}
                  </button>
                </div>
              ))}

              {/* Pending Payment Reviews */}
              {pendingReviews.map((rev) => (
                <div key={rev.credit_id} className="bg-white p-3 rounded-md border border-amber-200 text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Bank Credit #{rev.credit_id}</span>
                    <span className="font-bold text-[#261C18]">₹{rev.amount}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 font-mono truncate">UTR: {rev.utr}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleReviewAction(rev.credit_id, rev.utr, "VERIFY")}
                      className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction(rev.credit_id, rev.utr, "REJECT")}
                      className="px-2.5 py-1 border border-stone-200 hover:bg-red-50 text-red-700 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}

              {/* Arrived Unseated Guests */}
              {arrivedUnseatedRes.map((res) => (
                <div key={res.id} className="bg-white p-3 rounded-md border border-amber-200 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-bold text-stone-900">{res.customer?.name || "Guest"}</span>
                    <span className="text-stone-500 ml-1.5">• {res.guest_count} Guests</span>
                    <p className="text-[11px] text-amber-800 font-medium mt-0.5">Arrived • Waiting for seating</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!res.table_id) setAssigningTableRes(res);
                      else handleUpdateReservationStatus(res.id, "SEATED");
                    }}
                    className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                  >
                    {res.table_id ? "Seat" : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= TAB 1: ACTIVE TABLES (PRIMARY OPERATIONAL SECTION) ================= */}
        {activeTab === "tables" && (
          <section className="space-y-4">
            
            {/* Table Controls Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E4DCD0]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-[#261C18]">
                  Active Tables
                </h2>
                <span className="text-xs text-stone-500 font-sans">
                  ({tableOverviews.length} physical tables)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Reset All Action */}
                <button
                  type="button"
                  onClick={handleResetAllSessions}
                  disabled={isResettingAll}
                  className="px-3 py-1.5 rounded-md bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  title="Generate session report and reset all table sessions"
                >
                  <span className="flex items-center gap-1">
                    <RotateCw className={`w-3 h-3 ${isResettingAll ? "animate-spin" : ""}`} />
                    <span>{isResettingAll ? "Resetting..." : "Reset All Sessions"}</span>
                  </span>
                </button>

                {/* Filter Selector */}
                <div className="flex items-center bg-[#F6F3EC] p-0.5 rounded-md border border-[#E4DCD0]">
                  {(["all", "active", "available"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTableFilter(mode)}
                      className={`px-2.5 py-1 rounded-sm capitalize font-medium transition-colors cursor-pointer ${
                        tableFilter === mode
                          ? "bg-[#261C18] text-[#FBF9F5] font-semibold"
                          : "text-stone-700 hover:text-[#261C18]"
                      }`}
                    >
                      {mode === "all"
                        ? `All (${tableOverviews.length})`
                        : mode === "active"
                        ? `Occupied (${activeTablesCount})`
                        : `Available (${tableOverviews.length - activeTablesCount})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tables Grid Layout */}
            {filteredTables.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white rounded-lg border border-[#E4DCD0] space-y-2">
                <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="text-sm font-semibold text-[#261C18]">No Tables Found</h4>
                <p className="text-xs text-stone-500">
                  {tableFilter === "active"
                    ? "No tables currently have active dining sessions."
                    : "No tables match current filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTables.map((tbl) => {
                  const cleanTableNumber = tbl.table_number.replace(/^table\s*/i, "").replace(/^t-/i, "").trim();
                  const displayTableName = `TABLE ${cleanTableNumber.padStart(2, "0") || tbl.table_id}`;
                  const activeSessions = tbl.sessions.filter((s) => s.is_active);
                  const settledSessions = tbl.sessions.filter((s) => !s.is_active);
                  const showHistory = !!showClosedToday[tbl.table_id];
                  const visibleSessions = isTodaySelected
                    ? (showHistory ? tbl.sessions : activeSessions)
                    : tbl.sessions;

                  const isOccupied = tbl.active_session_count > 0;
                  const activeSession = activeSessions[0];

                  return (
                    <div
                      key={tbl.table_id}
                      className={`bg-white rounded-lg border transition-all overflow-hidden flex flex-col justify-between ${
                        isOccupied
                          ? "border-amber-400/80 shadow-xs"
                          : "border-[#E4DCD0]"
                      }`}
                    >
                      {/* Card Top Header */}
                      <div className={`p-4 border-b ${
                        isOccupied ? "bg-[#FAF7F2] border-amber-200/70" : "bg-[#FAF8F5] border-[#E4DCD0]/60"
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono font-bold text-xl text-[#261C18]">
                                {displayTableName}
                              </span>
                              <span className="text-xs font-semibold text-[#B85B43]">
                                • {getTableFloor(cleanTableNumber || tbl.table_id).name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-stone-500 font-sans">
                                {tbl.capacity} Seats
                              </span>
                              <span className="text-stone-300">•</span>
                              {/* Clickable Session Button to show previous sessions of that table */}
                              <button
                                type="button"
                                onClick={() =>
                                  setShowClosedToday((prev) => ({
                                    ...prev,
                                    [tbl.table_id]: !prev[tbl.table_id],
                                  }))
                                }
                                className={`text-[11px] font-sans font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 ${
                                  showHistory
                                    ? "bg-[#261C18] text-white border-[#261C18]"
                                    : settledSessions.length > 0
                                    ? "bg-[#FAF8F5] text-[#B85B43] border-[#E4DCD0] hover:bg-[#B85B43]/10"
                                    : "bg-stone-50 text-stone-500 border-stone-200"
                                }`}
                                title={
                                  settledSessions.length > 0
                                    ? "Click to toggle previous sessions of this table today"
                                    : "No past sessions yet today"
                                }
                              >
                                <Clock className="w-3 h-3" />
                                <span>
                                  {tbl.total_sessions_today} {tbl.total_sessions_today === 1 ? "Session" : "Sessions"}
                                  {settledSessions.length > 0 ? ` (${settledSessions.length} past)` : ""}
                                </span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                          </div>

                          <div>
                            {isOccupied ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                OCCUPIED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                                AVAILABLE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Body: Session Info & Running Bill */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        {/* 1. Active Session Details (if occupied) */}
                        {isOccupied && activeSession ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-sans">
                              <span className="text-stone-500">
                                Opened: <strong>{new Date(activeSession.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                              </span>
                              <span className="font-semibold text-stone-700">
                                {activeSession.items_count} {activeSession.items_count === 1 ? "item" : "items"} ordered
                              </span>
                            </div>

                            {activeSession.customer_name && (
                              <div className="text-xs text-stone-700 font-medium">
                                Guest: {activeSession.customer_name}
                              </div>
                            )}

                            {/* Running Bill Total Box */}
                            <div className="p-3 bg-[#FAF8F5] rounded-md border border-[#E4DCD0] flex items-center justify-between">
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-stone-500 block">
                                  Running Bill
                                </span>
                                <span className="text-xl font-bold font-sans text-[#261C18]">
                                  ₹{Number(activeSession.total_amount || 0).toLocaleString("en-IN")}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleSession(activeSession.session_id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#B85B43] hover:underline cursor-pointer"
                              >
                                <span>{isSessionExpanded(activeSession) ? "Hide Details" : "View Items →"}</span>
                              </button>
                            </div>

                            {/* Expandable Items List */}
                            {isSessionExpanded(activeSession) && (
                              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                                {activeSession.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-stone-100 last:border-none">
                                    <span className="text-stone-800">
                                      <strong className="text-[#261C18]">{item.quantity}×</strong> {item.name}
                                    </span>
                                    <span className="font-semibold text-stone-700">₹{item.subtotal}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : !showHistory ? (
                          <div className="py-6 text-center text-xs text-stone-400 italic">
                            Table is clean and ready for seating.
                          </div>
                        ) : null}

                        {/* 2. Previous Settled Sessions of THIS table today (When Session Button is Clicked) */}
                        {showHistory && (
                          <div className="pt-2 space-y-2 border-t border-amber-200 bg-[#FAF8F5] p-3 rounded-md animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#B85B43] flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Previous Sessions Today ({settledSessions.length})</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowClosedToday((prev) => ({
                                    ...prev,
                                    [tbl.table_id]: false,
                                  }))
                                }
                                className="text-[10px] text-stone-500 hover:text-stone-900 font-semibold underline cursor-pointer"
                              >
                                Close
                              </button>
                            </div>

                            {settledSessions.length === 0 ? (
                              <p className="text-xs text-stone-400 italic py-1">
                                No previous settled sessions recorded for this table today.
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {settledSessions.map((pastSess) => (
                                  <div
                                    key={pastSess.session_id}
                                    className="bg-white p-2.5 rounded-md border border-stone-200 text-xs space-y-1.5 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between font-sans">
                                      <span className="font-semibold text-stone-800">
                                        Session #{pastSess.session_seq}
                                      </span>
                                      <span className="font-bold text-[#261C18]">
                                        ₹{Number(pastSess.total_amount || 0).toLocaleString("en-IN")}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-stone-500 flex items-center justify-between">
                                      <span>
                                        {new Date(pastSess.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        {pastSess.closed_at ? ` → ${new Date(pastSess.closed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded-xs bg-stone-100 text-stone-600 text-[10px] font-medium">
                                        Settled
                                      </span>
                                    </div>

                                    {pastSess.items && pastSess.items.length > 0 && (
                                      <div className="pt-1 border-t border-stone-100 text-[11px] space-y-0.5 text-stone-600">
                                        {pastSess.items.map((item, idx) => (
                                          <div key={idx} className="flex justify-between">
                                            <span>{item.quantity}× {item.name}</span>
                                            <span>₹{item.subtotal}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Settle Action Button */}
                        {isOccupied && activeSession && isTodaySelected && (
                          <div className="pt-3 border-t border-stone-100">
                            <button
                              type="button"
                              onClick={() => handleCloseSession(activeSession.session_id, cleanTableNumber, tbl.table_id)}
                              disabled={closingSessionIds[activeSession.session_id]}
                              className="w-full bg-[#261C18] hover:bg-[#B85B43] text-white py-2 rounded-md font-sans font-semibold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{closingSessionIds[activeSession.session_id] ? "Settling..." : "Settle Table"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 2: LIVE KOT TICKETS ================= */}
        {activeTab === "kots" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Tickets Flow (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-lg border border-[#E4DCD0]">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#261C18]">
                    LIVE KOT TICKETS ({filteredKots.length})
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {/* Sort */}
                  <div className="flex items-center bg-[#F6F3EC] p-0.5 rounded-md border border-[#E4DCD0]">
                    <button
                      onClick={() => setSortOrder("asc")}
                      className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                        sortOrder === "asc" ? "bg-[#261C18] text-white font-semibold" : "text-stone-600"
                      }`}
                    >
                      1 → N
                    </button>
                    <button
                      onClick={() => setSortOrder("desc")}
                      className={`px-2 py-0.5 rounded-sm transition-colors cursor-pointer ${
                        sortOrder === "desc" ? "bg-[#261C18] text-white font-semibold" : "text-stone-600"
                      }`}
                    >
                      Latest
                    </button>
                  </div>

                  {/* Filter */}
                  <div className="flex items-center bg-[#F6F3EC] p-0.5 rounded-md border border-[#E4DCD0]">
                    {(["all", "failed", "printed", "pending"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-2.5 py-0.5 rounded-sm capitalize transition-colors cursor-pointer ${
                          filter === t ? "bg-[#B85B43] text-white font-semibold" : "text-stone-600"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tickets List */}
              {filteredKots.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-lg border border-[#E4DCD0] space-y-2">
                  <Printer className="w-8 h-8 text-stone-300 mx-auto" />
                  <h4 className="text-sm font-semibold text-[#261C18]">No Active Tickets</h4>
                  <p className="text-xs text-stone-500">
                    Incoming kitchen orders will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredKots.map((kot) => {
                    const cleanTableNumber = kot.table_number ? kot.table_number.replace(/^table\s*/i, "").trim() : "";
                    return (
                      <div
                        key={kot.id}
                        className="bg-white rounded-lg border border-[#E4DCD0] p-4 shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#261C18]">
                                {kot.kot_number}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-mono">
                                Table {cleanTableNumber || kot.table_id}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 font-sans mt-0.5">
                              {new Date(kot.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>

                          <div>
                            {kot.printed_status === "PRINTED" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" /> Printed
                              </span>
                            ) : kot.printed_status === "FAILED" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" /> Print Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <RotateCw className="w-3 h-3 animate-spin text-amber-600" /> Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="divide-y divide-stone-100 text-xs font-sans">
                          {kot.items.map((item, idx) => (
                            <div key={idx} className="py-1.5 flex items-center justify-between">
                              <span className="text-[#261C18]">
                                <strong>{item.quantity}×</strong> {item.name}
                              </span>
                              <span className="font-semibold text-stone-700">₹{item.subtotal}</span>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                          <span className="text-stone-600 font-semibold">
                            Total: <strong className="text-[#261C18]">₹{Number(kot.total_amount || 0).toLocaleString("en-IN")}</strong>
                          </span>

                          <div className="flex items-center gap-2">
                            {kot.printed_status === "FAILED" && (
                              <button
                                onClick={() => handleRetryPrint(kot.id)}
                                disabled={retryingIds[kot.id]}
                                className="px-2.5 py-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                {retryingIds[kot.id] ? "Printing..." : "Retry Print"}
                              </button>
                            )}

                            {kot.status !== "COMPLETED" && (
                              <button
                                onClick={() => handleCloseSession(kot.dining_session_id, cleanTableNumber, kot.table_id)}
                                disabled={closingSessionIds[kot.dining_session_id]}
                                className="px-2.5 py-1 rounded-md bg-[#261C18] hover:bg-[#B85B43] text-white text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                {closingSessionIds[kot.dining_session_id] ? "Settling..." : "Settle Table"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Volume Analytics (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white p-4 rounded-lg border border-[#E4DCD0] shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#261C18] border-b border-stone-100 pb-2">
                  DISPATCH VOLUME SUMMARY
                </h4>
                <div className="space-y-2 text-xs">
                  {summary?.item_summary && summary.item_summary.length > 0 ? (
                    summary.item_summary.slice(0, 8).map((it, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-stone-100 last:border-none">
                        <span className="text-stone-800 font-medium">{it.name}</span>
                        <span className="font-bold text-[#261C18]">{it.quantity} orders</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-400 italic">No orders dispatched today.</p>
                  )}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E4DCD0] shadow-2xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#261C18] border-b border-stone-100 pb-2">
                  TODAY vs YESTERDAY
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1.5 px-2 bg-[#FAF8F5] rounded-md">
                    <span>KOTs</span>
                    <span className="font-bold">
                      {summary?.comparison?.today?.kots || 0} <span className="text-stone-400 font-normal">| {summary?.comparison?.yesterday?.kots || 0}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-[#FAF8F5] rounded-md">
                    <span>Pizzas</span>
                    <span className="font-bold">
                      {summary?.comparison?.today?.pizzas || 0} <span className="text-stone-400 font-normal">| {summary?.comparison?.yesterday?.pizzas || 0}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-[#FAF8F5] rounded-md">
                    <span>Pasta</span>
                    <span className="font-bold">
                      {summary?.comparison?.today?.pasta || 0} <span className="text-stone-400 font-normal">| {summary?.comparison?.yesterday?.pasta || 0}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-2 bg-[#FAF8F5] rounded-md">
                    <span>Beverages</span>
                    <span className="font-bold">
                      {summary?.comparison?.today?.beverages || 0} <span className="text-stone-400 font-normal">| {summary?.comparison?.yesterday?.beverages || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: RESERVATIONS ================= */}
        {activeTab === "reservations" && (
          <section className="space-y-4">
            
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E4DCD0]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#261C18]">
                GUEST RESERVATIONS ({reservations.length})
              </h3>

              <div className="flex flex-wrap items-center gap-1 bg-[#F6F3EC] p-0.5 rounded-md border border-[#E4DCD0] text-xs">
                {(["all", "CONFIRMED", "ARRIVED", "SEATED", "COMPLETED", "CANCELLED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setResFilter(st)}
                    className={`px-2.5 py-1 rounded-sm capitalize transition-colors cursor-pointer ${
                      resFilter === st
                        ? "bg-[#261C18] text-white font-semibold"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {st.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Reservations Grid */}
            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white rounded-lg border border-[#E4DCD0] space-y-2">
                <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
                <h4 className="text-sm font-semibold text-[#261C18]">No Reservations Found</h4>
                <p className="text-xs text-stone-500">No bookings exist in this view.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredReservations.map((res) => {
                  const cust = res.customer;
                  const isCurrentUpdating = updatingResId === res.id;
                  const st = res.status.toUpperCase();

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
                      className="bg-white rounded-lg border border-[#E4DCD0] p-4 shadow-2xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between border-b border-stone-100 pb-2">
                          <div>
                            <span className="font-mono font-bold text-sm text-[#261C18]">
                              #RES-{String(res.id).padStart(4, "0")}
                            </span>
                            <div className="text-[11px] text-stone-500 mt-0.5">
                              {res.reservation_date} • {res.time_slot}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                            {res.status}
                          </span>
                        </div>

                        {/* Guest details */}
                        <div className="text-xs space-y-1.5 text-stone-700">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#261C18]">{cust?.name || "Guest"}</span>
                            <span className="text-stone-500 font-semibold">{res.guest_count} Guests</span>
                          </div>

                          <div className="text-stone-500 text-[11px]">
                            {cust?.phone || "No phone"}
                          </div>

                          {res.advance_amount !== undefined && Number(res.advance_amount) > 0 && (
                            <div className="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded-md border border-emerald-200 font-medium">
                              Deposit Paid: ₹{Number(res.advance_amount).toFixed(0)} ({res.payment_method || "UPI"})
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-100">
                            <span className="text-stone-500">Table:</span>
                            {res.table_name || res.table_id ? (
                              <span className="font-bold text-[#261C18]">
                                {res.table_name || `Table ${res.table_id}`}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAssigningTableRes(res)}
                                className="text-[#B85B43] font-semibold hover:underline cursor-pointer"
                              >
                                + Assign Table
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Workflow state controls */}
                      <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5">
                        {st === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "ARRIVED")}
                              disabled={isCurrentUpdating}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Arrived
                            </button>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "CANCELLED")}
                              disabled={isCurrentUpdating}
                              className="px-2.5 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {st === "ARRIVED" && (
                          <button
                            onClick={() => {
                              if (!res.table_id) setAssigningTableRes(res);
                              else handleUpdateReservationStatus(res.id, "SEATED");
                            }}
                            disabled={isCurrentUpdating}
                            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {res.table_id ? "Seat Table" : "Assign & Seat"}
                          </button>
                        )}

                        {st === "SEATED" && (
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, "COMPLETED")}
                            disabled={isCurrentUpdating}
                            className="w-full bg-[#261C18] hover:bg-[#B85B43] text-white py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Complete
                          </button>
                        )}

                        {(st === "COMPLETED" || st === "CANCELLED") && (
                          <span className="w-full text-center text-xs text-stone-400 italic">
                            {st === "COMPLETED" ? "Completed" : "Cancelled"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Modal: Assign Table */}
        {assigningTableRes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
            <div className="bg-white rounded-lg w-full max-w-md p-5 border border-[#E4DCD0] shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h3 className="font-serif font-bold text-base text-[#261C18]">
                  Assign Physical Table
                </h3>
                <button
                  type="button"
                  onClick={() => setAssigningTableRes(null)}
                  className="p-1 rounded-md hover:bg-stone-100 text-stone-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#E4DCD0] rounded-md text-xs space-y-1">
                <p>
                  <strong>Reservation:</strong> #RES-{String(assigningTableRes.id).padStart(4, "0")} • {assigningTableRes.customer?.name}
                </p>
                <p>
                  <strong>Party Size:</strong> {assigningTableRes.guest_count} Guests • {assigningTableRes.time_slot}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block">
                  Select Table:
                </label>
                <select
                  value={selectedAssignTableId}
                  onChange={(e) => setSelectedAssignTableId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-md border border-stone-300 bg-stone-50 font-sans focus:outline-hidden focus:border-[#B85B43]"
                >
                  {tableOverviews.map((tbl) => {
                    const fl = getTableFloor(tbl.table_number || tbl.table_id);
                    return (
                      <option key={tbl.table_id} value={tbl.table_id}>
                        Table {tbl.table_number} ({fl.name} • {tbl.capacity} Seats) — {tbl.status}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAssignTable(assigningTableRes.id, selectedAssignTableId)}
                  className="flex-1 bg-[#261C18] hover:bg-[#B85B43] text-white py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Confirm Table Assignment
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningTableRes(null)}
                  className="px-3 py-2.5 border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
