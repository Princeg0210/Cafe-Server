"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, MessageSquare } from "lucide-react";
import { MenuItem } from "@/data/menu";

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

  return (
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
            <div className="w-screen max-w-md bg-[#fcfaf8] text-cafe-dark shadow-2xl flex flex-col justify-between">
              
              {/* Drawer Header */}
              <div className="p-6 bg-white border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cafe-gold/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-cafe-gold" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-cafe-dark">Running Bill</h3>
                    <p className="text-xs text-gray-500 font-sans">Table #4 · Jaadoo Udaipur</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
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
                    <h4 className="font-serif text-2xl font-bold text-cafe-dark mb-2">Order Sent to Kitchen!</h4>
                    <p className="text-sm text-gray-600 font-serif italic mb-4">
                      Kitchen 1 (Hot Food) & Kitchen 2 (Beverages) have received your items.
                    </p>
                    <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                      Payment at POS Counter upon exit
                    </span>
                  </motion.div>
                ) : items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-16">
                    <ShoppingBag className="w-12 h-12 mb-3 text-gray-300" />
                    <p className="font-serif text-lg text-gray-500">Your running bill is empty.</p>
                    <p className="text-xs text-gray-400 mt-1">Tap any menu dish to add to your order.</p>
                  </div>
                ) : (
                  <>
                    {/* Item List */}
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl p-4 border border-gray-100 shadow-2xs flex items-center justify-between gap-4"
                        >
                          <div className="flex-1">
                            <h4 className="font-serif font-bold text-base text-gray-800">{item.name}</h4>
                            <p className="text-sm font-semibold text-cafe-dark mt-0.5">₹{item.price}</p>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Special Instructions Input */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                        <MessageSquare className="w-3.5 h-3.5 text-cafe-gold" />
                        Special Kitchen Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="e.g. Extra crisp crust, less sugar in tisane..."
                        className="w-full text-xs p-2.5 rounded-lg border border-gray-200 focus:outline-hidden focus:border-cafe-gold font-sans bg-gray-50/50"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              {!isSubmitted && items.length > 0 && (
                <div className="p-6 bg-white border-t border-gray-200 space-y-4">
                  <div className="space-y-1.5 text-sm font-sans">
                    <div className="flex justify-between text-gray-500">
                      <span>Items Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Estimated GST (5%)</span>
                      <span>₹{tax}</span>
                    </div>
                    <div className="flex justify-between font-serif font-bold text-lg text-cafe-dark pt-2 border-t border-gray-100">
                      <span>Running Total</span>
                      <span className="text-cafe-red">₹{grandTotal}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitOrder}
                    className="w-full bg-cafe-dark hover:bg-cafe-red text-white py-3.5 px-4 rounded-xl font-serif font-semibold text-base transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Submit Order to Kitchen</span>
                  </button>

                  <p className="text-[11px] text-center text-gray-400 italic">
                    Final monetary payment is processed at the POS counter upon exit.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
