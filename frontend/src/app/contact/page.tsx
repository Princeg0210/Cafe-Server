"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";
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
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-16 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide">
            Brew Station & Location
          </h1>
          <p className="text-gray-600 font-sans text-sm md:text-base mt-2">
            Find us in the heart of Old City Udaipur near Gangaur Ghat.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 border border-[#e8ded2] shadow-md space-y-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-3xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide mb-6">Café Information</h2>
              
              <div className="space-y-5 text-sm font-sans">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c88a48]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5 text-[#c88a48]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Address</h4>
                    <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                      Old City, Near Gangaur Ghat, Udaipur, Rajasthan 313001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c88a48]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-5 h-5 text-[#c88a48]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Brewing Hours</h4>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Monday – Sunday: 11:30 AM – 10:30 PM
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c88a48]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Phone className="w-5 h-5 text-[#c88a48]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Phone / WhatsApp</h4>
                    <p className="text-gray-600 text-xs mt-0.5">+91 98290 12345</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#c88a48]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Mail className="w-5 h-5 text-[#c88a48]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Email Inquiry</h4>
                    <p className="text-gray-600 text-xs mt-0.5">ciao@jaadooudaipur.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-100/60 p-4 rounded-2xl border border-amber-200/80 text-xs font-sans text-amber-950">
              💡 Parking is accessible via Chandpole gate or a short walk from Jagdish Temple.
            </div>
          </motion.div>

          {/* Direct Message Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 border border-[#e8ded2] shadow-md"
          >
            <h2 className="text-3xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide mb-6">Send Us a Message</h2>

            {isSent ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 animate-bounce" />
                <h3 className="font-condensed font-extrabold text-2xl uppercase tracking-wide text-[#24150e]">Message Sent!</h3>
                <p className="text-xs text-gray-500 font-sans">Grazie! Our team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block font-sans">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block font-sans">
                    Email / Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="john@example.com"
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block font-sans">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Inquire about group bookings, dietary requests, or private events..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#24150e] hover:bg-[#b91c1c] text-white py-3.5 rounded-xl font-condensed font-bold text-lg uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
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
