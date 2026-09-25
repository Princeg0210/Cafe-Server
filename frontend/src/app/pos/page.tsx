"use client";

import { useState, useEffect, useRef } from "react";
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
  Sparkles,
  Volume2,
  VolumeX,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Lock,
  LogOut,
  ShieldCheck,
  Calendar,
  UserCheck,
  XCircle,
  Phone,
  Mail,
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
  created_at: string;
  customer?: Customer;
}

export const getTableFloor = (tableIdOrNum: number | string) => {
  const num =
    typeof tableIdOrNum === "number"
      ? tableIdOrNum
      : parseInt(String(tableIdOrNum).replace(/\D/g, ""), 10) || 1;
  if (num <= 4) return { floor: 1, name: "Floor 1", short: "Floor 1" };
  if (num <= 8) return { floor: 2, name: "Floor 2", short: "Floor 2" };
  return { floor: 3, name: "Floor 3", short: "Floor 3" };
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h.includes("vercel.app") || h.includes("onrender.com")) {
        return "https://cafe-piza-api.onrender.com";
      }
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };

  const getWsBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h.includes("vercel.app") || h.includes("onrender.com")) {
        return "wss://cafe-piza-api.onrender.com";
      }
    }
    return process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  };

  // Global user interaction listener to unlock AudioContext for real-time order alerts
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
      // Tone 1: High crisp ding (880Hz / A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: Cheerful bell chime (1318.5Hz / E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.51, now + 0.12);
      gain2.gain.setValueAtTime(0.5, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
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
      const [kotsRes, sumRes, tablesRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/pos/kots${dateParam}`, { headers }),
        fetch(`${apiBase}/api/v1/pos/summary${dateParam}`, { headers }),
        fetch(`${apiBase}/api/v1/pos/table-sessions${dateParam}`, { headers }),
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
    } catch (err) {
      console.error("POS Data fetch error:", err);
    } finally {
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

  const handleUpdateReservationStatus = async (id: number, newStatus: string) => {
    if (!posToken) return;
    setUpdatingResId(id);
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/reservations/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${posToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchReservations();
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

  useEffect(() => {
    if (!posToken) return;
    fetchData(undefined, selectedDate);
    fetchReservations(undefined, selectedDate);
    const interval = setInterval(() => {
      fetchData(undefined, selectedDate);
      fetchReservations(undefined, selectedDate);
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
              setLastNotification(`New KOT ${data.kot_number} received for Table ${cleanTable}!`);
              playChime();
              setTimeout(() => setLastNotification(null), 6000);
              fetchData();
            } else if (data.event === "SESSION_CLOSED") {
              const cleanTable = data.table_number ? data.table_number.replace(/^table\s*/i, "").trim() : "";
              setLastNotification(`Table ${cleanTable || data.table_id} settled & marked Available.`);
              setTimeout(() => setLastNotification(null), 6000);
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
    if (!confirm(`Settle bill & close dining session for Table ${tableNumber}? This will mark the table as Available for new customers.`)) {
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

      // Fallback to settle by table_id if session not found by ID
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
        alert(data.message || `Table ${tableNumber} settled & session closed successfully. Table is now Available.`);
        await Promise.all([fetchData(), fetchReservations()]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Cannot settle table: ${err.detail || "Server returned " + res.status}`);
      }
    } catch {
      alert("Network error: Could not reach café backend server. Please check your connection.");
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
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #261C18; padding: 30px; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #261C18; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px; }
          .header p { margin: 5px 0 0 0; font-size: 12px; color: #666; }
          .badge { display: inline-block; background: #261C18; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-top: 8px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
          .card { background: #f9f7f4; border: 1px solid #e4dcd0; padding: 12px; border-radius: 8px; text-align: center; }
          .card .title { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
          .card .val { font-size: 18px; font-weight: bold; color: #B85B43; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #261C18; color: #fff; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; }
          td { border-bottom: 1px solid #eee; padding: 8px 12px; }
          tr:nth-child(even) { background: #faf9f7; }
          .section-title { font-size: 14px; font-weight: bold; margin-top: 25px; margin-bottom: 8px; text-transform: uppercase; border-left: 4px solid #B85B43; padding-left: 8px; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>JAADOO TRATTORIA • POS RESET REPORT</h1>
          <p>Udaipur Old City • Automated Session Backup</p>
          <div class="badge">Date: ${reportDate} | Generated: ${printTime}</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="title">Total Revenue</div>
            <div class="val">₹${kots.reduce((sum, k) => sum + k.total_amount, 0)}</div>
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
              <td><span style="color: #059669; font-weight: bold;">ACTIVE</span></td>
              <td>#${s.session_seq} (${s.session_token.slice(0, 8)}...)</td>
              <td>${new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>${s.items_count} items</td>
              <td><strong>₹${s.total_amount}</strong></td>
            </tr>
          `;
        }
      });
    });

    if (activeCount === 0) {
      htmlContent += `<tr><td colspan="6" style="text-align:center; color:#888; padding: 15px;">No active sessions found at the time of reset.</td></tr>`;
    }

    htmlContent += `
          </tbody>
        </table>

        <div class="section-title">All Live KOT Tickets (${kots.length})</div>
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
          <td><strong>₹${kot.total_amount}</strong></td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>

        <div class="footer">
          This report was automatically generated prior to performing a POS session reset.<br>
          JAADOO TRATTORIA (Jazz & Blues Hospitality LLP) • ${reportDate}
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
    if (!confirm("⚠️ Are you sure you want to RESET ALL POS SESSIONS?\n\nA PDF summary report will be generated and saved/printed automatically before resetting.")) {
      return;
    }

    setIsResettingAll(true);

    // 1. First automatically generate and trigger PDF download/print report
    try {
      generatePDFReport();
    } catch (e) {
      console.error("PDF generation warning:", e);
    }

    // 2. Perform API reset
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
        alert(data.message || "Session report saved! All active table sessions have been reset and tables set to Available.");
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
    // Auto-expand active sessions that have orders so cashier sees them immediately
    return session.is_active && session.items_count > 0;
  };

  const filteredTables = tableOverviews.filter((tbl) => {
    if (tableFilter === "active") return tbl.active_session_count > 0;
    if (tableFilter === "available") return tbl.active_session_count === 0;
    return true;
  });

  // 1. Initial Checking Screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-3 border-[#261C18] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-condensed text-xl font-bold uppercase tracking-wider text-[#261C18]">
          Verifying Staff POS Terminal Access...
        </p>
      </div>
    );
  }

  // 2. Staff Authentication Modal / Gate (Requirement 1 & 5)
  if (!posToken) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans flex flex-col justify-between p-6">
        <div className="max-w-md mx-auto my-auto w-full bg-white rounded-3xl p-8 sm:p-10 border border-[#E4DCD0] shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/50 mx-auto shadow-md">
              <Lock className="w-6 h-6 text-[#B85B43]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B85B43]/10 text-[#B85B43] text-xs font-semibold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Authentication Required</span>
            </div>
            <h1 className="font-serif font-extrabold text-3xl text-[#261C18]">
              JAADOO <span className="italic font-normal text-[#B85B43]">POS</span>
            </h1>
            <p className="text-xs text-stone-500 font-sans">
              Enter authorized cashier or manager credentials to open the live terminal.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-sans">
                Username
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. Jaadoo"
                className="w-full text-sm p-3.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#B85B43] bg-gray-50/50 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 font-sans">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter POS password"
                className="w-full text-sm p-3.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#B85B43] bg-gray-50/50 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#261C18] hover:bg-[#B85B43] disabled:opacity-50 text-white py-3.5 rounded-2xl font-condensed font-bold text-lg uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                "Authenticate POS Terminal"
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-stone-500 font-sans">
            <Link href="/" className="hover:text-[#261C18] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Website
            </Link>
            <span>Role: Cashier / POS</span>
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
      if (sortOrder === "asc") {
        return a.sequence_number - b.sequence_number;
      }
      return b.sequence_number - a.sequence_number;
    });

  const filteredReservations = reservations.filter((r) => {
    if (resFilter === "all") return true;
    return r.status.toUpperCase() === resFilter;
  });

  const currentDateDisplay = summary?.business_date || new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans selection:bg-[#B85B43]/20">
      {/* Top Editorial Bar */}
      <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] shadow-xs px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Header Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-full bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/40 group-hover:border-[#B85B43] transition-all shadow-xs">
                <span className="font-serif italic font-bold text-lg text-[#B85B43]">J</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-extrabold text-xl leading-none text-[#261C18]">
                  JAADOO <span className="font-serif italic font-normal text-lg text-[#B85B43]">POS</span>
                </span>
                <span className="text-[9px] font-sans tracking-[0.2em] text-[#4A5842] uppercase font-semibold mt-0.5 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#4A5842] animate-pulse" : "bg-rose-500"}`} />
                  {isConnected ? "Live POS Active" : "Reconnecting..."}
                </span>
              </div>
            </Link>

            {/* Header Date Picker Pill */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1C1512] text-[#FBF9F5] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-[#B85B43]/70 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline text-[11px] font-sans font-bold uppercase tracking-wider text-amber-200/90">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold uppercase tracking-wider text-white focus:outline-none cursor-pointer [color-scheme:dark] max-w-[125px]"
                title="Filter POS by date"
              />
              {!isTodaySelected ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(0))}
                  className="ml-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-[#B85B43] hover:bg-[#A84E38] text-white transition-colors uppercase cursor-pointer"
                  title="Return to Today"
                >
                  Today
                </button>
              ) : (
                <span className="hidden sm:inline ml-1 text-[9px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 uppercase">
                  Today
                </span>
              )}
            </div>

            {currentTime && (
              <span className="hidden md:flex px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider bg-[#261C18] text-[#FBF9F5] border border-[#B85B43]/40 shadow-xs items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#B85B43]" />
                <span>{currentTime}</span>
              </span>
            )}
          </div>

          {/* Real-time Order Popup Notification */}
          {lastNotification && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-[#261C18] text-[#FBF9F5] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-md border border-[#B85B43]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#B85B43] animate-spin" />
              <span>{lastNotification}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            {/* Tab Selectors */}
            <div className="flex items-center bg-[#F6F3EC] p-1 rounded-full border border-[#E4DCD0] text-xs">
              <button
                onClick={() => setActiveTab("tables")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  activeTab === "tables"
                    ? "bg-[#261C18] text-[#FBF9F5] font-semibold shadow-xs"
                    : "text-[#261C18]/70 hover:text-[#261C18]"
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Tables & Sessions ({tableOverviews.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("kots")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  activeTab === "kots"
                    ? "bg-[#261C18] text-[#FBF9F5] font-semibold shadow-xs"
                    : "text-[#261C18]/70 hover:text-[#261C18]"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Live Tickets ({kots.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("reservations")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                  activeTab === "reservations"
                    ? "bg-[#261C18] text-[#FBF9F5] font-semibold shadow-xs"
                    : "text-[#261C18]/70 hover:text-[#261C18]"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Reservations ({reservations.length})</span>
              </button>
            </div>

            {/* Authenticated Staff Indicator */}
            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{staffUser?.username || "cashier"}</span>
              <span className="text-[10px] text-stone-400">({staffUser?.role?.name || "Cashier"})</span>
            </div>

            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) {
                  setTimeout(playChime, 60);
                }
              }}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-[#261C18] border-[#261C18] text-[#FBF9F5]"
                  : "bg-[#F6F3EC] border-[#E4DCD0] text-stone-500"
              }`}
              title={soundEnabled ? "Mute New KOT Chime (Sound ON)" : "Enable Sound Chime (Sound OFF)"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                fetchData();
                fetchReservations();
              }}
              disabled={isRefreshing || isRefreshingRes}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] text-xs font-semibold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isRefreshingRes ? "animate-spin" : ""}`} />
              Refresh
            </button>

            {/* Terminal Lock / Sign Out */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium transition-colors"
              title="Lock POS Terminal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Editorial Hero Banner: TODAY'S OPERATIONS */}
        <section className="relative overflow-hidden rounded-3xl bg-[#261C18] text-[#FBF9F5] border border-[#E4DCD0]/30 p-6 sm:p-9 shadow-md">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-[#B85B43]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#4A5842]/25 text-[#FBF9F5] border border-[#4A5842]/50 px-3 py-1 rounded-full text-[10px] font-sans font-semibold tracking-[0.2em] uppercase mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isTodaySelected ? "bg-[#4A5842] animate-pulse" : isFutureDateSelected ? "bg-amber-400" : "bg-stone-400"}`} />
                <span>
                  {isTodaySelected
                    ? "LIVE TODAY OPERATIONS"
                    : isFutureDateSelected
                    ? `FUTURE DATE PLANNING • ${selectedDate}`
                    : `HISTORICAL READ-ONLY ARCHIVE • ${selectedDate}`}
                </span>
              </div>
              <h2 className="text-sm font-serif italic text-stone-300">
                {isTodaySelected
                  ? "Real-time Operations & Active Table Sessions"
                  : isFutureDateSelected
                  ? "Upcoming Reservations & Scheduled Bookings"
                  : "Historical Business Day Archive (Read-Only)"}
              </h2>
              <div className="flex items-baseline gap-4 mt-1">
                <span className="text-5xl sm:text-7xl font-sans font-extrabold tracking-tight text-[#FBF9F5]">
                  {summary ? String(summary.total_kots).padStart(2, "0") : String(kots.length).padStart(2, "0")}
                </span>
                <span className="font-serif italic font-normal text-lg sm:text-2xl text-[#B85B43]">
                  {isTodaySelected ? "ORDERS TODAY" : isFutureDateSelected ? "UPCOMING ORDERS" : "HISTORICAL KOTS"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <Users className="w-3.5 h-3.5 text-[#B85B43]" />
                  Tables Served
                </div>
                <div className="text-2xl font-sans font-bold text-[#FBF9F5]">
                  {summary?.tables_served || 0}
                </div>
              </div>

              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#4A5842]" />
                  Total Items
                </div>
                <div className="text-2xl font-sans font-bold text-[#FBF9F5]">
                  {summary?.total_items || 0}
                </div>
              </div>

              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  Avg KOT Value
                </div>
                <div className="text-2xl font-sans font-bold text-amber-300">
                  ₹{summary?.avg_kot_value ? Math.round(summary.avg_kot_value) : 0}
                </div>
              </div>

              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <Flame className="w-3.5 h-3.5 text-[#B85B43]" />
                  Peak Hour
                </div>
                <div className="text-lg font-sans font-bold text-[#FBF9F5] truncate">
                  {summary?.peak_hour || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Operations Date Control Bar */}
          <div className="mt-6 pt-5 border-t border-[#E4DCD0]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-amber-200">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Operational Date:</span>
              </span>

              {/* Main Calendar Input */}
              <div className="flex items-center gap-2 bg-[#1C1512] px-3.5 py-1.5 rounded-xl border-2 border-[#B85B43] shadow-md hover:border-[#D97055] transition-colors">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-mono font-bold text-white focus:outline-none cursor-pointer [color-scheme:dark]"
                  title="Choose any business date"
                />
              </div>

              {/* Quick 1-Click Date Switchers */}
              <div className="flex items-center gap-1 bg-[#1C1512]/90 p-1 rounded-xl border border-[#E4DCD0]/20 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(0))}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    isTodaySelected
                      ? "bg-[#B85B43] text-white shadow-xs"
                      : "text-stone-300 hover:text-white hover:bg-stone-800"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(-1))}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedDate === getLocalDateString(-1)
                      ? "bg-[#B85B43] text-white shadow-xs font-bold"
                      : "text-stone-300 hover:text-white hover:bg-stone-800"
                  }`}
                >
                  Yesterday
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(-2))}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedDate === getLocalDateString(-2)
                      ? "bg-[#B85B43] text-white shadow-xs font-bold"
                      : "text-stone-300 hover:text-white hover:bg-stone-800"
                  }`}
                >
                  2 Days Ago
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(1))}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedDate === getLocalDateString(1)
                      ? "bg-[#B85B43] text-white shadow-xs font-bold"
                      : "text-stone-300 hover:text-white hover:bg-stone-800"
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            {/* Active Shift Indicator & Return Button */}
            <div className="flex items-center gap-3">
              <div className="text-xs font-sans text-stone-300 flex items-center gap-2">
                <span>Active Date:</span>
                <span className="font-mono font-bold text-amber-300 text-sm bg-[#1C1512] px-2.5 py-1 rounded-lg border border-[#E4DCD0]/20">
                  {selectedDate}
                </span>
                {isTodaySelected ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-900/90 text-emerald-300 border border-emerald-500/40 uppercase">
                    Live Shift
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-900/90 text-amber-300 border border-amber-500/40 uppercase">
                    {isFutureDateSelected ? "Future Booking" : "Historical"}
                  </span>
                )}
              </div>

              {!isTodaySelected && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getLocalDateString(0))}
                  className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#B85B43] hover:bg-[#A84E38] text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Return to today's live shift"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Return to Today</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================= TAB 1: TABLE SESSIONS HIERARCHY ================= */}
        {activeTab === "tables" && (
          <div className="space-y-6">
            {/* Filter and Overview Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E4DCD0] shadow-xs">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#261C18]">
                  Dining Tables & Session History
                </h3>
                <p className="text-xs font-serif italic text-stone-500 mt-0.5">
                  Click any table session arrow to inspect ordered items, prices, and 1-tap settle bills
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAllSessions}
                  disabled={isResettingAll}
                  className="px-3.5 py-1.5 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                  title="Reset all active table sessions & mark tables as available"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isResettingAll ? "animate-spin" : ""}`} />
                  <span>{isResettingAll ? "Resetting..." : "Reset All Sessions"}</span>
                </button>

                {(() => {
                  const totalSettledToday = tableOverviews.reduce(
                    (acc, t) => acc + t.sessions.filter((s) => !s.is_active).length,
                    0
                  );
                  const anyPastOpened =
                    isTodaySelected &&
                    tableOverviews.length > 0 &&
                    tableOverviews.some((t) => showClosedToday[t.table_id]);

                  if (!isTodaySelected || totalSettledToday === 0) return null;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !anyPastOpened;
                        const updated: Record<number, boolean> = {};
                        tableOverviews.forEach((t) => {
                          updated[t.table_id] = nextState;
                        });
                        setShowClosedToday(updated);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold flex items-center gap-1.5 transition-all shadow-xs border ${
                        anyPastOpened
                          ? "bg-[#261C18] text-white border-[#261C18] hover:bg-stone-800"
                          : "bg-white text-[#B85B43] border-[#B85B43]/40 hover:bg-[#B85B43]/10"
                      }`}
                      title={
                        anyPastOpened
                          ? "Close past sessions on all tables"
                          : "View past sessions across all tables"
                      }
                    >
                      {anyPastOpened ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-stone-300" />
                          <span>Close All Past Sessions</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#B85B43]" />
                          <span>Past Sessions Today ({totalSettledToday})</span>
                        </>
                      )}
                    </button>
                  );
                })()}

                <div className="flex items-center gap-1 bg-[#F6F3EC] p-1 rounded-full border border-[#E4DCD0] text-xs">
                  {(["all", "active", "available"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTableFilter(mode)}
                      className={`px-3.5 py-1.5 rounded-full capitalize font-medium transition-all ${
                        tableFilter === mode
                          ? "bg-[#B85B43] text-[#FBF9F5] font-semibold shadow-xs"
                          : "text-[#261C18]/70 hover:text-[#261C18]"
                      }`}
                    >
                      {mode === "all"
                        ? `All Tables (${tableOverviews.length})`
                        : mode === "active"
                        ? `Occupied (${tableOverviews.filter((t) => t.active_session_count > 0).length})`
                        : `Available (${tableOverviews.filter((t) => t.active_session_count === 0).length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of All Tables */}
            {filteredTables.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-[#E4DCD0] shadow-xs space-y-3">
                <UtensilsCrossed className="w-12 h-12 text-stone-300 mx-auto stroke-[1.5]" />
                <h4 className="text-lg font-serif font-bold text-[#261C18]">No Tables Found</h4>
                <p className="text-xs font-serif italic text-stone-500 max-w-sm mx-auto">
                  {tableFilter === "active"
                    ? "No tables currently have active dining sessions."
                    : "No tables available in the current filter."}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredTables.map((tbl) => {
                  const cleanTableNumber = tbl.table_number.replace(/^table\s*/i, "").replace(/^t-/i, "").trim();
                  const displayTableName = `Table ${cleanTableNumber || tbl.table_id}`;
                  const activeSessions = tbl.sessions.filter((s) => s.is_active);
                  const settledSessions = tbl.sessions.filter((s) => !s.is_active);
                  const showHistory = !!showClosedToday[tbl.table_id];
                  const visibleSessions = isTodaySelected
                    ? (showHistory ? tbl.sessions : activeSessions)
                    : tbl.sessions;

                  return (
                    <div
                      key={tbl.table_id}
                      className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs ${
                        tbl.active_session_count > 0
                          ? "border-amber-300 ring-1 ring-amber-400/25 shadow-sm"
                          : "border-[#E4DCD0]"
                      }`}
                    >
                      {/* Table Header Bar */}
                      <div className="bg-[#FAF8F5] px-6 py-4 border-b border-[#E4DCD0]/70 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex flex-wrap items-baseline gap-2.5 sm:gap-3">
                              <span className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl text-[#261C18] tracking-tight">
                                {displayTableName}
                              </span>
                              <span className="font-sans font-bold text-lg sm:text-2xl text-[#B85B43]">
                                • {getTableFloor(cleanTableNumber || tbl.table_id).name}
                              </span>
                              <span className="text-xs sm:text-sm text-stone-500 font-sans font-medium">
                                ({tbl.capacity} Seats)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {tbl.active_session_count > 0 ? (
                                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-800">
                                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                  Currently Occupied ({tbl.active_session_count} Active Session)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-stone-500">
                                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                  Table Available
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-sans text-stone-500">
                          <span className="bg-white px-3.5 py-1.5 rounded-full border border-[#E4DCD0] font-medium shadow-2xs">
                            {tbl.total_sessions_today} {tbl.total_sessions_today === 1 ? "Session" : "Sessions"} Today
                          </span>

                          {/* Per-Table Past Sessions Toggle & Close Button */}
                          {isTodaySelected && settledSessions.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowClosedToday((prev) => ({
                                  ...prev,
                                  [tbl.table_id]: !prev[tbl.table_id],
                                }))
                              }
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-all border shadow-2xs cursor-pointer ${
                                showHistory
                                  ? "bg-[#261C18] text-white border-[#261C18] hover:bg-stone-800"
                                  : "bg-white text-[#B85B43] border-[#B85B43]/40 hover:bg-[#B85B43]/10"
                              }`}
                              title={
                                showHistory
                                  ? "Close past sessions list for this table"
                                  : "View past settled sessions for this table"
                              }
                            >
                              {showHistory ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-stone-300" />
                                  <span>Close Past ({settledSessions.length})</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-[#B85B43]" />
                                  <span>Past Sessions ({settledSessions.length})</span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sessions Listed Under This Table */}
                      <div className="p-4 sm:p-6 space-y-3">
                        {visibleSessions.length === 0 ? (
                          <div className="py-6 px-4 rounded-2xl bg-stone-50/70 border border-dashed border-stone-200 text-center space-y-2">
                            <p className="text-xs text-stone-500 font-serif italic">
                              No active dining sessions on {displayTableName} right now. Ready for walk-in guests.
                            </p>
                            {isTodaySelected && settledSessions.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowClosedToday((prev) => ({
                                    ...prev,
                                    [tbl.table_id]: true,
                                  }))
                                }
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B85B43] hover:underline pt-1 cursor-pointer"
                              >
                                <span>
                                  View {settledSessions.length} Past Settled {settledSessions.length === 1 ? "Session" : "Sessions"} Today
                                </span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Prominent Dismissible Banner when viewing Past Sessions */}
                            {showHistory && settledSessions.length > 0 && (
                              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-[#261C18]">
                                <span className="font-medium flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-[#B85B43]" />
                                  Showing {settledSessions.length} past settled {settledSessions.length === 1 ? "session" : "sessions"} from today
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowClosedToday((prev) => ({
                                      ...prev,
                                      [tbl.table_id]: false,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-stone-700 hover:text-red-700 bg-white hover:bg-red-50 border border-stone-300 hover:border-red-300 px-2.5 py-1 rounded-lg transition-colors shadow-2xs cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  <span>Close Past Sessions</span>
                                </button>
                              </div>
                            )}
                              {visibleSessions.map((sess) => {
                                const isExpanded = isSessionExpanded(sess);
                                const isClosing = closingSessionIds[sess.session_id];

                                return (
                                  <div
                                    key={sess.session_id}
                                    className={`rounded-2xl border transition-all ${
                                      sess.is_active
                                        ? "bg-amber-50/30 border-amber-200 hover:border-amber-300"
                                        : "bg-stone-50/50 border-stone-200 hover:border-stone-300 opacity-80"
                                    }`}
                                  >
                                  {/* Session Line Header */}
                                  <div
                                    onClick={() => toggleSession(sess.session_id)}
                                    className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Expand/Collapse Arrow */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSession(sess.session_id);
                                        }}
                                        className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors shadow-2xs"
                                        title={isExpanded ? "Collapse item list" : "Expand ordered items"}
                                      >
                                        <ChevronDown
                                          className={`w-4 h-4 transition-transform duration-200 ${
                                            isExpanded ? "rotate-0" : "-rotate-90"
                                          }`}
                                        />
                                      </button>

                                      {/* Session Sequence & Table */}
                                      <div className="flex flex-wrap items-baseline gap-2">
                                        <span className="font-serif font-bold text-base sm:text-lg text-[#261C18]">
                                          {displayTableName}
                                        </span>
                                        <span className="font-sans font-semibold text-sm text-[#B85B43]">
                                          • {getTableFloor(cleanTableNumber || tbl.table_id).name}
                                        </span>
                                        <span className="text-xs font-mono font-medium text-stone-500">
                                          (Session #{sess.session_seq})
                                        </span>
                                        {sess.is_active ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                            Active Session
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 bg-stone-200/80 px-2.5 py-0.5 rounded-full border border-stone-300">
                                            <Check className="w-3 h-3 text-stone-500" />
                                            Bill Settled
                                          </span>
                                        )}
                                      </div>

                                      {/* Timestamp & Guest Name */}
                                      <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 font-sans">
                                        <span>Date: {selectedDate}</span>
                                        <span>• Opened {new Date(sess.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                        {sess.closed_at && (
                                          <span>• Settled {new Date(sess.closed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                        )}
                                        {sess.customer_name && (
                                          <span className="text-stone-700 font-medium">• Guest: {sess.customer_name}</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right Side: Totals & Settle Action */}
                                    <div className="flex items-center gap-3">
                                      <div className="text-right">
                                        <div className="text-sm font-bold text-[#261C18] font-sans">
                                          ₹{sess.total_amount}
                                        </div>
                                        <div className="text-[11px] text-stone-500 font-sans">
                                          {sess.items_count} {sess.items_count === 1 ? "item" : "items"} ordered
                                        </div>
                                      </div>

                                      {sess.is_active && isTodaySelected ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCloseSession(sess.session_id, cleanTableNumber, tbl.table_id);
                                          }}
                                          disabled={isClosing}
                                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>{isClosing ? "Closing..." : "Settle Table"}</span>
                                        </button>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                                          {sess.is_active ? "Active" : "Settled"}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Collapsible Ordered Items Breakdown (Shown via arrow) */}
                                  {isExpanded && (
                                    <div className="px-5 pb-4 pt-1 border-t border-stone-200/70 bg-white rounded-b-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                                      <div className="text-[11px] font-sans font-semibold text-stone-400 uppercase tracking-wider mb-2 pt-2">
                                        Ordered Items in {displayTableName} — Session #{sess.session_seq}
                                      </div>

                                      {sess.items.length === 0 ? (
                                        <p className="text-xs text-stone-400 font-sans italic py-2">
                                          No items ordered yet in this session.
                                        </p>
                                      ) : (
                                        <div className="divide-y divide-stone-100">
                                          {sess.items.map((item, idx) => (
                                            <div key={idx} className="py-2.5 flex items-center justify-between text-xs font-sans">
                                              <div className="flex items-center gap-2.5">
                                                <span className="w-6 h-6 rounded-md bg-stone-100 text-stone-800 font-bold flex items-center justify-center text-xs">
                                                  {item.quantity}×
                                                </span>
                                                <div>
                                                  <span className="font-semibold text-[#261C18]">{item.name}</span>
                                                  {item.special_instructions && (
                                                    <div className="text-[11px] text-amber-700 italic">
                                                      Note: {item.special_instructions}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-4 text-stone-600">
                                                <span className="text-[11px] text-stone-400">@ ₹{item.unit_price}</span>
                                                <span className="font-bold text-[#261C18] min-w-[50px] text-right">₹{item.subtotal}</span>
                                              </div>
                                            </div>
                                          ))}

                                          {/* Session Item Summary Footer */}
                                          <div className="pt-3 mt-1 flex items-center justify-between text-xs font-sans font-bold text-[#261C18]">
                                            <span>Total Bill for Session #{sess.session_seq}</span>
                                            <span className="text-base text-[#B85B43]">₹{sess.total_amount}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Bottom Close Button when viewing Past Sessions */}
                            {showHistory && settledSessions.length > 0 && (
                              <div className="pt-2 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowClosedToday((prev) => ({
                                      ...prev,
                                      [tbl.table_id]: false,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#261C18] bg-stone-100 hover:bg-stone-200 px-4 py-1.5 rounded-full border border-stone-300 transition-colors shadow-2xs cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-stone-500" />
                                  <span>Close Past Sessions View</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: LIVE KOT TICKETS ================= */}
        {activeTab === "kots" && (
          <>
            {/* 2-Column Main Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: NEW KOTS Live Feed (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DCD0] pb-3.5">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
                      <span>NEW KOTS</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E4DCD0]/60 text-[#261C18] font-sans font-medium">
                        <span className="font-bold">{filteredKots.length}</span> Tickets
                      </span>
                    </h3>
                    <p className="text-xs font-serif italic text-stone-500 mt-0.5">Live real-time thermal ticket flow</p>
                  </div>

                  {/* Controls: Sort and Status Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1 to N Sort Switcher */}
                    <div className="flex items-center gap-1 bg-[#F6F3EC] p-1 rounded-full border border-[#E4DCD0] text-xs">
                      <button
                        onClick={() => setSortOrder("asc")}
                        className={`px-3 py-1 rounded-full font-medium transition-all ${
                          sortOrder === "asc"
                            ? "bg-[#261C18] text-[#FBF9F5] font-semibold shadow-xs"
                            : "text-[#261C18]/70 hover:text-[#261C18]"
                        }`}
                      >
                        1 → N (Count)
                      </button>
                      <button
                        onClick={() => setSortOrder("desc")}
                        className={`px-3 py-1 rounded-full font-medium transition-all ${
                          sortOrder === "desc"
                            ? "bg-[#261C18] text-[#FBF9F5] font-semibold shadow-xs"
                            : "text-[#261C18]/70 hover:text-[#261C18]"
                        }`}
                      >
                        Latest First
                      </button>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-[#F6F3EC] p-1 rounded-full border border-[#E4DCD0] text-xs">
                      {(["all", "failed", "printed", "pending"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setFilter(t)}
                          className={`px-3 py-1 rounded-full capitalize font-medium transition-all ${
                            filter === t
                              ? "bg-[#B85B43] text-[#FBF9F5] font-semibold shadow-xs"
                              : "text-[#261C18]/70 hover:text-[#261C18]"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* KOT Cards List */}
                {filteredKots.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-white rounded-3xl border border-[#E4DCD0] shadow-xs space-y-3">
                    <Printer className="w-12 h-12 text-stone-300 mx-auto stroke-[1.5]" />
                    <h4 className="text-lg font-serif font-bold text-[#261C18]">No Active KOT Tickets</h4>
                    <p className="text-xs font-serif italic text-stone-500 max-w-sm mx-auto">
                      All kitchen orders have been dispatched or printed. New incoming table orders will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredKots.map((kot) => {
                      const cleanTableNumber = kot.table_number ? kot.table_number.replace(/^table\s*/i, "").trim() : "";
                      return (
                        <div
                          key={kot.id}
                          className="bg-white rounded-3xl border border-[#E4DCD0] p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden"
                        >
                          <div className="flex items-start justify-between gap-4 border-b border-[#E4DCD0]/60 pb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-[#261C18] text-[#FBF9F5] flex flex-col items-center justify-center font-sans font-extrabold shadow-xs">
                                <span className="text-[10px] text-stone-400 font-sans uppercase">No.</span>
                                <span className="text-base text-[#FBF9F5] leading-none">{kot.sequence_number}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-sans font-bold text-lg text-[#261C18]">
                                    {kot.kot_number}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-sans font-medium">
                                    {kot.order_number}
                                  </span>
                                </div>
                                <div className="text-xs text-stone-500 flex items-center gap-1.5 font-sans mt-0.5">
                                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                  <span>{kot.business_date || selectedDate}</span>
                                  <span>•</span>
                                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                                  <span>{new Date(kot.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono font-black text-xl sm:text-2xl text-[#261C18] tracking-tight">
                                  Table {cleanTableNumber.padStart(2, "0") || kot.table_id}
                                </span>
                                <span className="font-sans font-bold text-sm sm:text-base text-[#B85B43]">
                                  • {getTableFloor(cleanTableNumber || kot.table_id).name}
                                </span>
                              </div>
                              <div className="mt-1">
                                {kot.printed_status === "PRINTED" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Check className="w-3 h-3" /> Printed
                                  </span>
                                ) : kot.printed_status === "FAILED" ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                    <AlertCircle className="w-3 h-3" /> Failed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <RotateCw className="w-3 h-3 animate-spin" /> Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ticket Items */}
                          <div className="py-3 divide-y divide-gray-100">
                            {kot.items.map((item, idx) => (
                              <div key={idx} className="py-2 flex items-center justify-between text-sm font-sans">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-md bg-stone-100 text-stone-800 font-bold flex items-center justify-center text-xs">
                                    {item.quantity}×
                                  </span>
                                  <span className="font-medium text-[#261C18]">{item.name}</span>
                                </div>
                                <span className="font-semibold text-stone-700">₹{item.subtotal}</span>
                              </div>
                            ))}
                          </div>

                          {/* Footer Actions: Print Retry & Settle Table */}
                          <div className="pt-3 border-t border-[#E4DCD0]/60 flex items-center justify-between gap-3">
                            <div className="text-xs font-sans text-stone-500">
                              <span>Total: </span>
                              <span className="font-bold text-[#261C18] text-sm">₹{kot.total_amount}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {kot.printed_status === "FAILED" && (
                                <button
                                  onClick={() => handleRetryPrint(kot.id)}
                                  disabled={retryingIds[kot.id]}
                                  className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-sans font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>{retryingIds[kot.id] ? "Printing..." : "Retry Print"}</span>
                                </button>
                              )}

                              {kot.status === "COMPLETED" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" /> Table Settled
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleCloseSession(kot.dining_session_id, cleanTableNumber, kot.table_id)}
                                  disabled={closingSessionIds[kot.dining_session_id]}
                                  className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-sans font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{closingSessionIds[kot.dining_session_id] ? "Closing..." : "Settle Table"}</span>
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

              {/* Right Column: Analytics & Operations Summary (5 Cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-3xl border border-[#E4DCD0] p-6 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-xl font-serif font-bold text-[#261C18] flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#B85B43]" />
                      <span>Item Volume Summary</span>
                    </h3>
                    <p className="text-xs font-serif italic text-stone-500 mt-0.5">Top dispatched menu items today</p>
                  </div>

                  <div className="space-y-3">
                    {summary?.item_summary && summary.item_summary.length > 0 ? (
                      summary.item_summary.slice(0, 8).map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-sans py-1.5 border-b border-gray-100 last:border-none">
                          <span className="text-[#261C18] font-medium">{it.name}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-stone-100 font-bold text-stone-800">
                            {it.quantity} orders
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400 font-sans italic">No items dispatched yet today.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-[#E4DCD0] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#B85B43] font-semibold">
                      TODAY vs YESTERDAY
                    </span>
                    <span className="text-xs font-serif italic text-stone-400">Today | Yest</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">KOTs</span>
                      <span className="font-sans font-bold text-[#261C18]">
                        {summary?.comparison?.today?.kots || 0}
                        <span className="text-stone-300 font-sans font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary?.comparison?.yesterday?.kots || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">Pizzas</span>
                      <span className="font-sans font-bold text-[#261C18]">
                        {summary?.comparison?.today?.pizzas || 0}
                        <span className="text-stone-300 font-sans font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary?.comparison?.yesterday?.pizzas || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">Pasta</span>
                      <span className="font-sans font-bold text-[#261C18]">
                        {summary?.comparison?.today?.pasta || 0}
                        <span className="text-stone-300 font-sans font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary?.comparison?.yesterday?.pasta || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">Beverages</span>
                      <span className="font-sans font-bold text-[#261C18]">
                        {summary?.comparison?.today?.beverages || 0}
                        <span className="text-stone-300 font-sans font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary?.comparison?.yesterday?.beverages || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ================= TAB 2: TABLE RESERVATIONS (OPTION A) ================= */}
        {activeTab === "reservations" && (
          <div className="space-y-6">
            {/* Reservations Header Banner */}
            <section className="relative overflow-hidden rounded-3xl bg-[#261C18] text-[#FBF9F5] border border-[#E4DCD0]/30 p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 bg-[#B85B43]/20 text-[#FBF9F5] border border-[#B85B43]/50 px-3 py-1 rounded-full text-[10px] font-sans font-semibold tracking-[0.2em] uppercase mb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#B85B43]" />
                    <span>TABLE RESERVATION DESK</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-serif font-extrabold">
                    Guest Reservations ({reservations.length})
                  </h2>
                  <p className="text-xs font-serif italic text-stone-300 mt-1">
                    Real-time bookings from website with guest details, table seating & arrival controls
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#1C1512] p-1.5 rounded-2xl border border-white/10 text-xs">
                  {(["all", "CONFIRMED", "ARRIVED", "SEATED", "COMPLETED", "CANCELLED"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setResFilter(st)}
                      className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-all ${
                        resFilter === st
                          ? "bg-[#B85B43] text-white font-bold shadow-xs"
                          : "text-stone-300 hover:text-white"
                      }`}
                    >
                      {st.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Reservations List */}
            {filteredReservations.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-[#E4DCD0] shadow-xs space-y-3">
                <Calendar className="w-12 h-12 text-stone-300 mx-auto stroke-[1.5]" />
                <h4 className="text-lg font-serif font-bold text-[#261C18]">No Reservations Found</h4>
                <p className="text-xs font-serif italic text-stone-500 max-w-sm mx-auto">
                  {resFilter === "all"
                    ? "No online table bookings have been received yet."
                    : `No reservations with status '${resFilter}' exist.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredReservations.map((res) => {
                  const cust = res.customer;
                  const isCurrentUpdating = updatingResId === res.id;
                  const st = res.status.toUpperCase();

                  const statusColor =
                    st === "CONFIRMED"
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : st === "ARRIVED"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : st === "SEATED"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : st === "COMPLETED"
                      ? "bg-gray-100 text-gray-700 border-gray-200"
                      : "bg-rose-50 text-rose-800 border-rose-200";

                  return (
                    <div
                      key={res.id}
                      className="bg-white rounded-3xl border border-[#E4DCD0] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      {/* Top Row: Ref & Status Badge */}
                      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                        <div>
                          <span className="text-[11px] font-sans font-bold text-stone-400 uppercase tracking-wider block">
                            Booking Ref
                          </span>
                          <span className="font-sans font-extrabold text-base text-[#261C18]">
                            #RES-{String(res.id).padStart(4, "0")}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-wider border ${statusColor}`}>
                          {res.status}
                        </span>
                      </div>

                      {/* Guest Details */}
                      <div className="space-y-2 text-xs font-sans text-stone-700">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#B85B43] shrink-0" />
                          <span className="font-bold text-sm text-[#261C18]">{cust?.name || "Guest"}</span>
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[11px] font-semibold text-stone-600">
                            {res.guest_count} {res.guest_count === 1 ? "Guest" : "Guests"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-stone-600">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{cust?.phone || "N/A"}</span>
                        </div>

                        {cust?.email && (
                          <div className="flex items-center gap-2 text-stone-600">
                            <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate">{cust.email}</span>
                          </div>
                        )}

                        <div className="p-3 bg-[#F8F5F0] rounded-2xl border border-[#E4DCD0] space-y-1 mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">Date:</span>
                            <span className="font-bold text-[#261C18]">{res.reservation_date}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">Time Slot:</span>
                            <span className="font-bold text-[#B85B43]">{res.time_slot}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Controls based on State Machine */}
                      <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                        {st === "CONFIRMED" && (
                          <>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "ARRIVED")}
                              disabled={isCurrentUpdating}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Arrived</span>
                            </button>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "CANCELLED")}
                              disabled={isCurrentUpdating}
                              className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-sans font-semibold transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {st === "ARRIVED" && (
                          <>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "SEATED")}
                              disabled={isCurrentUpdating}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Seat Table</span>
                            </button>
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, "CANCELLED")}
                              disabled={isCurrentUpdating}
                              className="px-3 py-2 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl text-xs font-sans font-semibold transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {st === "SEATED" && (
                          <button
                            onClick={() => handleUpdateReservationStatus(res.id, "COMPLETED")}
                            disabled={isCurrentUpdating}
                            className="w-full bg-[#261C18] hover:bg-[#B85B43] text-white py-2 rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Complete Dining</span>
                          </button>
                        )}

                        {(st === "COMPLETED" || st === "CANCELLED") && (
                          <span className="w-full text-center text-xs text-stone-400 font-sans italic py-1">
                            {st === "COMPLETED" ? "Booking Completed" : "Booking Cancelled"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
