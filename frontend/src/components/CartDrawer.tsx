"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, MessageSquare, Flame, CreditCard } from "lucide-react";
import { MenuItem } from "@/data/menu";
import PaymentModal from "./PaymentModal";

export interface CartItem extends MenuItem {
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const grandTotal = subtotal + tax;

  const handleSubmitOrder = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClearCart();
      onClose();
    }, 2500);
  };

  const handleOnlinePaymentSuccess = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClearCart();
      onClose();
    }, 2500);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 max-w-full flex pl-10"
            >
              <div className="w-screen max-w-md bg-[#f7f3ee] text-[#24150e] shadow-2xl flex flex-col justify-between border-l border-[#e8ded2]">
                
                {/* Drawer Header */}
                <div className="p-6 bg-[#24150e] text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#c88a48]/20 flex items-center justify-center text-[#c88a48]">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-condensed font-extrabold text-2xl uppercase tracking-wider text-white">Running Bill</h3>
                      <p className="text-xs text-amber-200/70 font-sans">Table #4 · Jaadoo Udaipur</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isSubmitted ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-8"
                    >
                      <CheckCircle2 className="w-16 h-16 text-emerald-600 mb-4 animate-bounce" />
                      <h4 className="font-condensed text-3xl font-extrabold text-[#24150e] mb-2 uppercase tracking-wide">Order Dispatched!</h4>
                      <p className="text-sm text-gray-600 font-sans italic mb-4">
                        Sent to Kitchen 1 (Woodfired Hot Food) & Kitchen 2 (Bar & Beverage Station).
                      </p>
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                        Order status linked to Table #4
                      </span>
                    </motion.div>
                  ) : items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-16">
                      <ShoppingBag className="w-12 h-12 mb-3 text-gray-300" />
                      <p className="font-condensed text-xl uppercase tracking-wider text-gray-600">Your bill is empty.</p>
                      <p className="text-xs text-gray-400 mt-1 font-sans">Tap any dish on the menu to add to your order.</p>
                    </div>
                  ) : (
                    <>
                      {/* Item List */}
                      <div className="space-y-3.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-2xl p-4 border border-[#e8ded2] shadow-2xs flex items-center justify-between gap-4"
                          >
                            <div className="flex-1">
                              <h4 className="font-condensed font-bold text-lg text-gray-900 uppercase tracking-wide">{item.name}</h4>
                              <p className="text-sm font-semibold text-[#c88a48] mt-0.5">₹{item.price}</p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center border border-[#e8ded2] rounded-xl overflow-hidden bg-gray-50">
                                <button
                                  onClick={() => onUpdateQuantity(item.id, -1)}
                                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center text-sm font-bold text-[#24150e]">{item.quantity}</span>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, 1)}
                                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                onClick={() => onRemoveItem(item.id)}
                                className="text-gray-400 hover:text-[#b91c1c] transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Special Instructions Input */}
                      <div className="bg-white p-4 rounded-2xl border border-[#e8ded2] shadow-2xs">
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                          <MessageSquare className="w-3.5 h-3.5 text-[#c88a48]" />
                          Special Instructions
                        </label>
                        <textarea
                          rows={2}
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          placeholder="e.g. Extra garlic olive oil, no sugar..."
                          className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] font-sans bg-gray-50/50"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Drawer Footer */}
                {!isSubmitted && items.length > 0 && (
                  <div className="p-6 bg-white border-t border-[#e8ded2] space-y-3.5">
                    <div className="space-y-1 text-sm font-sans">
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>Subtotal</span>
                        <span>₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>GST (5%)</span>
                        <span>₹{tax}</span>
                      </div>
                      <div className="flex justify-between font-condensed font-extrabold text-2xl text-[#24150e] uppercase pt-1.5 border-t border-gray-100">
                        <span>Total Bill</span>
                        <span className="text-[#b91c1c]">₹{grandTotal}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={handleSubmitOrder}
                        className="bg-[#24150e] hover:bg-gray-900 text-white py-3 px-3 rounded-xl font-condensed font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Flame className="w-4 h-4 text-[#c88a48]" />
                        <span>Send (POS Pay)</span>
                      </button>

                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="bg-[#b91c1c] hover:bg-red-800 text-white py-3 px-3 rounded-xl font-condensed font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4 text-amber-200" />
                        <span>Pay Online (Razorpay)</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-center text-gray-400 italic font-sans">
                      Choose to settle at POS counter or pay instantly via Razorpay/UPI.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Razorpay / UPI Payment Modal Readiness */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={grandTotal}
        onPaymentSuccess={handleOnlinePaymentSuccess}
      />
    </>
  );
}
