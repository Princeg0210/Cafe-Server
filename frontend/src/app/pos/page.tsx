"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

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

export default function POSDashboard() {
  const [kots, setKots] = useState<KOT[]>([]);
  const [summary, setSummary] = useState<POSSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "failed" | "printed" | "pending">("all");
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingIds, setRetryingIds] = useState<Record<number, boolean>>({});
  const [closingSessionIds, setClosingSessionIds] = useState<Record<number, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

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

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    const apiBase = getApiBase();
    try {
      const [kotsRes, sumRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/pos/kots`),
        fetch(`${apiBase}/api/v1/pos/summary`),
      ]);

      if (kotsRes.ok) {
        const kotsData = await kotsRes.json();
        setKots(kotsData);
      }
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
    } catch (err) {
      console.error("POS Data fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling backup
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
              playChime();
              setLastNotification(`New KOT ${data.kot_number} received for Table ${data.table_number}!`);
              setTimeout(() => setLastNotification(null), 6000);
              fetchData();
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
        wsRef.current.close();
      }
    };
  }, [soundEnabled]);

  const handleRetryPrint = async (kotId: number) => {
    setRetryingIds((prev) => ({ ...prev, [kotId]: true }));
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/pos/kots/${kotId}/retry-print`, {
        method: "POST",
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

  const handleCloseSession = async (sessionId: number, tableNumber: string) => {
    if (!confirm(`Settle bill & close dining session for Table ${tableNumber}? This marks the table as Available for new customers.`)) {
      return;
    }
    setClosingSessionIds((prev) => ({ ...prev, [sessionId]: true }));
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}/api/v1/pos/sessions/${sessionId}/close`, {
        method: "POST",
      });
      if (res.ok) {
        alert(`Table ${tableNumber} session closed successfully.`);
        await fetchData();
      }
    } catch (err) {
      alert("Error closing session.");
    } finally {
      setClosingSessionIds((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const filteredKots = kots.filter((kot) => {
    if (filter === "failed") return kot.printed_status === "FAILED";
    if (filter === "printed") return kot.printed_status === "PRINTED";
    if (filter === "pending") return kot.printed_status === "PENDING";
    return true;
  });

  const currentDateDisplay = summary?.business_date || new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans selection:bg-amber-500/30">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0c1220]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
            J
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-wider text-white">JAADOO POS</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {currentDateDisplay}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-red-400"}`}></span>
              {isConnected ? "Live POS Terminal Connected" : "Connecting to Local Terminal..."}
            </p>
          </div>
        </div>

        {/* Global Alert Notification */}
        {lastNotification && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-amber-500/20 border border-amber-500/50 text-amber-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{lastNotification}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                : "bg-slate-900 border-slate-800 text-slate-500"
            }`}
            title={soundEnabled ? "Mute New KOT Chime" : "Enable Sound Chime"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-sm font-medium text-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metric Banner: TODAY'S KOTS */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#131c31] via-[#0f172a] to-[#0a0f1d] border border-slate-800 p-8 shadow-2xl">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-semibold">
                Daily Operations Counter
              </span>
              <h2 className="text-xl font-bold text-slate-300 mt-1">TODAY&apos;S KOTS</h2>
              <div className="flex items-baseline gap-4 mt-2">
                <span className="text-6xl md:text-7xl font-black tracking-tight text-white font-mono">
                  {summary ? String(summary.total_kots).padStart(2, "0") : String(kots.length).padStart(2, "0")}
                </span>
                <span className="text-lg font-bold text-slate-400 uppercase tracking-widest font-mono">
                  KOT GENERATED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 min-w-[130px]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Tables Served
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {summary?.tables_served || 0}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 min-w-[130px]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
                  Total Items
                </div>
                <div className="text-2xl font-bold font-mono text-white">
                  {summary?.total_items || 0}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 min-w-[130px]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  Avg KOT Value
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  ₹{summary?.avg_kot_value ? Math.round(summary.avg_kot_value) : 0}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 min-w-[130px]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Peak Hour
                </div>
                <div className="text-lg font-bold font-mono text-white truncate">
                  {summary?.peak_hour || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Live KOT Orders Feed (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>NEW KOTS</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                    {filteredKots.length} Tickets
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Live real-time thermal ticket flow</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                {(["all", "failed", "printed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                      filter === tab
                        ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "failed" ? "Print Failed" : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* KOT Cards Feed */}
            <div className="space-y-4">
              {filteredKots.map((kot) => {
                const timeString = new Date(kot.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isPrintingFailed = kot.printed_status === "FAILED";
                const isPrinted = kot.printed_status === "PRINTED";
                const isRetrying = retryingIds[kot.id] || false;
                const isClosing = closingSessionIds[kot.dining_session_id] || false;

                return (
                  <div
                    key={kot.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xl ${
                      isPrintingFailed
                        ? "bg-[#181119] border-rose-900/60 shadow-rose-950/20"
                        : "bg-[#0d1424] border-slate-800/90 hover:border-slate-700"
                    }`}
                  >
                    {/* Header Strip */}
                    <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 bg-slate-900/40">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-xl text-amber-400 tracking-wider">
                          #{kot.kot_number.replace("KOT-", "")}
                        </span>
                        <div className="h-4 w-px bg-slate-700" />
                        <span className="font-bold text-white text-base">
                          TABLE {kot.table_number}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          (Session #{kot.dining_session_id})
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-lg text-emerald-400">
                          ₹{kot.total_amount}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-md">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {timeString}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill Row */}
                    <div className="px-5 py-3 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/50 text-xs font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                          <Check className="w-3.5 h-3.5" /> Order received
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-mono">
                          <Check className="w-3.5 h-3.5" /> {kot.kot_number} generated
                        </span>

                        {isPrintingFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-700/80 text-rose-300 font-semibold animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Printing failed
                          </span>
                        )}

                        {isPrinted && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-950/60 border border-teal-800/60 text-teal-300">
                            <Printer className="w-3.5 h-3.5" /> Slip printed
                          </span>
                        )}

                        {kot.printed_status === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-300">
                            <RotateCw className="w-3.5 h-3.5 animate-spin" /> Queued for printer
                          </span>
                        )}
                      </div>

                      {/* Print Retry Button */}
                      <button
                        onClick={() => handleRetryPrint(kot.id)}
                        disabled={isRetrying}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                          isPrintingFailed
                            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        } disabled:opacity-50`}
                      >
                        <Printer className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                        {isRetrying ? "Retrying..." : isPrintingFailed ? "Retry Print" : "Reprint Slip"}
                      </button>
                    </div>

                    {/* Items List */}
                    <div className="p-5 space-y-2.5">
                      {kot.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-4 text-sm">
                          <div className="flex items-start gap-3">
                            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-xs min-w-[28px] text-center border border-amber-500/20">
                              {item.quantity}×
                            </span>
                            <div>
                              <p className="font-medium text-slate-200">{item.name}</p>
                              {item.special_instructions && (
                                <p className="text-xs text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded mt-1 inline-block border border-amber-500/20">
                                  Note: {item.special_instructions}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-slate-400 text-xs">
                            ₹{item.subtotal}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Operations */}
                    <div className="px-5 py-3 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="font-mono">Order: {kot.order_number}</span>
                      <button
                        onClick={() => handleCloseSession(kot.dining_session_id, kot.table_number)}
                        disabled={isClosing}
                        className="text-slate-400 hover:text-amber-400 hover:underline flex items-center gap-1 font-medium transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Settle Table & Close Session
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredKots.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-900/20">
                  <CheckCircle2 className="w-12 h-12 mb-3 text-slate-700" />
                  <p className="text-lg font-semibold text-slate-400">No KOTs Found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When customers place orders at tables, tickets appear here in real time.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summaries & Analytics (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Today's Item Summary */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                    TODAY&apos;S ITEM SUMMARY
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Live preparation tallies for the kitchen</p>
                </div>
                <span className="text-xs font-mono text-slate-500">Live Prep Count</span>
              </div>

              <div className="space-y-3">
                {summary?.item_summary && summary.item_summary.length > 0 ? (
                  summary.item_summary.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <span className="text-sm font-medium text-slate-200">{item.name}</span>
                      <span className="font-mono font-bold text-base text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                        {item.quantity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No items ordered yet today.
                  </p>
                )}
              </div>
            </div>

            {/* Category Breakdown & Performance */}
            <div className="rounded-2xl border border-slate-800 bg-[#0d1424] p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    TODAY&apos;S KOT STATISTICS
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Operational velocity and averages</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">Avg Items / KOT</div>
                  <div className="text-2xl font-mono font-bold text-white mt-1">
                    {summary?.avg_items_per_kot || "0.00"}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">KOTs / Hour</div>
                  <div className="text-2xl font-mono font-bold text-emerald-400 mt-1">
                    {summary?.kots_per_hour || "0.0"}
                  </div>
                </div>
              </div>

              {/* Category Quantities */}
              {summary?.category_summary && summary.category_summary.length > 0 && (
                <div className="space-y-2 mb-6">
                  <span className="text-xs uppercase font-mono tracking-widest text-slate-400 font-semibold block mb-2">
                    Category Breakdown
                  </span>
                  {summary.category_summary.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-slate-900/40">
                      <span className="text-slate-300 font-medium">{cat.category}</span>
                      <span className="font-mono font-bold text-slate-200">{cat.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Today vs Yesterday */}
              {summary?.comparison && (
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-semibold">
                      TODAY vs YESTERDAY
                    </span>
                    <span className="text-xs text-slate-500 font-mono">Today | Yest</span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between py-1.5 px-3 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-300 font-sans">KOTs</span>
                      <span className="text-white font-bold">
                        {summary.comparison.today?.kots || 0}
                        <span className="text-slate-500 font-normal mx-2">|</span>
                        <span className="text-slate-400">{summary.comparison.yesterday?.kots || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-300 font-sans">Pizzas</span>
                      <span className="text-white font-bold">
                        {summary.comparison.today?.pizzas || 0}
                        <span className="text-slate-500 font-normal mx-2">|</span>
                        <span className="text-slate-400">{summary.comparison.yesterday?.pizzas || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-300 font-sans">Pasta</span>
                      <span className="text-white font-bold">
                        {summary.comparison.today?.pasta || 0}
                        <span className="text-slate-500 font-normal mx-2">|</span>
                        <span className="text-slate-400">{summary.comparison.yesterday?.pasta || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-300 font-sans">Beverages</span>
                      <span className="text-white font-bold">
                        {summary.comparison.today?.beverages || 0}
                        <span className="text-slate-500 font-normal mx-2">|</span>
                        <span className="text-slate-400">{summary.comparison.yesterday?.beverages || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
