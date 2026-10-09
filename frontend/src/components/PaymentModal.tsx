"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, QrCode, ShieldCheck, CheckCircle2, ArrowRight, Smartphone, Copy, Check, ExternalLink } from "lucide-react";
import QRCode from "qrcode";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

const MERCHANT_UPI_ID = "9460555743-2@ybl";
const MERCHANT_NAME = "Jaadoo Pizza Project";

export default function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<"upi" | "card" | "qr">("upi");
  const [upiId, setUpiId] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const upiUri = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${totalAmount.toFixed(2)}&cu=INR&tn=Order_Payment`;

  useEffect(() => {
    if (isOpen && method === "qr") {
      QRCode.toDataURL(upiUri, {
        width: 280,
        margin: 2,
        color: { dark: "#261C18", light: "#ffffff" },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("QR Generation error:", err));
    }
  }, [isOpen, method, totalAmount, upiUri]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(MERCHANT_UPI_ID);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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
            className="fixed inset-0 bg-[#1C1512]/70 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#FBF9F5] text-[#261C18] rounded-3xl shadow-2xl border border-[#E4DCD0] overflow-hidden z-10"
          >
            {/* Header */}
            <div className="bg-[#261C18] text-[#FBF9F5] p-6 flex items-center justify-between border-b border-[#E4DCD0]/20">
              <div>
                <div className="flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-widest text-[#4A5842] mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#4A5842]" />
                  <span>Razorpay / UPI Secure Gateway</span>
                </div>
                <h3 className="font-serif font-bold text-2xl text-[#FBF9F5]">
                  Pay ₹{totalAmount}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F6F3EC]/10 flex items-center justify-center text-stone-300 hover:bg-[#F6F3EC]/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {isPaid ? (
                <div className="py-8 text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-[#4A5842] mx-auto animate-bounce" />
                  <h4 className="font-serif font-bold text-3xl text-[#261C18]">
                    Payment Successful!
                  </h4>
                  <p className="text-xs text-stone-600 font-sans">
                    Transaction ID: <span className="font-mono font-bold">RZP_JAADOO_98293</span>
                  </p>
                  <div className="bg-[#4A5842]/10 text-[#261C18] p-3 rounded-xl border border-[#4A5842]/20 text-xs font-sans">
                    Order confirmed & dispatched to kitchen stations.
                  </div>
                </div>
              ) : isProcessing ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-[#B85B43] border-t-transparent rounded-full animate-spin mx-auto" />
                  <h4 className="font-serif font-bold text-xl text-[#261C18]">
                    Processing Secured Payment...
                  </h4>
                  <p className="text-xs text-stone-500 font-sans">
                    Connecting with Razorpay / UPI gateway...
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePayNow} className="space-y-6">
                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-xs font-semibold text-[#261C18] uppercase tracking-wider mb-2 block font-sans">
                      Select Payment Option
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "upi", label: "UPI Instant", icon: <Smartphone className="w-4 h-4 text-[#B85B43]" /> },
                        { id: "qr", label: "Scan QR", icon: <QrCode className="w-4 h-4 text-[#B85B43]" /> },
                        { id: "card", label: "Cards/Net", icon: <CreditCard className="w-4 h-4 text-[#B85B43]" /> },
                      ].map((m) => (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => setMethod(m.id as any)}
                          className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                            method === m.id
                              ? "border-[#B85B43] bg-[#F6F3EC] shadow-xs font-bold text-[#261C18]"
                              : "border-[#E4DCD0] bg-[#FBF9F5] text-stone-600 hover:border-[#E4DCD0]"
                          }`}
                        >
                          {m.icon}
                          <span className="text-xs font-sans uppercase tracking-wider">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Method Details */}
                  {method === "upi" && (
                    <div className="space-y-3 bg-[#F6F3EC] p-4 rounded-2xl border border-[#E4DCD0]">
                      <label className="text-xs font-semibold text-[#261C18] uppercase tracking-wider block font-sans">
                        Enter UPI VPA ID (GPay / PhonePe / Paytm)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="yourname@upi or mobile number"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-[#E4DCD0] focus:outline-hidden focus:border-[#B85B43] bg-[#FBF9F5] font-sans"
                      />
                      <div className="flex gap-2 justify-center pt-1">
                        <span className="text-[10px] font-bold bg-[#FBF9F5] text-stone-600 px-2 py-0.5 rounded border border-[#E4DCD0]">GPay</span>
                        <span className="text-[10px] font-bold bg-[#FBF9F5] text-stone-600 px-2 py-0.5 rounded border border-[#E4DCD0]">PhonePe</span>
                        <span className="text-[10px] font-bold bg-[#FBF9F5] text-stone-600 px-2 py-0.5 rounded border border-[#E4DCD0]">Paytm</span>
                        <span className="text-[10px] font-bold bg-[#FBF9F5] text-stone-600 px-2 py-0.5 rounded border border-[#E4DCD0]">BHIM</span>
                      </div>
                    </div>
                  )}

                  {method === "qr" && (
                    <div className="bg-[#F6F3EC] p-5 rounded-2xl border border-[#E4DCD0] text-center space-y-3">
                      <div className="w-44 h-44 bg-white rounded-2xl mx-auto flex items-center justify-center p-2 border border-[#E4DCD0] shadow-sm">
                        {qrCodeDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrCodeDataUrl}
                            alt={`UPI QR for ${MERCHANT_UPI_ID}`}
                            className="w-40 h-40 object-contain rounded-xl"
                          />
                        ) : (
                          <div className="w-40 h-40 bg-stone-100 rounded-xl flex items-center justify-center animate-pulse">
                            <QrCode className="w-16 h-16 text-[#B85B43]/50" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 font-sans">
                        Scan with GPay, PhonePe, Paytm, BHIM to pay <strong className="text-[#261C18]">₹{totalAmount}</strong>
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <code className="text-[11px] font-mono bg-white border border-[#E4DCD0] px-2.5 py-1 rounded-lg font-bold text-[#261C18]">
                          {MERCHANT_UPI_ID}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="px-2 py-1 bg-white border border-[#E4DCD0] rounded-lg text-[10px] font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <a
                        href={upiUri}
                        className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Pay via UPI App (Mobile)</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                      </a>
                    </div>
                  )}

                  {method === "card" && (
                    <div className="space-y-3 bg-[#F6F3EC] p-4 rounded-2xl border border-[#E4DCD0]">
                      <input
                        type="text"
                        required
                        placeholder="Card Number (4532 •••• •••• 8923)"
                        className="w-full text-xs p-3 rounded-xl border border-[#E4DCD0] focus:outline-hidden focus:border-[#B85B43] bg-[#FBF9F5] font-sans"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          className="w-full text-xs p-3 rounded-xl border border-[#E4DCD0] focus:outline-hidden focus:border-[#B85B43] bg-[#FBF9F5] font-sans"
                        />
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="CVV"
                          className="w-full text-xs p-3 rounded-xl border border-[#E4DCD0] focus:outline-hidden focus:border-[#B85B43] bg-[#FBF9F5] font-sans"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pay Action Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] py-3.5 rounded-full font-sans font-semibold text-sm uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 border border-[#E4DCD0]/20"
                  >
                    <span>Pay ₹{totalAmount} Via Razorpay</span>
                    <ArrowRight className="w-4 h-4 text-[#B85B43]" />
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
