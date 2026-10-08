"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
  Check,
  Receipt,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";

export default function BookTablePage() {
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [time, setTime] = useState("19:30");
  const [guests, setGuests] = useState(3);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isBooked, setIsBooked] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<number | null>(null);

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

  const handleBookReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim()) {
      setSubmitError("Please provide your full name.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setSubmitError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    const apiBase = getApiBase();

    try {
      const res = await fetch(`${apiBase}/api/v1/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: 1,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          guest_count: guests,
          reservation_date: date,
          time_slot: time,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 400 && errData.detail?.includes("RESERVATION_CAPACITY_EXCEEDED")) {
          setSubmitError("Capacity is currently full for this time slot. Please choose another time or date.");
        } else {
          setSubmitError(errData.detail || "Unable to complete reservation. Please check details and try again.");
        }
        setIsSubmitting(false);
        return;
      }

      const bookingData = await res.json();
      setConfirmedBookingId(bookingData.id);
      setIsBooked(true);
    } catch (err: unknown) {
      console.error("Reservation booking error:", err);
      const msg = err instanceof Error ? err.message : "Unable to reach server";
      setSubmitError(`Connection error (${msg}). Please verify network connection and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-[#24150e]/10 text-[#24150e] px-4 py-1.5 rounded-full text-xs font-condensed font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-[#c88a48]" />
            <span>Online Table Reservations • Guaranteed Seating</span>
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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 md:p-12 border border-[#e8ded2] shadow-xl text-center space-y-6"
          >
            <div className="relative inline-block">
              <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
                Instant Confirmation • Table Officially Reserved
              </span>
              <h2 className="font-condensed text-4xl font-extrabold text-[#24150e] uppercase tracking-wide mt-3">
                Booking Confirmed!
              </h2>
              <p className="text-gray-600 font-sans text-base mt-2">
                Thank you <span className="font-bold text-[#24150e]">{name}</span>! Your table has been reserved for{" "}
                <span className="font-semibold text-[#b91c1c]">{date}</span> at{" "}
                <span className="font-semibold text-[#b91c1c]">{time}</span>.
              </p>
            </div>

            {/* Official Digital Confirmation Card */}
            <div className="bg-linear-to-b from-amber-50/90 to-orange-50/50 p-6 rounded-2xl border border-amber-200/80 text-left text-xs font-sans text-amber-950 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#c88a48]" />
                  <span className="font-bold uppercase tracking-wider text-xs text-[#24150e]">
                    Table Reservation Confirmation
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                  CONFIRMED
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {confirmedBookingId && (
                  <p>
                    🔖 <strong>Booking Ref:</strong> #RES-{String(confirmedBookingId).padStart(4, "0")}
                  </p>
                )}
                <p>
                  🪑 <strong>Table Assignment:</strong> Allocated by Host upon arrival
                </p>
                <p>
                  👥 <strong>Party Size:</strong> {guests} Guests
                </p>
                <p>
                  📅 <strong>Reserved For:</strong> {date} at {time}
                </p>
                <p>
                  📱 <strong>Customer Phone:</strong> {phone}
                </p>
                <p>
                  📍 <strong>Location:</strong> Jaadoo Café, Lal Ghat, Udaipur
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/70 bg-white/70 p-3 rounded-xl flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-gray-700">
                  Please arrive on time. Your table will be ready for you at the requested time slot.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto border border-gray-300 bg-white hover:bg-gray-50 text-[#24150e] px-6 py-2.5 rounded-full text-xs font-condensed font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Print / Save Confirmation
              </button>
              <button
                onClick={() => {
                  setIsBooked(false);
                  setName("");
                  setPhone("");
                }}
                className="w-full sm:w-auto bg-[#24150e] text-white px-6 py-2.5 rounded-full text-xs font-condensed font-bold uppercase tracking-wider hover:bg-[#b91c1c] transition-colors cursor-pointer"
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
            onSubmit={handleBookReservation}
            className="bg-white rounded-3xl p-6 md:p-10 border border-[#e8ded2] shadow-lg space-y-8"
          >
            {/* Step 1: Date, Time & Guests */}
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-amber-100 border border-gray-300 font-extrabold text-lg text-[#24150e] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      aria-label="Decrease guests"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center font-bold text-base bg-gray-50 border border-gray-200 rounded-xl py-2.5 font-condensed text-[#24150e]">
                      {guests} {guests === 1 ? "Guest" : "Guests"}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.min(12, g + 1))}
                      className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-amber-100 border border-gray-300 font-extrabold text-lg text-[#24150e] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      aria-label="Increase guests"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Contact Info */}
            <div className="pt-6 border-t border-gray-100">
              <span className="text-xs uppercase font-mono tracking-widest text-[#c88a48] font-bold block mb-3">
                Step 2: Contact Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block font-sans">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
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
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-sans flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
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
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                  <span>Confirming Table Reservation...</span>
                </>
              ) : (
                <span>Confirm Table Reservation</span>
              )}
            </button>
          </motion.form>
        )}
      </main>

      <TanFooter />
    </div>
  );
}
