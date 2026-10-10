"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2, CheckCircle2, MessageSquare, Utensils, CreditCard, HeartHandshake } from "lucide-react";
import { MenuItem, MENU_ITEM_ID_MAP } from "@/data/menu";
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

  const sendOrderToBackend = async () => {
    try {
      const apiBase = "";
      const payload = {
        qr_token: "tbl-04",
        items: items.map((it) => ({
          menu_item_id: MENU_ITEM_ID_MAP[it.id] || (parseInt(it.id) || undefined),
          name: it.name,
          quantity: it.quantity,
          special_instructions: specialInstructions || undefined,
        })),
      };
      await fetch(`${apiBase}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn("Could not sync order to backend:", e);
    }
  };

  const handleSubmitOrder = async () => {
    await sendOrderToBackend();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClearCart();
      onClose();
    }, 4500);
  };

  const handleOnlinePaymentSuccess = async () => {
    await sendOrderToBackend();
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClearCart();
      onClose();
    }, 4500);
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
              className="absolute inset-0 bg-[#1C1512]/60 backdrop-blur-xs"
            />

            {/* Slide-over Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 right-0 max-w-full flex pl-10"
            >
              <div className="w-screen max-w-md bg-[#FBF9F5] text-[#261C18] shadow-2xl flex flex-col justify-between border-l border-[#E4DCD0]">
                
                {/* Drawer Header */}
                <div className="p-6 bg-[#261C18] text-[#FBF9F5] flex items-center justify-between border-b border-[#E4DCD0]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#B85B43]/20 flex items-center justify-center text-[#B85B43] border border-[#B85B43]/30">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-xl text-[#FBF9F5]">Running Bill</h3>
                      <p className="text-xs text-stone-300 font-sans">Table #4 • Jaadoo Trattoria</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-[#F6F3EC]/10 flex items-center justify-center text-stone-300 hover:bg-[#F6F3EC]/20 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isSubmitted ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3"
                    >
                      <div className="w-14 h-14 rounded-full bg-[#4A5842]/20 border border-[#4A5842]/40 text-[#4A5842] flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-[#4A5842] animate-bounce" />
                      </div>
                      <h4 className="font-serif text-2xl font-bold text-[#261C18]">Order Dispatched!</h4>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#B85B43] bg-[#B85B43]/10 px-3 py-0.5 rounded-full border border-[#B85B43]/20">
                        Kitchen (Oven)
                      </span>

                      <div className="bg-[#F6F3EC] border-2 border-[#E2D4C3] rounded-2xl p-5 text-center my-3 shadow-xs">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 border border-[#DECFC0] text-xs font-sans font-bold uppercase tracking-wider text-[#B85B43] mb-2.5 shadow-2xs">
                          <HeartHandshake className="w-4 h-4 text-[#B85B43]" />
                          <span>A Warm Note From Our Team</span>
                        </div>
                        <p className="font-serif text-sm sm:text-base text-[#261C18] leading-relaxed font-semibold">
                          “Please feel free to settle your bill at our reception counter whenever you wrap up. We invite you to pay at the counter not just for the bill, but because we genuinely love to meet, smile with, and thank the wonderful people who grace Jaadoo Café with their presence!”
                        </p>
                        <p className="text-xs font-sans font-medium text-[#4A5842] mt-2.5">
                          You are never just a table number to us — you are our guest. Savor every bite!
                        </p>
                      </div>

                      <span className="text-xs font-semibold bg-[#261C18] text-[#FBF9F5] px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs">
                        Linked to Table #4
                      </span>
                    </motion.div>
                  ) : items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 py-16">
                      <ShoppingBag className="w-12 h-12 mb-3 text-stone-300" />
                      <p className="font-serif text-xl font-bold text-stone-600">Your bill is empty.</p>
                      <p className="text-xs text-stone-400 mt-1 font-sans">Tap any dish on the menu to add to your order.</p>
                    </div>
                  ) : (
                    <>
                      {/* Item List */}
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-[#F6F3EC] rounded-2xl p-4 border border-[#E4DCD0] flex items-center justify-between gap-4"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="font-serif font-bold text-base text-[#261C18] break-words whitespace-normal">{item.name}</h4>
                              <p className="text-xs font-serif font-bold text-[#B85B43] mt-0.5">₹{item.price}</p>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center border border-[#E4DCD0] rounded-xl overflow-hidden bg-[#FBF9F5]">
                                <button
                                  onClick={() => onUpdateQuantity(item.id, -1)}
                                  className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-[#E4DCD0]/40"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center text-xs font-bold text-[#261C18]">{item.quantity}</span>
                                <button
                                  onClick={() => onUpdateQuantity(item.id, 1)}
                                  className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-[#E4DCD0]/40"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => onRemoveItem(item.id)}
                                className="text-stone-400 hover:text-[#B85B43] transition-colors p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Special Instructions Input */}
                      <div className="bg-[#F6F3EC] p-4 rounded-2xl border border-[#E4DCD0]">
                        <label className="flex items-center gap-2 text-xs font-semibold text-[#261C18] uppercase tracking-wider mb-2 font-sans">
                          <MessageSquare className="w-3.5 h-3.5 text-[#B85B43]" />
                          Special Kitchen Notes
                        </label>
                        <textarea
                          rows={2}
                          value={specialInstructions}
                          onChange={(e) => setSpecialInstructions(e.target.value)}
                          placeholder="e.g. Extra garlic olive oil, no sugar..."
                          className="w-full text-xs p-3 rounded-xl border border-[#E4DCD0] focus:outline-hidden focus:border-[#B85B43] font-sans bg-[#FBF9F5]"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Drawer Footer */}
                {!isSubmitted && items.length > 0 && (
                  <div className="p-6 bg-[#F6F3EC] border-t border-[#E4DCD0] space-y-3.5">
                    <div className="space-y-1 text-xs font-sans">
                      <div className="flex justify-between text-stone-600">
                        <span>Subtotal</span>
                        <span>₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>GST (5%)</span>
                        <span>₹{tax}</span>
                      </div>
                      <div className="flex justify-between font-serif font-bold text-2xl text-[#261C18] pt-2 border-t border-[#E4DCD0]">
                        <span>Total Bill</span>
                        <span className="text-[#B85B43]">₹{grandTotal}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={handleSubmitOrder}
                        className="bg-[#261C18] hover:bg-[#1C1512] text-[#FBF9F5] py-3 px-3 rounded-full font-sans font-semibold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5 border border-[#E4DCD0]/20"
                      >
                        <Utensils className="w-4 h-4 text-[#B85B43]" />
                        <span>Send order · pay at counter when leaving</span>
                      </button>

                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] py-3 px-3 rounded-full font-sans font-semibold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5 border border-[#E4DCD0]/20"
                      >
                        <CreditCard className="w-4 h-4 text-[#FBF9F5]" />
                        <span>Pay Online (Razorpay)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={grandTotal}
        onPaymentSuccess={handleOnlinePaymentSuccess}
      />
    </>
  );
}
