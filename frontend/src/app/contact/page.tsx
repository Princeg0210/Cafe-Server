"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Car } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import TanFooter from "@/components/TanFooter";

export default function ContactPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    setTimeout(() => setIsSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#140E0A] tracking-tight">
            Brew Station and Location
          </h1>
          <p className="text-[#241711] font-sans text-sm md:text-base mt-2">
            Find us in the heart of Old City Udaipur near Gangaur Ghat.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 border border-[#DDD3C4] shadow-md space-y-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#140E0A] tracking-tight mb-6">Café Information</h2>
              
              <div className="space-y-5 text-sm font-sans">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#9E3E26]/10 flex items-center justify-center shrink-0 mt-1">
                    <MapPin className="w-5 h-5 text-[#9E3E26]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#140E0A] text-base">Address</h4>
                    <p className="text-[#261A12] text-sm mt-0.5 leading-relaxed">
                      Old City, Near Gangaur Ghat, Udaipur, Rajasthan 313001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#9E3E26]/10 flex items-center justify-center shrink-0 mt-1">
                    <Clock className="w-5 h-5 text-[#9E3E26]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#140E0A] text-base">Brewing Hours</h4>
                    <p className="text-[#261A12] text-sm mt-0.5">
                      Monday – Sunday: 11:30 AM – 10:30 PM
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#9E3E26]/10 flex items-center justify-center shrink-0 mt-1">
                    <Phone className="w-5 h-5 text-[#9E3E26]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#140E0A] text-base">Phone / WhatsApp</h4>
                    <p className="text-[#261A12] text-sm mt-0.5 font-semibold">+91 98290 12345</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#9E3E26]/10 flex items-center justify-center shrink-0 mt-1">
                    <Mail className="w-5 h-5 text-[#9E3E26]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#140E0A] text-base">Email Inquiry</h4>
                    <p className="text-[#261A12] text-sm mt-0.5 font-semibold">ciao@jaadooudaipur.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#E2EDDE] p-4 rounded-2xl border border-[#B5CEAE] text-xs font-sans text-[#1B3618] font-medium flex items-center gap-2">
              <Car className="w-4 h-4 text-[#1B3618] shrink-0" />
              <span>Parking is accessible via Chandpole gate or a short scenic walk from Jagdish Temple.</span>
            </div>
          </motion.div>

          {/* Direct Message Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 border border-[#DDD3C4] shadow-md"
          >
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#140E0A] tracking-tight mb-6">Send Us a Message</h2>

            {isSent ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-[#1B3618] animate-bounce" />
                <h3 className="font-serif font-bold text-2xl text-[#140E0A]">Message Sent!</h3>
                <p className="text-xs text-[#261A12] font-sans">Grazie! Our team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#140E0A] uppercase tracking-wider mb-1.5 block font-sans">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full text-sm p-3 rounded-xl border border-[#DDD3C4] focus:outline-hidden focus:border-[#9E3E26] bg-[#FAF7F2] font-sans text-[#140E0A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#140E0A] uppercase tracking-wider mb-1.5 block font-sans">
                    Email / Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="john@example.com"
                    className="w-full text-sm p-3 rounded-xl border border-[#DDD3C4] focus:outline-hidden focus:border-[#9E3E26] bg-[#FAF7F2] font-sans text-[#140E0A]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#140E0A] uppercase tracking-wider mb-1.5 block font-sans">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Inquire about group bookings, dietary requests, or private events..."
                    className="w-full text-sm p-3 rounded-xl border border-[#DDD3C4] focus:outline-hidden focus:border-[#9E3E26] bg-[#FAF7F2] font-sans text-[#140E0A]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#140E0A] hover:bg-[#9E3E26] text-white py-3.5 rounded-xl font-sans font-bold text-sm uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </main>

      <TanFooter />

    </div>
  );
}
