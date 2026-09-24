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
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
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
    if (!confirm(`Settle bill & close dining session for Table ${tableNumber}? This will mark the table as Available for new customers.`)) {
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
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans selection:bg-[#B85B43]/20">
      {/* Top Editorial Bar */}
      <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] shadow-xs px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/40 group-hover:border-[#B85B43] transition-all shadow-xs">
                <span className="font-serif italic font-bold text-lg text-[#B85B43]">J</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-extrabold text-xl leading-none text-[#261C18]">
                    JAADOO <span className="font-serif italic font-normal text-lg text-[#B85B43]">POS</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold tracking-wider bg-[#4A5842]/15 text-[#4A5842] border border-[#4A5842]/30 uppercase">
                    {currentDateDisplay}
                  </span>
                </div>
                <span className="text-[9px] font-sans tracking-[0.2em] text-[#4A5842] uppercase font-semibold mt-0.5 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#4A5842] animate-pulse" : "bg-rose-500"}`} />
                  {isConnected ? "Live POS Terminal Active" : "Reconnecting to Terminal..."}
                </span>
              </div>
            </Link>
          </div>

          {/* Real-time Order Popup Notification */}
          {lastNotification && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-[#261C18] text-[#FBF9F5] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-md border border-[#B85B43]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#B85B43] animate-spin" />
              <span>{lastNotification}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-[#261C18]/70 hover:text-[#261C18] px-3 py-1.5 rounded-full border border-[#E4DCD0] bg-[#F6F3EC] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Main Site
            </Link>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full border transition-colors ${
                soundEnabled
                  ? "bg-[#261C18] border-[#261C18] text-[#FBF9F5]"
                  : "bg-[#F6F3EC] border-[#E4DCD0] text-stone-500"
              }`}
              title={soundEnabled ? "Mute New KOT Chime" : "Enable Sound Chime"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] text-xs font-semibold uppercase tracking-wider transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Editorial Hero Banner: TODAY'S KOTS */}
        <section className="relative overflow-hidden rounded-3xl bg-[#261C18] text-[#FBF9F5] border border-[#E4DCD0]/30 p-6 sm:p-9 shadow-md">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-[#B85B43]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#4A5842]/25 text-[#FBF9F5] border border-[#4A5842]/50 px-3 py-1 rounded-full text-[10px] font-sans font-semibold tracking-[0.2em] uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A5842] animate-pulse" />
                <span>DAILY OPERATIONS OVERVIEW</span>
              </div>
              <h2 className="text-sm font-serif italic text-stone-300">Operational Ticket Volume</h2>
              <div className="flex items-baseline gap-4 mt-1">
                <span className="text-5xl sm:text-7xl font-serif font-black tracking-tight text-[#FBF9F5]">
                  {summary ? String(summary.total_kots).padStart(2, "0") : String(kots.length).padStart(2, "0")}
                </span>
                <span className="font-serif italic font-normal text-lg sm:text-2xl text-[#B85B43]">
                  KOT GENERATED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <Users className="w-3.5 h-3.5 text-[#B85B43]" />
                  Tables Served
                </div>
                <div className="text-2xl font-serif font-bold text-[#FBF9F5]">
                  {summary?.tables_served || 0}
                </div>
              </div>

              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#4A5842]" />
                  Total Items
                </div>
                <div className="text-2xl font-serif font-bold text-[#FBF9F5]">
                  {summary?.total_items || 0}
                </div>
              </div>

              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  Avg KOT Value
                </div>
                <div className="text-2xl font-serif font-bold text-amber-300">
                  ₹{summary?.avg_kot_value ? Math.round(summary.avg_kot_value) : 0}
                </div>
              </div>

              <div className="bg-[#1C1512]/90 border border-[#E4DCD0]/15 rounded-2xl p-4 min-w-[130px] shadow-2xs">
                <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mb-1 font-sans">
                  <Flame className="w-3.5 h-3.5 text-[#B85B43]" />
                  Peak Hour
                </div>
                <div className="text-lg font-serif font-bold text-[#FBF9F5] truncate">
                  {summary?.peak_hour || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: NEW KOTS Live Feed (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DCD0] pb-3.5">
              <div>
                <h3 className="text-2xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
                  <span>NEW KOTS</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E4DCD0]/60 text-[#261C18] font-sans font-medium">
                    {filteredKots.length} Tickets
                  </span>
                </h3>
                <p className="text-xs font-serif italic text-stone-500 mt-0.5">Live real-time thermal ticket flow</p>
              </div>

              {/* Filter Tabs matching main site pill nav */}
              <div className="flex items-center gap-1 bg-[#F6F3EC] p-1 rounded-full border border-[#E4DCD0] text-xs">
                {(["all", "failed", "printed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-3 py-1 rounded-full font-medium capitalize transition-all ${
                      filter === tab
                        ? "bg-[#261C18] text-[#FBF9F5] font-semibold shadow-xs"
                        : "text-[#261C18]/70 hover:text-[#261C18]"
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
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
                      isPrintingFailed
                        ? "bg-[#FFF9F8] border-[#B85B43]/60 shadow-[#B85B43]/5"
                        : "bg-[#FBF9F5] border-[#E4DCD0] hover:border-[#D5C9B8]"
                    }`}
                  >
                    {/* Header Strip */}
                    <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DCD0] bg-[#F6F3EC]/80">
                      <div className="flex items-center gap-3">
                        <span className="font-serif font-black text-xl text-[#B85B43] tracking-wide">
                          #{kot.kot_number.replace("KOT-", "")}
                        </span>
                        <div className="h-4 w-px bg-[#E4DCD0]" />
                        <span className="font-serif font-bold text-base text-[#261C18]">
                          TABLE {kot.table_number}
                        </span>
                        <span className="text-[11px] font-sans text-stone-500">
                          (Session #{kot.dining_session_id})
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-serif font-bold text-lg text-[#261C18]">
                          ₹{kot.total_amount}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-stone-600 bg-[#E4DCD0]/60 px-2.5 py-0.5 rounded-full font-mono">
                          <Clock className="w-3 h-3 text-stone-500" />
                          {timeString}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill Row */}
                    <div className="px-5 py-2.5 bg-[#FAF7F2] flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DCD0]/60 text-xs font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4A5842]/15 border border-[#4A5842]/30 text-[#4A5842]">
                          <Check className="w-3.5 h-3.5" /> Order received
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#261C18]/10 border border-[#261C18]/20 text-[#261C18] font-mono">
                          <Check className="w-3.5 h-3.5" /> {kot.kot_number} generated
                        </span>

                        {isPrintingFailed && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#B85B43]/15 border border-[#B85B43]/40 text-[#B85B43] font-semibold animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5" /> Printing failed
                          </span>
                        )}

                        {isPrinted && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4A5842]/20 border border-[#4A5842]/40 text-[#4A5842]">
                            <Printer className="w-3.5 h-3.5" /> Slip printed
                          </span>
                        )}

                        {kot.printed_status === "PENDING" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800">
                            <RotateCw className="w-3.5 h-3.5 animate-spin" /> Queued for printer
                          </span>
                        )}
                      </div>

                      {/* Print Retry Button in Main-Site Terracotta / Dark Theme */}
                      <button
                        onClick={() => handleRetryPrint(kot.id)}
                        disabled={isRetrying}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans font-semibold uppercase tracking-wider transition-all shadow-2xs ${
                          isPrintingFailed
                            ? "bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5]"
                            : "bg-[#261C18] hover:bg-[#3D2E28] text-[#FBF9F5]"
                        } disabled:opacity-50`}
                      >
                        <Printer className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                        {isRetrying ? "Retrying..." : isPrintingFailed ? "Retry Print" : "Reprint Slip"}
                      </button>
                    </div>

                    {/* Items List */}
                    <div className="p-5 space-y-2.5 bg-[#FBF9F5]">
                      {kot.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-4 text-sm">
                          <div className="flex items-start gap-3">
                            <span className="font-serif font-bold text-[#B85B43] bg-[#B85B43]/10 px-2 py-0.5 rounded-md text-xs min-w-[28px] text-center border border-[#B85B43]/20">
                              {item.quantity}×
                            </span>
                            <div>
                              <p className="font-sans font-medium text-[#261C18]">{item.name}</p>
                              {item.special_instructions && (
                                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded mt-1 inline-block">
                                  Note: {item.special_instructions}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-serif text-stone-600 text-sm font-semibold">
                            ₹{item.subtotal}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer Operations */}
                    <div className="px-5 py-3 bg-[#F6F3EC]/70 border-t border-[#E4DCD0] flex items-center justify-between text-xs text-stone-500">
                      <span className="font-mono text-[11px]">Order: {kot.order_number}</span>
                      <button
                        onClick={() => handleCloseSession(kot.dining_session_id, kot.table_number)}
                        disabled={isClosing}
                        className="text-[#B85B43] hover:text-[#A84E38] hover:underline flex items-center gap-1 font-medium transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Settle Table & Close Session
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredKots.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-[#E4DCD0] rounded-3xl bg-[#F6F3EC]/30">
                  <CheckCircle2 className="w-12 h-12 mb-3 text-stone-300" />
                  <p className="text-lg font-serif font-bold text-[#261C18]">All Caught Up!</p>
                  <p className="text-xs font-serif italic text-stone-500 mt-1">
                    When customers place orders at tables, printed tickets flow here in real time.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summaries & Analytics (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Today's Item Summary */}
            <div className="rounded-3xl border border-[#E4DCD0] bg-[#FBF9F5] p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#261C18] flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#B85B43]" />
                    TODAY&apos;S ITEM SUMMARY
                  </h3>
                  <p className="text-xs font-serif italic text-stone-500 mt-0.5">Live preparation tallies for the kitchen</p>
                </div>
                <span className="text-[10px] font-sans tracking-widest text-[#4A5842] uppercase font-semibold bg-[#4A5842]/15 px-2.5 py-0.5 rounded-full border border-[#4A5842]/30">
                  Live Prep
                </span>
              </div>

              <div className="space-y-2.5">
                {summary?.item_summary && summary.item_summary.length > 0 ? (
                  summary.item_summary.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E4DCD0]/70 hover:border-[#B85B43]/40 transition-colors shadow-2xs"
                    >
                      <span className="text-sm font-sans font-medium text-[#261C18]">{item.name}</span>
                      <span className="font-serif font-bold text-base text-[#B85B43] bg-[#B85B43]/10 px-3 py-0.5 rounded-lg border border-[#B85B43]/20">
                        {item.quantity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-serif italic text-stone-400 py-4 text-center">
                    No items ordered yet today.
                  </p>
                )}
              </div>
            </div>

            {/* Category Breakdown & Statistics */}
            <div className="rounded-3xl border border-[#E4DCD0] bg-[#FBF9F5] p-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-serif font-bold text-[#261C18] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#4A5842]" />
                    TODAY&apos;S KOT STATISTICS
                  </h3>
                  <p className="text-xs font-serif italic text-stone-500 mt-0.5">Operational velocity and averages</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-white border border-[#E4DCD0]/70 shadow-2xs">
                  <div className="text-xs font-serif italic text-stone-500">Avg Items / KOT</div>
                  <div className="text-2xl font-serif font-bold text-[#261C18] mt-1">
                    {summary?.avg_items_per_kot || "0.00"}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-[#E4DCD0]/70 shadow-2xs">
                  <div className="text-xs font-serif italic text-stone-500">KOTs / Hour</div>
                  <div className="text-2xl font-serif font-bold text-[#4A5842] mt-1">
                    {summary?.kots_per_hour || "0.0"}
                  </div>
                </div>
              </div>

              {/* Category Quantities */}
              {summary?.category_summary && summary.category_summary.length > 0 && (
                <div className="space-y-2 mb-6">
                  <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#4A5842] font-semibold block mb-2">
                    Category Breakdown
                  </span>
                  {summary.category_summary.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans font-medium">{cat.category}</span>
                      <span className="font-serif font-bold text-[#B85B43]">{cat.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Today vs Yesterday */}
              {summary?.comparison && (
                <div className="pt-4 border-t border-[#E4DCD0]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#B85B43] font-semibold">
                      TODAY vs YESTERDAY
                    </span>
                    <span className="text-xs font-serif italic text-stone-400">Today | Yest</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">KOTs</span>
                      <span className="font-serif font-bold text-[#261C18]">
                        {summary.comparison.today?.kots || 0}
                        <span className="text-stone-300 font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary.comparison.yesterday?.kots || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">Pizzas</span>
                      <span className="font-serif font-bold text-[#261C18]">
                        {summary.comparison.today?.pizzas || 0}
                        <span className="text-stone-300 font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary.comparison.yesterday?.pizzas || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">Pasta</span>
                      <span className="font-serif font-bold text-[#261C18]">
                        {summary.comparison.today?.pasta || 0}
                        <span className="text-stone-300 font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary.comparison.yesterday?.pasta || 0}</span>
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-xl bg-white border border-[#E4DCD0]/70">
                      <span className="text-[#261C18] font-sans">Beverages</span>
                      <span className="font-serif font-bold text-[#261C18]">
                        {summary.comparison.today?.beverages || 0}
                        <span className="text-stone-300 font-normal mx-2">|</span>
                        <span className="text-stone-400 font-normal">{summary.comparison.yesterday?.beverages || 0}</span>
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
