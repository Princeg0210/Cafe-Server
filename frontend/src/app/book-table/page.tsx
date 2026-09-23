"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, Users, Sparkles, CheckCircle2, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import TanFooter from "@/components/TanFooter";

export default function BookTablePage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Form State
  const [date, setDate] = useState("2026-09-24");
  const [time, setTime] = useState("19:30");
  const [guests, setGuests] = useState(2);
  const [seating, setSeating] = useState("rooftop");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBooked, setIsBooked] = useState(false);

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

  const handleBookTable = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooked(true);
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
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
              Grazie <span className="font-bold text-[#24150e]">{name}</span>! We look forward to welcoming you on{" "}
              <span className="font-semibold text-[#b91c1c]">{date}</span> at{" "}
              <span className="font-semibold text-[#b91c1c]">{time}</span>.
            </p>
            
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/70 inline-block text-left text-xs font-sans text-amber-950 space-y-1">
              <p>📍 <strong>Brew Station:</strong> Old City, Udaipur</p>
              <p>🪑 <strong>Atmosphere:</strong> {seating.toUpperCase()} View ({guests} Guests)</p>
              <p>📱 <strong>Confirmation SMS:</strong> Sent to {phone}</p>
            </div>

            <div>
              <button
                onClick={() => setIsBooked(false)}
                className="bg-[#24150e] text-white px-6 py-2.5 rounded-full text-xs font-condensed font-bold uppercase tracking-wider hover:bg-[#b91c1c] transition-colors"
              >
                Book Another Slot
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
            {/* Step 1: Date & Guests */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <option value={4}>4 People (Family)</option>
                  <option value={6}>6 People (Group)</option>
                  <option value={8}>8+ People (Party)</option>
                </select>
              </div>
            </div>

            {/* Step 2: Seating Preference */}
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 font-sans">
                <MapPin className="w-4 h-4 text-[#c88a48]" /> Seating Atmosphere
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "rooftop", title: "Rooftop Terrace", desc: "Lake & City View" },
                  { id: "garden", title: "Courtyard Garden", desc: "Cozy & Lush Greens" },
                  { id: "indoor", title: "Indoor Bistro", desc: "Woodfired Oven Vibes" },
                ].map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSeating(s.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      seating === s.id
                        ? "border-[#c88a48] bg-amber-50/60 shadow-2xs"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h4 className="font-condensed font-bold text-lg text-[#24150e] uppercase tracking-wide">{s.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-sans">{s.desc}</p>
                  </div>
                ))}
              </div>
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

            <button
              type="submit"
              className="w-full bg-[#24150e] hover:bg-[#b91c1c] text-white py-4 rounded-2xl font-condensed font-bold text-xl uppercase tracking-wider transition-colors shadow-md"
            >
              Confirm Reservation
            </button>
          </motion.form>
        )}
      </main>

      <TanFooter />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
