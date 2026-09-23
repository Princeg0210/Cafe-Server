"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, Users, Sparkles, CheckCircle2, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import { MenuItem } from "@/data/menu";

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
    <div className="min-h-screen bg-[#fcfaf8] text-cafe-dark font-sans pb-24">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-cafe-gold/10 text-cafe-dark px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-cafe-gold" />
            <span>Online Table Reservations</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-cafe-dark tracking-wide">
            Reserve Your Table
          </h1>
          <p className="text-gray-500 font-serif italic text-base md:text-lg mt-3">
            Experience Italian Kitchen Magic with breathtaking views of Old City Udaipur.
          </p>
        </motion.div>

        {isBooked ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 md:p-12 border border-emerald-100 shadow-xl text-center space-y-6"
          >
            <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto animate-pulse" />
            <h2 className="font-serif text-3xl font-bold text-cafe-dark">Table Reserved!</h2>
            <p className="text-gray-600 font-serif text-lg">
              Grazie <span className="font-bold text-cafe-dark">{name}</span>! We look forward to welcoming you on{" "}
              <span className="font-semibold text-cafe-red">{date}</span> at{" "}
              <span className="font-semibold text-cafe-red">{time}</span>.
            </p>
            
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/50 inline-block text-left text-xs font-sans text-amber-900 space-y-1">
              <p>📍 <strong>Location:</strong> Old City, Udaipur</p>
              <p>🪑 <strong>Seating:</strong> {seating.toUpperCase()} View ({guests} Guests)</p>
              <p>📱 <strong>Confirmation SMS:</strong> Sent to {phone}</p>
            </div>

            <div>
              <button
                onClick={() => setIsBooked(false)}
                className="bg-cafe-dark text-white px-6 py-2.5 rounded-full text-sm font-serif font-medium hover:bg-cafe-red transition-colors"
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
            className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-lg space-y-8"
          >
            {/* Step 1: Date & Guests */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  <CalendarIcon className="w-4 h-4 text-cafe-gold" /> Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  <Clock className="w-4 h-4 text-cafe-gold" /> Time Slot
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50"
                >
                  <option value="12:30">12:30 PM (Lunch)</option>
                  <option value="14:00">02:00 PM (Lunch)</option>
                  <option value="18:30">06:30 PM (Sunset)</option>
                  <option value="19:30">07:30 PM (Dinner)</option>
                  <option value="21:00">09:00 PM (Late Dinner)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  <Users className="w-4 h-4 text-cafe-gold" /> Guests
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50"
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
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                <MapPin className="w-4 h-4 text-cafe-gold" /> Seating Atmosphere
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
                        ? "border-cafe-gold bg-amber-50/40 shadow-xs"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h4 className="font-serif font-bold text-sm text-cafe-dark">{s.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-cafe-dark hover:bg-cafe-red text-white py-4 rounded-xl font-serif font-semibold text-lg transition-colors shadow-md"
            >
              Confirm Reservation
            </button>
          </motion.form>
        )}
      </main>

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
