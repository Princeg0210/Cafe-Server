"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";

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
    <div className="min-h-screen bg-[#fcfaf8] text-cafe-dark font-sans pb-24">
      <Navbar cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-cafe-dark tracking-wide">
            Contact & Location
          </h1>
          <p className="text-gray-500 font-serif italic text-base md:text-lg mt-3">
            Find us in the heart of Old City, Udaipur. We'd love to hear from you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Details Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-md space-y-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-2xl font-serif font-bold text-cafe-dark mb-6">Café Information</h2>
              
              <div className="space-y-5 text-sm font-sans">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-cafe-gold/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5 text-cafe-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Address</h4>
                    <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                      Old City, Near Gangaur Ghat, Udaipur, Rajasthan 313001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-cafe-gold/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-5 h-5 text-cafe-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Operating Hours</h4>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Monday – Sunday: 11:30 AM – 10:30 PM
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-cafe-gold/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Phone className="w-5 h-5 text-cafe-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Phone / WhatsApp</h4>
                    <p className="text-gray-600 text-xs mt-0.5">+91 98290 12345</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-cafe-gold/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Mail className="w-5 h-5 text-cafe-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">Email Inquiry</h4>
                    <p className="text-gray-600 text-xs mt-0.5">ciao@jaadooudaipur.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 text-xs font-serif italic text-amber-900">
              💡 Tip: Parking is accessible via Chandpole gate or short walk from Jagdish Temple.
            </div>
          </motion.div>

          {/* Direct Message Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl p-8 border border-gray-100 shadow-md"
          >
            <h2 className="text-2xl font-serif font-bold text-cafe-dark mb-6">Send Us a Message</h2>

            {isSent ? (
              <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 animate-bounce" />
                <h3 className="font-serif font-bold text-xl text-cafe-dark">Message Sent!</h3>
                <p className="text-xs text-gray-500 font-serif">Grazie! Our team will get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">
                    Email / Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="john@example.com"
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 block">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Inquire about group bookings, dietary requests, or private events..."
                    className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-cafe-gold bg-gray-50/50 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cafe-dark hover:bg-cafe-red text-white py-3.5 rounded-xl font-serif font-semibold text-base transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </motion.div>
        </div>
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
