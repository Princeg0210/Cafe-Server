"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, QrCode, ShieldCheck, CheckCircle2, ArrowRight, Smartphone } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<"upi" | "card" | "qr">("upi");
  const [upiId, setUpiId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsPaid(true);
      setTimeout(() => {
        setIsPaid(false);
        onPaymentSuccess();
        onClose();
      }, 2500);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#f7f3ee] text-[#24150e] rounded-3xl shadow-2xl border border-[#e8ded2] overflow-hidden z-10"
          >
            {/* Header */}
            <div className="bg-[#24150e] text-white p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-condensed font-bold uppercase tracking-widest text-[#c88a48] mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Razorpay / UPI Payment Gateway</span>
                </div>
                <h3 className="font-condensed font-extrabold text-2xl uppercase tracking-wide text-white">
                  Pay ₹{totalAmount}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300 hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {isPaid ? (
                <div className="py-8 text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="font-condensed font-extrabold text-3xl text-[#24150e] uppercase">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-gray-600 font-sans">
                    Transaction ID: <span className="font-mono font-bold">RZP_JAADOO_98293</span>
                  </p>
                  <div className="bg-emerald-50 text-emerald-900 p-3 rounded-xl border border-emerald-200 text-xs font-sans">
                    Order confirmed & dispatched to kitchen stations.
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-[#c88a48] border-t-transparent rounded-full animate-spin mx-auto" />
                  <h4 className="font-condensed font-bold text-xl text-[#24150e] uppercase tracking-wide">
                    Processing Secured Payment...
                  </h4>
                  <p className="text-xs text-gray-500 font-sans">
                    Connecting with Razorpay / UPI gateway...
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePayNow} className="space-y-6">
                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block font-sans">
                      Select Payment Option
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "upi", label: "UPI Instant", icon: <Smartphone className="w-4 h-4 text-[#c88a48]" /> },
                        { id: "qr", label: "Scan QR", icon: <QrCode className="w-4 h-4 text-[#c88a48]" /> },
                        { id: "card", label: "Cards/Net", icon: <CreditCard className="w-4 h-4 text-[#c88a48]" /> },
                      ].map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => setMethod(m.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                            method === m.id
                              ? "border-[#c88a48] bg-white shadow-xs font-bold text-[#24150e]"
                              : "border-[#e8ded2] bg-gray-50/50 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {m.icon}
                          <span className="text-xs font-condensed uppercase tracking-wider">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Method Details */}
                  {method === "upi" && (
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#e8ded2]">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block font-sans">
                        Enter UPI VPA ID (GPay / PhonePe / Paytm)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="yourname@upi or mobile number"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                      />
                      <div className="flex gap-2 justify-center pt-1">
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">GPay</span>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">PhonePe</span>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">Paytm</span>
                        <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">BHIM</span>
                      </div>
                    </div>
                  )}

                  {method === "qr" && (
                    <div className="bg-white p-5 rounded-2xl border border-[#e8ded2] text-center space-y-3">
                      <div className="w-36 h-36 bg-gray-900 text-white rounded-xl mx-auto flex items-center justify-center p-2 border-2 border-[#c88a48]">
                        <QrCode className="w-28 h-28 text-amber-400" />
                      </div>
                      <p className="text-xs text-gray-600 font-sans">
                        Scan with any UPI app to pay <strong className="text-[#24150e]">₹{totalAmount}</strong>
                      </p>
                    </div>
                  )}

                  {method === "card" && (
                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#e8ded2]">
                      <input
                        type="text"
                        required
                        placeholder="Card Number (4532 •••• •••• 8923)"
                        className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                        />
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="CVV"
                          className="w-full text-xs p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pay Action Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#24150e] hover:bg-[#b91c1c] text-white py-3.5 rounded-2xl font-condensed font-bold text-lg uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Pay ₹{totalAmount} Via Razorpay</span>
                    <ArrowRight className="w-4 h-4 text-[#c88a48]" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
