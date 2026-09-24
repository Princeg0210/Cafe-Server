"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Printer, Loader2, CheckCircle2, RefreshCw } from "lucide-react";

interface Kitchen {
  id: number;
  branch_id: number;
  name: string;
}

interface PrintJobInfo {
  id: number;
  ticket_content: string;
  status: string;
}

interface KitchenOrder {
  id: number;
  order_id: number;
  kitchen_id: number;
  status: string;
  created_at: string;
  kitchen?: Kitchen;
  print_jobs?: PrintJobInfo[];
  order?: {
    order_number: string;
    items: {
      menu_item: { name: string };
      quantity: number;
      special_instructions?: string;
    }[];
    dining_session: {
      table: { table_number: string };
    };
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export default function KDSDashboard() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedKitchenId, setSelectedKitchenId] = useState<number | "all">("all");
  const [isConnected, setIsConnected] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchOrders();
    setKitchens([
      { id: 1, branch_id: 1, name: "Hot Food" },
      { id: 2, branch_id: 1, name: "Bar/Beverages" },
    ]);
  }, [selectedKitchenId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const url = selectedKitchenId === "all" 
        ? `${API_BASE}/api/v1/kitchen/orders`
        : `${API_BASE}/api/v1/kitchen/orders?kitchen_id=${selectedKitchenId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
      setIsConnected(false);
    }
  };

  const connectWebSocket = () => {
    try {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      const ws = new WebSocket(`${WS_BASE}/ws/kitchen`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsOffline(false);
      };
      ws.onerror = () => {
        setIsConnected(false);
      };
      ws.onclose = () => {
        setIsConnected(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "KITCHEN_ORDER_CREATED" || data.event === "KITCHEN_ORDER_UPDATED") {
            fetchOrders();
          }
        } catch {
          // ignore malformed message
        }
      };
    } catch {
      setIsConnected(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const res = await fetch(`${API_BASE}/api/v1/kitchen/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch {
      // Local state fallback if offline
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const retryPrint = async (orderId: number) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const res = await fetch(`${API_BASE}/api/v1/kitchen/orders/${orderId}/retry-print`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        alert("Print retry triggered successfully");
      } else {
        alert("Print retry queued");
      }
    } catch {
      alert("Unable to reach backend printer service.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Kitchen Display System
            <span className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" : "bg-red-500"}`}></span>
          </h1>
          <p className="text-gray-400 mt-1">Real-time order tracking and management</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchOrders();
              connectWebSocket();
            }}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-sm border border-gray-800 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <select 
            value={selectedKitchenId}
            onChange={(e) => setSelectedKitchenId(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Kitchens</option>
            {kitchens.map(k => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isOffline && (
        <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>
              Backend server is currently unreachable. Start the backend service using:{" "}
              <code className="bg-amber-900/60 px-2 py-0.5 rounded font-mono text-xs text-amber-100">
                PYTHONPATH=backend python3 -m uvicorn app.main:app --port 8000
              </code>
            </span>
          </div>
          <button
            onClick={() => {
              fetchOrders();
              connectWebSocket();
            }}
            className="text-xs bg-amber-900/60 hover:bg-amber-900 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Retry Connection
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {orders.filter(o => o.status !== "SERVED").map((order) => (
          <div 
            key={order.id} 
            className={`rounded-xl border ${
              order.status === "READY" ? "border-green-500/30 bg-green-950/20" :
              order.status === "PREPARING" ? "border-yellow-500/30 bg-yellow-950/20" :
              "border-gray-800 bg-gray-900/50"
            } p-5 flex flex-col shadow-lg transition-all`}
          >
            {(() => {
              const ticketContent = order.print_jobs?.[0]?.ticket_content || "";
              const orderNumMatch = ticketContent.match(/Order #:\s*([^\n]+)/);
              const displayOrderNum = orderNumMatch ? orderNumMatch[1].trim() : (order.order?.order_number || `ORD-${order.order_id}`);
              
              const parsedItems = ticketContent
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.startsWith("- "))
                .map((line) => {
                  const m = line.match(/^-\s*(\d+)x\s*(.*)$/);
                  if (m) {
                    return { qty: m[1], name: m[2] };
                  }
                  return { qty: "1", name: line.replace(/^-\s*/, "") };
                });

              const itemsToRender = order.order?.items && order.order.items.length > 0
                ? order.order.items.map(i => ({ qty: i.quantity, name: i.menu_item?.name || "Item", special_instructions: i.special_instructions }))
                : parsedItems.map(i => ({ qty: i.qty, name: i.name, special_instructions: undefined }));

              return (
                <>
                  <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-4">
                    <div>
                      <span className="text-sm font-semibold text-indigo-400 block mb-1">
                        {order.kitchen?.name || "Kitchen"} 
                      </span>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Table {order.order?.dining_session?.table?.table_number || "01"}
                      </h3>
                      <span className="text-gray-400 font-mono text-xs">{displayOrderNum}</span>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-sm text-gray-400 bg-gray-800/50 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-6">
                    {itemsToRender.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <span className="bg-gray-800 text-white font-mono font-bold px-2 py-0.5 rounded text-sm min-w-8 text-center">
                            {item.qty}x
                          </span>
                          <div>
                            <p className="font-medium text-gray-200">{item.name}</p>
                            {item.special_instructions && (
                              <p className="text-xs text-yellow-400/80 mt-1 bg-yellow-400/10 inline-block px-2 py-0.5 rounded">
                                {item.special_instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {itemsToRender.length === 0 && (
                      <p className="text-gray-500 text-sm italic">Items pending</p>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
              {order.status === "SENT" && (
                <button 
                  onClick={() => updateStatus(order.id, "PREPARING")}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Start Preparing
                </button>
              )}
              {order.status === "PREPARING" && (
                <button 
                  onClick={() => updateStatus(order.id, "READY")}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Ready
                </button>
              )}
              {order.status === "READY" && (
                <button 
                  disabled
                  className="flex-1 bg-gray-800 text-gray-400 cursor-not-allowed font-semibold py-2.5 rounded-lg flex justify-center items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Ready for Pickup
                </button>
              )}

              <button 
                onClick={() => retryPrint(order.id)}
                className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                title="Retry Print"
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
            <CheckCircle2 className="w-12 h-12 mb-3 text-gray-700" />
            <p className="text-xl font-medium">All caught up!</p>
            <p className="text-sm mt-1">No pending orders in the kitchen.</p>
          </div>
        )}
      </div>
    </div>
  );
}
