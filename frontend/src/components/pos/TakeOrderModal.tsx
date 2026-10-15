"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import { posSession } from "@/lib/authFetch";
import { toast } from "@/components/ui/toast";

type MenuCategory = { id: number; name: string; display_order: number; is_active: boolean };
type MenuItem = {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price: number | string;
  is_available: boolean;
};
type CartLine = { qty: number; note: string };

const MAX_QTY = 50; // same limit as the backend

// POS staff take an order for a table: it goes on the table's running bill and a KOT goes to the kitchen.
// Payment is taken later, when the bill is settled.
export default function TakeOrderModal({
  tableId: initialTableId,
  tables,
  token,
  onClose,
  onPlaced,
}: {
  tableId: number | null; // null = "New Order": staff pick the table first
  tables: { id: number; label: string }[];
  token: string;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [allergy, setAllergy] = useState("");
  const [sending, setSending] = useState(false);
  const [tableId, setTableId] = useState<number | null>(initialTableId);
  const tableLabel = tables.find((t) => t.id === tableId)?.label || "Choose a table";

  useEffect(() => {
    Promise.all([fetch("/api/v1/menu/categories"), fetch("/api/v1/menu/items")])
      .then(async ([c, i]) => {
        if (!c.ok || !i.ok) throw new Error();
        setCategories((await c.json()).filter((x: MenuCategory) => x.is_active).sort((a: MenuCategory, b: MenuCategory) => a.display_order - b.display_order));
        setItems(await i.json());
      })
      .catch(() => setLoadError("Could not load the menu. Check the connection and try again."));
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (it) => (activeCat === "all" || it.category_id === activeCat) && (!q || it.name.toLowerCase().includes(q))
    );
  }, [items, activeCat, search]);

  const byId = useMemo(() => new Map(items.map((it) => [it.id, it])), [items]);
  const lines = Object.entries(cart).filter(([, l]) => l.qty > 0);
  const total = lines.reduce((sum, [id, l]) => sum + Number(byId.get(Number(id))?.price || 0) * l.qty, 0);
  const itemCount = lines.reduce((n, [, l]) => n + l.qty, 0);

  const setQty = (id: number, qty: number) =>
    setCart((prev) => ({ ...prev, [id]: { qty: Math.max(0, Math.min(MAX_QTY, qty)), note: prev[id]?.note || "" } }));
  const setNote = (id: number, note: string) => setCart((prev) => ({ ...prev, [id]: { qty: prev[id]?.qty || 0, note } }));

  const send = async () => {
    if (!itemCount || sending || !tableId) return;
    setSending(true);
    try {
      const res = await posSession.fetch(`/api/v1/pos/tables/${tableId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          allergy_info: allergy.trim() || null,
          items: lines.map(([id, l]) => ({
            menu_item_id: Number(id),
            quantity: l.qty,
            special_instructions: l.note.trim() || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.detail === "string" ? data.detail.replace(/^[A-Z_]+:\s*/, "") : "Order could not be sent. Please try again.");
        return;
      }
      toast.success(`Order sent to kitchen for ${tableLabel} (${itemCount} item${itemCount === 1 ? "" : "s"})`);
      onPlaced();
      onClose();
    } catch {
      toast.error("Network error. The order was not sent; please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Take order for ${tableLabel}`}>
      <div className="w-full sm:max-w-3xl h-[92vh] sm:h-[85vh] bg-[#FFFDF9] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#EFE6D8]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#B85B43]">Take Order</p>
            {initialTableId === null ? (
              <select
                value={tableId ?? ""}
                onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : null)}
                aria-label="Table"
                className="mt-0.5 font-serif text-lg font-bold text-[#261C18] bg-transparent border-b border-dashed border-[#B85B43] outline-none cursor-pointer"
              >
                <option value="">Choose a table</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            ) : (
              <h2 className="font-serif text-lg font-bold text-[#261C18]">{tableLabel}</h2>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + categories */}
        <div className="px-4 pt-3 space-y-2">
          <label className="relative block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes or drinks"
              aria-label="Search menu"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E2D6C5] bg-white text-sm outline-none focus:border-[#B85B43]"
            />
          </label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[{ id: "all" as const, name: "All" }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer ${activeCat === c.id ? "bg-[#261C18] text-white border-[#261C18]" : "bg-white text-stone-600 border-[#E2D6C5]"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-[#F0E8DC]">
          {loadError && <p role="alert" className="py-6 text-center text-sm text-rose-700">{loadError}</p>}
          {!loadError && items.length === 0 && <p className="py-6 text-center text-sm text-stone-500">Loading menu…</p>}
          {!loadError && items.length > 0 && shown.length === 0 && <p className="py-6 text-center text-sm text-stone-500">No dishes match “{search}”.</p>}
          {shown.map((it) => {
            const line = cart[it.id];
            const qty = line?.qty || 0;
            return (
              <div key={it.id} className={`py-2.5 ${it.is_available ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#261C18] truncate">{it.name}</p>
                    <p className="text-xs text-stone-500">
                      ₹{Number(it.price).toFixed(0)}
                      {!it.is_available && <span className="ml-2 font-bold text-rose-700">Sold out</span>}
                    </p>
                  </div>
                  {qty === 0 ? (
                    <button
                      type="button"
                      disabled={!it.is_available}
                      onClick={() => setQty(it.id, 1)}
                      className="px-4 py-1.5 rounded-lg border border-[#B85B43] text-[#B85B43] text-xs font-bold hover:bg-[#FBEDE8] disabled:cursor-not-allowed cursor-pointer"
                    >
                      ADD
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setQty(it.id, qty - 1)} aria-label={`One less ${it.name}`} className="w-8 h-8 rounded-lg bg-[#F6F3EC] flex items-center justify-center cursor-pointer">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold" aria-live="polite">{qty}</span>
                      <button type="button" onClick={() => setQty(it.id, qty + 1)} disabled={qty >= MAX_QTY} aria-label={`One more ${it.name}`} className="w-8 h-8 rounded-lg bg-[#261C18] text-white flex items-center justify-center cursor-pointer disabled:opacity-40">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {qty > 0 && (
                  <input
                    type="text"
                    value={line?.note || ""}
                    onChange={(e) => setNote(it.id, e.target.value)}
                    maxLength={200}
                    placeholder="Cooking note (optional), e.g. less spicy"
                    aria-label={`Note for ${it.name}`}
                    className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-[#EFE6D8] bg-[#FAF7F0] text-xs outline-none focus:border-[#B85B43]"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: allergy + send */}
        <div className="border-t border-[#EFE6D8] px-4 py-3 space-y-2 bg-white">
          <input
            type="text"
            value={allergy}
            onChange={(e) => setAllergy(e.target.value)}
            maxLength={500}
            placeholder="Allergy / dietary note for the kitchen (optional)"
            aria-label="Allergy or dietary note"
            className="w-full px-3 py-2 rounded-lg border border-[#E2D6C5] text-xs outline-none focus:border-[#B85B43]"
          />
          <button
            type="button"
            onClick={send}
            disabled={!itemCount || sending || !tableId}
            className="w-full py-3 rounded-xl bg-[#261C18] hover:bg-[#B85B43] text-white font-bold text-sm tracking-wide flex items-center justify-between px-4 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <span>{sending ? "Sending…" : !tableId ? "Choose a table first" : itemCount ? `Send to Kitchen · ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Add items to send"}</span>
            <span>₹{total.toFixed(0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
