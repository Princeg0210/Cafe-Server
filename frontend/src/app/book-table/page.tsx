"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, Users, Sparkles, CheckCircle2, Building2, Check, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import TanFooter from "@/components/TanFooter";

interface TableOption {
  id: number;
  name: string;
  capacity: number;
  desc: string;
}

const FLOOR_TABLES: Record<number, TableOption[]> = {
  1: [
    { id: 101, name: "Table 1", capacity: 4, desc: "Garden Entrance" },
    { id: 102, name: "Table 2", capacity: 3, desc: "Bistro Booth" },
    { id: 103, name: "Table 3", capacity: 2, desc: "Window View" },
    { id: 104, name: "Table 4", capacity: 4, desc: "Center Dining" },
    { id: 105, name: "Table 5", capacity: 6, desc: "Family Table" },
  ],
  2: [
    { id: 201, name: "Table 1", capacity: 4, desc: "Balcony Lake View" },
    { id: 202, name: "Table 2", capacity: 3, desc: "Quiet Alcove" },
    { id: 203, name: "Table 3", capacity: 2, desc: "Sunset Corner" },
    { id: 204, name: "Table 4", capacity: 4, desc: "Lounge Booth" },
    { id: 205, name: "Table 5", capacity: 6, desc: "Executive Group" },
  ],
  3: [
    { id: 301, name: "Table 1", capacity: 4, desc: "Lakefront Deck" },
    { id: 302, name: "Table 2", capacity: 3, desc: "Starlight Canopy" },
    { id: 303, name: "Table 3", capacity: 2, desc: "Candlelight Couple" },
    { id: 304, name: "Table 4", capacity: 4, desc: "Open Air Breeze" },
    { id: 305, name: "Table 5", capacity: 6, desc: "Rooftop Gazebo" },
  ],
};

const FLOORS = [
  { floor: 1, title: "Floor 1", tag: "Ground Bistro", desc: "Woodfired oven & garden terrace" },
  { floor: 2, title: "Floor 2", tag: "Lake View Lounge", desc: "Lake Pichola view & quiet ambiance" },
  { floor: 3, title: "Floor 3", tag: "Rooftop Terrace", desc: "Panoramic sunset & starlight dining" },
];

export default function BookTablePage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form State (Date, Time, Guests remain intact)
  const [date, setDate] = useState("2026-09-25");
  const [time, setTime] = useState("19:30");
  const [guests, setGuests] = useState(2);

  // Floor & Table State
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableOption | null>(null);

  // Customer Contact State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBooked, setIsBooked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h.includes("vercel.app") || h.includes("onrender.com")) {
        return "https://cafe-piza-api.onrender.com";
      }
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectFloor = (floorNum: number) => {
    setSelectedFloor(floorNum);
    // If switching floors or no table selected yet, select Table 1 of that floor by default
    const tablesOnFloor = FLOOR_TABLES[floorNum];
    if (!selectedTable || !tablesOnFloor.some((t) => t.id === selectedTable.id)) {
      setSelectedTable(tablesOnFloor[0]);
    }
  };

  const handleBookTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFloor) {
      setSubmitError("Please select a floor (Floor 1, Floor 2, or Floor 3).");
      return;
    }
    if (!selectedTable) {
      setSubmitError(`Please select your preferred table on Floor ${selectedFloor}.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const apiBase = getApiBase();

    try {
      const res = await fetch(`${apiBase}/api/v1/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: 1,
          customer_name: name,
          customer_phone: phone,
          guest_count: guests,
          reservation_date: date,
          time_slot: time,
          table_id: selectedFloor === 1 && selectedTable?.name === "Table 1" ? 1 : (selectedTable?.id || 1),
          floor_number: selectedFloor || 1,
          table_name: selectedTable?.name || "Table 1",
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.detail && errData.detail.includes("CAPACITY_EXCEEDED")) {
          setSubmitError("This time slot is fully booked. Please select another time or date.");
        } else {
          setSubmitError(errData.detail || "Unable to reserve table. Please check details and try again.");
        }
        setIsSubmitting(false);
        return;
      }

      const resData = await res.json();
      setBookingId(resData.id);
      setIsBooked(true);
    } catch {
      setSubmitError("Network error. Please verify connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-[#24150e]/10 text-[#24150e] px-4 py-1.5 rounded-full text-xs font-condensed font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-[#c88a48]" />
            <span>Online Table Reservations</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide">
            Reserve Your Table
          </h1>
          <p className="text-gray-600 font-sans text-sm md:text-base mt-2">
            Experience Neapolitan Woodfired Magic with panoramic views of Lake Pichola.
          </p>
        </motion.div>

        {isBooked ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 md:p-12 border border-[#e8ded2] shadow-xl text-center space-y-6"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto animate-pulse" />
            <h2 className="font-condensed text-4xl font-extrabold text-[#24150e] uppercase tracking-wide">Table Reserved!</h2>
            <p className="text-gray-600 font-sans text-base">
              Thank you <span className="font-bold text-[#24150e]">{name}</span>! We look forward to welcoming you on{" "}
              <span className="font-semibold text-[#b91c1c]">{date}</span> at{" "}
              <span className="font-semibold text-[#b91c1c]">{time}</span>.
            </p>
            
            <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200/70 inline-block text-left text-xs font-sans text-amber-950 space-y-1.5 shadow-xs">
              {bookingId && <p>🔖 <strong>Booking Ref:</strong> #RES-{String(bookingId).padStart(4, "0")}</p>}
              <p>📍 <strong>Brew Station:</strong> Old City, Udaipur</p>
              <p>🏢 <strong>Floor:</strong> Floor {selectedFloor}</p>
              <p>🪑 <strong>Table Allocated:</strong> {selectedTable?.name} ({selectedTable?.capacity} People Space)</p>
              <p>👥 <strong>Party Size:</strong> {guests} Guests</p>
              <p>📅 <strong>Reserved For:</strong> {date} at {time}</p>
              <p>📱 <strong>Confirmation SMS:</strong> Sent to {phone}</p>
            </div>

            <div>
              <button
                onClick={() => {
                  setIsBooked(false);
                  setSelectedFloor(null);
                  setSelectedTable(null);
                }}
                className="bg-[#24150e] text-white px-6 py-2.5 rounded-full text-xs font-condensed font-bold uppercase tracking-wider hover:bg-[#b91c1c] transition-colors"
              >
                Book Another Table
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleBookTable}
            className="bg-white rounded-3xl p-6 md:p-10 border border-[#e8ded2] shadow-lg space-y-8"
          >
            {/* Step 1: Date, Time & Guests (Unchanged) */}
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#c88a48] font-bold block mb-3">
                Step 1: Date, Time & Guest Count
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-sans">
                    <CalendarIcon className="w-4 h-4 text-[#c88a48]" /> Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-sans">
                    <Clock className="w-4 h-4 text-[#c88a48]" /> Time Slot
                  </label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  >
                    <option value="12:30">12:30 PM (Lunch)</option>
                    <option value="14:00">02:00 PM (Lunch)</option>
                    <option value="18:30">06:30 PM (Sunset)</option>
                    <option value="19:30">07:30 PM (Dinner)</option>
                    <option value="21:00">09:00 PM (Late Dinner)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-sans">
                    <Users className="w-4 h-4 text-[#c88a48]" /> Guests
                  </label>
                  <select
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  >
                    <option value={1}>1 Person</option>
                    <option value={2}>2 People (Pair)</option>
                    <option value={3}>3 People</option>
                    <option value={4}>4 People (Family)</option>
                    <option value={5}>5 People</option>
                    <option value={6}>6 People (Group)</option>
                    <option value={8}>8+ People (Party)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Floor & Table Selection */}
            <div className="pt-6 border-t border-gray-100">
              <span className="text-xs uppercase font-mono tracking-widest text-[#c88a48] font-bold block mb-3">
                Step 2: Choose Floor & Pick Your Table
              </span>

              {/* Floor Options (Floor 1, Floor 2, Floor 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FLOORS.map((f) => {
                  const isSelected = selectedFloor === f.floor;
                  return (
                    <button
                      key={f.floor}
                      type="button"
                      onClick={() => handleSelectFloor(f.floor)}
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? "border-[#c88a48] bg-amber-50/70 shadow-sm ring-2 ring-[#c88a48]/25"
                          : "border-gray-200 bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-condensed font-bold text-lg text-[#24150e] uppercase tracking-wide flex items-center gap-1.5">
                            <Building2 className={`w-4 h-4 ${isSelected ? "text-[#c88a48]" : "text-gray-400"}`} />
                            {f.title}
                          </span>
                          {isSelected && (
                            <span className="text-[11px] font-bold text-[#c88a48] bg-[#c88a48]/15 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#8b4513]">{f.tag}</p>
                        <p className="text-[11px] text-gray-500 mt-1 font-sans">{f.desc}</p>
                      </div>

                      <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-[#c88a48]">
                        <span>View Tables 1–5</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Revealed Tables 1-5 for Selected Floor */}
              <AnimatePresence mode="wait">
                {selectedFloor ? (
                  <motion.div
                    key={selectedFloor}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="mt-6 p-5 rounded-2xl bg-amber-50/40 border border-amber-200/60"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h4 className="text-xs font-bold text-[#24150e] uppercase tracking-wider font-sans flex items-center gap-2">
                          <span>Tables Available on Floor {selectedFloor}</span>
                          <span className="text-[11px] bg-white px-2 py-0.5 rounded-md border border-amber-200 text-[#8b4513]">
                            5 Tables
                          </span>
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Select your desired table layout below:
                        </p>
                      </div>

                      {selectedTable && (
                        <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            Selected: Floor {selectedFloor} • {selectedTable.name} ({selectedTable.capacity} People Space)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {FLOOR_TABLES[selectedFloor].map((tbl) => {
                        const isSelected = selectedTable?.id === tbl.id;
                        const fitsGuests = tbl.capacity >= guests;

                        return (
                          <button
                            key={tbl.id}
                            type="button"
                            onClick={() => setSelectedTable(tbl)}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? "border-[#24150e] bg-[#24150e] text-white shadow-md ring-2 ring-[#c88a48]/50"
                                : "border-gray-200 bg-white hover:border-[#c88a48]/70 hover:bg-amber-50/50 text-[#24150e]"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`font-condensed font-bold text-base tracking-wide uppercase ${
                                  isSelected ? "text-amber-300" : "text-[#24150e]"
                                }`}>
                                  {tbl.name}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                }`}>
                                  FL {selectedFloor}
                                </span>
                              </div>

                              <div className={`text-xs font-bold flex items-center gap-1 mb-1 ${
                                isSelected ? "text-white" : "text-gray-800"
                              }`}>
                                <Users className="w-3.5 h-3.5 shrink-0 text-[#c88a48]" />
                                <span>{tbl.capacity} People Space</span>
                              </div>

                              <p className={`text-[11px] leading-tight ${
                                isSelected ? "text-amber-100/75" : "text-gray-500"
                              }`}>
                                {tbl.desc}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-100/20 flex items-center justify-between">
                              <span className={`text-[10px] font-medium ${
                                fitsGuests
                                  ? (isSelected ? "text-emerald-300" : "text-emerald-600 font-semibold")
                                  : (isSelected ? "text-amber-200/80" : "text-amber-700")
                              }`}>
                                {fitsGuests ? `✓ Fits ${guests} guests` : `Cozy for ${guests}`}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-5 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-center"
                  >
                    <p className="text-xs font-medium text-gray-500">
                      👆 Click on <strong>Floor 1</strong>, <strong>Floor 2</strong>, or <strong>Floor 3</strong> above to view available tables (Table 1 to Table 5 with dedicated seating capacity).
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Step 3: Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block font-sans">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block font-sans">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                />
              </div>
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-sans flex items-center gap-2">
                <span>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#24150e] hover:bg-[#b91c1c] disabled:opacity-50 text-white py-4 rounded-2xl font-condensed font-bold text-xl uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking Availability & Reserving...</span>
                </>
              ) : (
                "Confirm Reservation"
              )}
            </button>
          </motion.form>
        )}
      </main>

      <TanFooter />

    </div>
  );
}
