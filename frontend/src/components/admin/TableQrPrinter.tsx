"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import { adminSession } from "@/lib/authFetch";
import { RESTAURANT_FLOORS } from "@/data/floors";
import { toast } from "@/components/ui/toast";

type Slot = { tableId: number; floorId: number; label: string; floorName: string; num: number; added: boolean };
type ApiTable = { id: number; floor_number?: number; floor_name?: string; floor_table_num?: number; floor?: number | null };

const FLOORS = RESTAURANT_FLOORS.filter((f) => !f.isComingSoon);

// Every table in floor order: the order stands are printed in
const toSlots = (tables: ApiTable[]): Slot[] =>
  tables
    .filter((t) => FLOORS.some((f) => f.id === t.floor_number))
    .map((t) => ({
      tableId: t.id,
      floorId: t.floor_number as number,
      num: t.floor_table_num ?? 1,
      added: !!t.floor, // added from admin (the original tables can't be removed)
      label: `Table ${t.floor_table_num ?? 1}`,
      floorName: FLOORS.find((f) => f.id === t.floor_number)?.name || t.floor_name || "",
    }))
    .sort((a, b) => a.floorId - b.floorId || a.num - b.num);

// Pick a floor and table, print its QR stand, then the next table's QR is ready to print.
// Each table keeps its own code, so reprinting never breaks a stand already on a table.
export default function TableQrPrinter({ token }: { token: string }) {
  const [SLOTS, setSlots] = useState<Slot[]>([]);
  const [floorId, setFloorId] = useState(1);
  const [tableId, setTableId] = useState(1);
  const [newFloor, setNewFloor] = useState(1);
  const [newSeats, setNewSeats] = useState(4);
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [qr, setQr] = useState<{ tableId: number; url: string; dataUrl: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadTables = async (selectId?: number) => {
    const res = await adminSession.fetch("/api/v1/tables", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error();
    const slots = toSlots(await res.json());
    setSlots(slots);
    const pick = slots.find((x) => x.tableId === selectId);
    if (pick) {
      setFloorId(pick.floorId);
      setTableId(pick.tableId);
    }
    return slots;
  };

  useEffect(() => {
    adminSession
      .fetch("/api/v1/tables", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((rows: ApiTable[]) => setSlots(toSlots(rows)))
      .catch(() => setLoadError("Could not load the tables. Check the connection and try again."));
  }, [token]);

  const removeTable = async () => {
    if (!slot) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      setTimeout(() => setConfirmRemove(false), 5000);
      return;
    }
    setRemoving(true);
    try {
      const res = await adminSession.fetch(`/api/v1/tables/${slot.tableId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.detail === "string" ? data.detail : "Could not remove the table.");
        return;
      }
      toast.success(`${slot.label} (${slot.floorName}) removed.`);
      const slots = await loadTables();
      const first = slots.find((x) => x.floorId === slot.floorId) || slots[0];
      if (first) {
        setFloorId(first.floorId);
        setTableId(first.tableId);
      }
    } catch {
      toast.error("Network error. The table was not removed.");
    } finally {
      setConfirmRemove(false);
      setRemoving(false);
    }
  };

  const addTable = async () => {
    setAdding(true);
    try {
      const res = await adminSession.fetch("/api/v1/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ floor_number: newFloor, capacity: newSeats }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.detail === "string" ? data.detail : "Could not add the table. Please try again.");
        return;
      }
      await loadTables(data.id);
      setConfirmReplace(false);
      toast.success(`${data.table_number} added on ${FLOORS.find((f) => f.id === newFloor)?.name}. Its QR is ready to print.`);
    } catch {
      toast.error("Network error. The table was not added.");
    } finally {
      setAdding(false);
    }
  };

  const slot = SLOTS.find((s) => s.tableId === tableId);
  const floorTables = useMemo(() => SLOTS.filter((s) => s.floorId === floorId), [SLOTS, floorId]);
  const nextSlot = SLOTS[SLOTS.findIndex((s) => s.tableId === tableId) + 1];

  // Load (or create) the selected table's QR code
  useEffect(() => {
    let cancelled = false;
    adminSession
      .fetch(`/api/v1/tables/${tableId}/qr`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const { qr_token } = await res.json();
        const url = `${window.location.origin}/table/${qr_token}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#2C1E16", light: "#FFFFFF" } });
        if (!cancelled) {
          setQr({ tableId, url, dataUrl });
          setLoadError("");
        }
      })
      .catch(() => !cancelled && setLoadError("Could not load this table's QR code. Check the connection and try again."));
    return () => {
      cancelled = true;
    };
  }, [tableId, token, reloadKey]);

  const ready = qr?.tableId === tableId ? qr : null;

  const choose = (s: Slot | undefined) => {
    if (!s) return;
    setFloorId(s.floorId);
    setTableId(s.tableId);
    setConfirmReplace(false);
    setConfirmRemove(false);
  };

  const print = () => {
    if (!ready || !slot) return;
    const win = window.open("", "_blank");
    if (!win) {
      toast.warning("Please allow pop-ups for this site to print QR cards.");
      return;
    }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${slot.label} · ${slot.floorName} - QR Card</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&display=swap');
        body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; background: #FAF7F0; color: #241A14; }
        .card { background: #fff; padding: 24px; border-radius: 16px; border: 2px solid #E2D6C5; max-width: 360px; }
        .logo { width: 140px; height: 80px; object-fit: cover; border-radius: 12px; margin-bottom: 8px; border: 2px solid #E2D6C5; }
        .brand { font-family: 'Poppins', sans-serif; font-weight: 700; color: #5F3F6D; font-size: 18px; margin: 0 0 8px; }
        h1 { margin: 0 0 4px; font-size: 26px; font-weight: 800; }
        .floor { color: #B85B43; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; margin: 0 0 14px; }
        .qr { width: 260px; height: 260px; }
        .foot { margin-top: 12px; font-size: 11px; color: #776; font-weight: 500; }
        @media print { body { background: #fff; } .card { border: 0; } }
      </style></head>
      <body onload="window.print()">
        <div class="card">
          <img class="logo" src="${window.location.origin}/jaadoo_logo.jpg" alt="Jaadoo Pizza Project logo" />
          <div class="brand">Jaadoo Pizza Project</div>
          <h1>${slot.label}</h1>
          <p class="floor">${slot.floorName}</p>
          <img class="qr" src="${ready.dataUrl}" alt="QR code for ${slot.label}" />
          <div class="foot">Scan to see the menu and order<br>32 Sitaphal ki gali, Ganesh Ghati, Udaipur</div>
        </div>
      </body></html>`);
    win.document.close();

    if (nextSlot) {
      toast.success(`${slot.label} (${slot.floorName}) sent to print. Next: ${nextSlot.label}, ${nextSlot.floorName}.`);
      choose(nextSlot);
    } else {
      toast.success(`${slot.label} (${slot.floorName}) sent to print. That was the last table.`);
    }
  };

  const replaceCode = async () => {
    if (!confirmReplace) {
      setConfirmReplace(true);
      setTimeout(() => setConfirmReplace(false), 5000);
      return;
    }
    setReplacing(true);
    try {
      const res = await adminSession.fetch(`/api/v1/tables/${tableId}/qr/rotate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setConfirmReplace(false);
      setReloadKey((k) => k + 1);
      toast.success(`New QR code for ${slot?.label}. Print it now: the old stand for this table no longer works.`);
    } catch {
      toast.error("Could not replace the QR code. Please try again.");
    } finally {
      setReplacing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E6DCCF] p-5 shadow-xs">
      <h3 className="text-base font-bold text-[#241A14]">Table QR Codes</h3>
      <p className="text-xs text-[#8C7A6D] mt-0.5">
        Each table has its own QR code: guests who scan it order straight onto that table. After printing, the next table comes up automatically.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto] items-start">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[#665448]">
            Floor
            <select
              value={floorId}
              onChange={(e) => choose(SLOTS.find((s) => s.floorId === Number(e.target.value)))}
              className="mt-1 w-full rounded-xl border border-[#E2D6C5] bg-[#FAF7F0] p-2.5 text-sm text-[#241A14] outline-none focus:border-[#B85B43]"
            >
              {FLOORS.filter((f) => SLOTS.some((s) => s.floorId === f.id)).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#665448]">
            Table
            <select
              value={tableId}
              onChange={(e) => choose(SLOTS.find((s) => s.tableId === Number(e.target.value)))}
              className="mt-1 w-full rounded-xl border border-[#E2D6C5] bg-[#FAF7F0] p-2.5 text-sm text-[#241A14] outline-none focus:border-[#B85B43]"
            >
              {floorTables.map((s) => (
                <option key={s.tableId} value={s.tableId}>{s.label}</option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={print}
              disabled={!ready}
              className="px-4 py-2.5 rounded-xl bg-[#B85B43] hover:bg-[#A34B34] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print {slot?.label}
            </button>
            <button
              type="button"
              onClick={replaceCode}
              disabled={!ready || replacing}
              title="Only if this table's stand was lost or stolen: the old stand stops working"
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${confirmReplace ? "border-rose-600 bg-rose-50 text-rose-700" : "border-[#E2D6C5] text-[#665448] hover:bg-[#FAF6EE]"}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${replacing ? "animate-spin" : ""}`} />
              {confirmReplace ? "Tap again: old stand stops working" : "Replace code"}
            </button>
            {slot?.added && (
              <button
                type="button"
                onClick={removeTable}
                disabled={removing}
                title="Remove a table added by mistake (only if it has never had orders or bookings)"
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${confirmRemove ? "border-rose-600 bg-rose-50 text-rose-700" : "border-[#E2D6C5] text-[#665448] hover:bg-[#FAF6EE]"}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {removing ? "Removing…" : confirmRemove ? `Tap again to remove ${slot.label}` : "Remove table"}
              </button>
            )}
          </div>
          {nextSlot && (
            <p className="text-[11px] text-[#8C7A6D]">After printing, next up: <strong>{nextSlot.label}</strong>, {nextSlot.floorName}</p>
          )}
          {loadError && <p role="alert" className="text-xs font-semibold text-rose-700">{loadError}</p>}

          {/* Add a table: next number on that floor, with its own QR */}
          <div className="mt-2 pt-3 border-t border-dashed border-[#E6DCCF]">
            <p className="text-xs font-bold text-[#665448] mb-1.5">Add a table</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] font-semibold text-[#8C7A6D]">
                Floor
                <select
                  value={newFloor}
                  onChange={(e) => setNewFloor(Number(e.target.value))}
                  className="mt-0.5 block rounded-lg border border-[#E2D6C5] bg-[#FAF7F0] p-2 text-sm text-[#241A14] outline-none focus:border-[#B85B43]"
                >
                  {FLOORS.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-[#8C7A6D]">
                Seats
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newSeats}
                  onChange={(e) => setNewSeats(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="mt-0.5 block w-20 rounded-lg border border-[#E2D6C5] bg-[#FAF7F0] p-2 text-sm text-[#241A14] outline-none focus:border-[#B85B43]"
                />
              </label>
              <button
                type="button"
                onClick={addTable}
                disabled={adding}
                className="px-3 py-2 rounded-lg bg-[#241A14] hover:bg-[#B85B43] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {adding ? "Adding…" : "Add table"}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto w-44 text-center">
          <div className="p-2 bg-white rounded-xl border border-[#E6DCCF] h-44 flex items-center justify-center">
            {ready ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ready.dataUrl} alt={`QR code for ${slot?.label}, ${slot?.floorName}`} className="w-40 h-40" />
            ) : (
              <span className="text-xs text-[#8C7A6D]">{loadError ? "Not available" : "Loading QR…"}</span>
            )}
          </div>
          <p className="mt-1.5 text-xs font-bold text-[#241A14]">{slot?.label}</p>
          <p className="text-[11px] text-[#B85B43] font-semibold">{slot?.floorName}</p>
        </div>
      </div>
    </div>
  );
}
