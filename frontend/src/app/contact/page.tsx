"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, Car } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer, { CartItem } from "@/components/CartDrawer";
import TanFooter from "@/components/TanFooter";

// Same number shown on this page and across the site
const CAFE_WHATSAPP_NUMBER = "919829012345";

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

  // No email service yet: hand the message to WhatsApp so it actually reaches the cafe
  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();
    if (!name || !message) return;
    const text = `Hi Jaadoo, this is ${name}${email ? ` (${email})` : ""}.

${message}`;
    window.open(`https://wa.me/${CAFE_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setIsSent(true);
    e.currentTarget.reset();
    setTimeout(() => setIsSent(false), 4000);
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
          <div className="inline-flex items-center gap-2 text-[#9E3E26] text-xs font-sans font-bold uppercase tracking-[0.22em] mb-2.5">
            <Mail className="w-3.5 h-3.5 text-[#9E3E26]" />
            <span>Get in Touch • Jaadoo Pizza Project</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#140E0A] tracking-tight">
            Contact Us
          </h1>
          <p className="text-[#3B2C23] font-sans text-sm md:text-base mt-2 max-w-xl mx-auto">
            Have questions about private dining, group events, or dietary requests? Reach out directly to our team.
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
                      32 Sitaphal ki gali, Ganesh Ghati, Old City, Udaipur, Rajasthan 313001
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
              <span>Sitafal ki gali is a narrow residential lane reserved strictly for local residents. Two-wheelers must be parked outside our gali and walk to Jaadoo, one minute or two on, it’s safe and pretty. Four-wheelers can not reach anywhere near us during service. You will either need to walk 10 mins into old city or take an auto.</span>
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
                <h3 className="font-serif font-bold text-2xl text-[#140E0A]">Almost there!</h3>
                <p className="text-xs text-[#261A12] font-sans">Your message is ready in WhatsApp. Tap send there and our team will reply shortly.</p>
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
                    name="name"
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
                    name="email"
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
                    name="message"
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
