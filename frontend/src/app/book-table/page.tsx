"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Sparkles,
  CheckCircle2,
  Check,
  ShieldCheck,
  QrCode,
  Smartphone,
  Lock,
  Copy,
  Receipt,
  Wallet,
  AlertCircle,
  Timer,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";

const ADVANCE_PER_GUEST = 200; // ₹200 deposit per person, 100% adjustable against dining tab
const DEFAULT_MERCHANT_UPI_ID = "9460555743-2@ybl";

export default function BookTablePage() {
  // Form State (Dynamic current date in local time)
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [time, setTime] = useState("19:30");
  const [guests, setGuests] = useState(3);

  // Customer Contact State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // UPI Temporary Hold & Payment Portal State
  const [isHoldingSlot, setIsHoldingSlot] = useState(false);
  const [heldReservationId, setHeldReservationId] = useState<number | null>(null);
  const [, setHoldExpiresAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(420);
  const [upiUri, setUpiUri] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiUtr, setUpiUtr] = useState("");
  const [customerVpa, setCustomerVpa] = useState("");
  const [heldUpiId, setHeldUpiId] = useState<string>(DEFAULT_MERCHANT_UPI_ID);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [holdExpired, setHoldExpired] = useState(false);

  // Success Confirmation State
  const [isBooked, setIsBooked] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<number | null>(null);
  const [confirmedUtr, setConfirmedUtr] = useState<string>("");
  const [paidAdvance, setPaidAdvance] = useState<number>(0);

  const totalAdvance = guests * ADVANCE_PER_GUEST;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getApiBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      const isLocal =
        h === "localhost" ||
        h === "127.0.0.1" ||
        h.startsWith("192.168.") ||
        h.startsWith("10.") ||
        h.endsWith(".local");

      if (isLocal) {
        return `http://${h}:8000`;
      }
      return process.env.NEXT_PUBLIC_API_URL || "https://cafe-piza-api.onrender.com";
    }
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  };

  // Handle active hold countdown timer
  useEffect(() => {
    if (showUpiModal && secondsRemaining > 0 && !isBooked) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setHoldExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showUpiModal, secondsRemaining, isBooked]);

  // Real-time polling while payment modal is open:
  // Detects when the café's Android SMS listener confirms the payment automatically
  useEffect(() => {
    if (!showUpiModal || !heldReservationId || isBooked || holdExpired) return;

    const pollInterval = setInterval(async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/v1/reservations/${heldReservationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "CONFIRMED" || data.payment_status === "PAID") {
            clearInterval(pollInterval);
            setConfirmedBookingId(data.id);
            setConfirmedUtr(data.payment_reference || "AUTO-VERIFIED-UPI");
            setPaidAdvance(data.advance_amount || totalAdvance);
            setShowUpiModal(false);
            setIsBooked(true);
          } else if (data.status === "EXPIRED" || data.status === "CANCELLED") {
            clearInterval(pollInterval);
            setHoldExpired(true);
            setSubmitError("Hold time expired. The reservation slot has been released.");
          }
        }
      } catch {
        // silent polling catch
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [showUpiModal, heldReservationId, isBooked, holdExpired, totalAdvance]);

  // Step 1: Request temporary 7-minute HOLD and generate dynamic UPI QR
  const handleInitiateHoldAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setHoldExpired(false);

    if (!name.trim()) {
      setSubmitError("Please provide your full name.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setSubmitError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsHoldingSlot(true);
    const apiBase = getApiBase();

    try {
      const res = await fetch(`${apiBase}/api/v1/reservations/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: 1,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          guest_count: guests,
          reservation_date: date,
          time_slot: time,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setSubmitError(
            errData.detail || "Capacity is currently full for this slot. Please choose another time."
          );
        } else {
          setSubmitError(errData.detail || "Unable to hold reservation slot. Please check details and try again.");
        }
        setIsHoldingSlot(false);
        return;
      }

      const holdData = await res.json();
      setHeldReservationId(holdData.reservation_id);
      setHoldExpiresAt(holdData.hold_expires_at);
      setHeldUpiId(holdData.upi_id || DEFAULT_MERCHANT_UPI_ID);
      setSecondsRemaining(holdData.seconds_remaining || 420);
      setUpiUri(holdData.upi_uri);

      // Generate real dynamic UPI QR Code image
      const qrData = await QRCode.toDataURL(holdData.upi_uri, {
        width: 320,
        margin: 2,
        color: { dark: "#24150e", light: "#ffffff" },
      });
      setQrCodeDataUrl(qrData);

      setShowUpiModal(true);
    } catch (err: unknown) {
      console.error("Hold reservation error:", err);
      const msg = err instanceof Error ? err.message : "Unable to reach server";
      setSubmitError(`Connection error (${msg}). Please verify network connection and try again.`);
    } finally {
      setIsHoldingSlot(false);
    }
  };

  // Step 2: Customer enters 12-digit UPI UTR and verifies payment before hold expires
  const handleVerifyUpiPayment = async () => {
    if (!heldReservationId) return;
    setSubmitError(null);

    const cleanUtr = upiUtr.trim();
    if (!cleanUtr || cleanUtr.length < 4) {
      setSubmitError("Please enter the 12-digit UPI reference / UTR number from your payment app.");
      return;
    }

    setIsVerifyingUpi(true);
    const apiBase = getApiBase();

    try {
      const res = await fetch(`${apiBase}/api/v1/reservations/${heldReservationId}/verify-upi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upi_utr: cleanUtr,
          customer_upi_vpa: customerVpa.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 410) {
          setHoldExpired(true);
          setSubmitError("Hold time expired before verification. The reservation has been released.");
        } else if (res.status === 402 || errData.detail?.includes("PAYMENT_NOT_VERIFIED")) {
          setSubmitError(
            errData.detail ||
              "Bank credit not found yet. Please make sure payment was debited from your UPI app, or wait 10-20 seconds for bank settlement and retry."
          );
        } else if (res.status === 409 && errData.detail?.includes("UTR_ALREADY_USED")) {
          setSubmitError(
            errData.detail ||
              "This UPI Reference / UTR has already been used and exhausted for another booking. Please complete a new UPI payment for this reservation."
          );
        } else {
          setSubmitError(errData.detail || "Unable to verify UPI transaction. Please check the UTR and try again.");
        }
        setIsVerifyingUpi(false);
        return;
      }

      const verifiedData = await res.json();
      setConfirmedBookingId(verifiedData.id);
      setConfirmedUtr(cleanUtr);
      setPaidAdvance(verifiedData.advance_amount || totalAdvance);
      setShowUpiModal(false);
      setIsBooked(true);
    } catch {
      setSubmitError("Gateway verification error. Please retry.");
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  // Step 3: Customer cancels hold or releases table slot early
  const handleCancelHold = async () => {
    if (heldReservationId) {
      const apiBase = getApiBase();
      try {
        await fetch(`${apiBase}/api/v1/reservations/${heldReservationId}/cancel-hold`, {
          method: "POST",
        });
      } catch {
        // silent
      }
    }
    setShowUpiModal(false);
    setHeldReservationId(null);
    setUpiUtr("");
    setHoldExpired(false);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(heldUpiId || DEFAULT_MERCHANT_UPI_ID);
    setIsCopiedUpi(true);
    setTimeout(() => setIsCopiedUpi(false), 2000);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#24150e] font-sans">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-[#24150e]/10 text-[#24150e] px-4 py-1.5 rounded-full text-xs font-condensed font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-[#c88a48]" />
            <span>Online Table Reservations • Guaranteed Seating</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide">
            Reserve Your Table
          </h1>
          <p className="text-gray-600 font-sans text-sm md:text-base mt-2">
            Experience Neapolitan Woodfired Magic with panoramic views of Lake Pichola.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Prepayment deposit of ₹{ADVANCE_PER_GUEST}/guest is <strong>100% credited</strong> to your dining bill.
            </span>
          </div>
        </motion.div>

        {isBooked ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 md:p-12 border border-[#e8ded2] shadow-xl text-center space-y-6"
          >
            <div className="relative inline-block">
              <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
                UPI Payment Verified • Table Officially Reserved
              </span>
              <h2 className="font-condensed text-4xl font-extrabold text-[#24150e] uppercase tracking-wide mt-3">
                Booking Confirmed!
              </h2>
              <p className="text-gray-600 font-sans text-base mt-2">
                Thank you <span className="font-bold text-[#24150e]">{name}</span>! Your table has been officially reserved for{" "}
                <span className="font-semibold text-[#b91c1c]">{date}</span> at{" "}
                <span className="font-semibold text-[#b91c1c]">{time}</span>.
              </p>
            </div>

            {/* Official Digital Receipt Card */}
            <div className="bg-linear-to-b from-amber-50/90 to-orange-50/50 p-6 rounded-2xl border border-amber-200/80 text-left text-xs font-sans text-amber-950 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#c88a48]" />
                  <span className="font-bold uppercase tracking-wider text-xs text-[#24150e]">
                    Official Table Booking & Payment Receipt
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                  PAID ₹{paidAdvance}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {confirmedBookingId && (
                  <p>
                    🔖 <strong>Booking Ref:</strong> #RES-{String(confirmedBookingId).padStart(4, "0")}
                  </p>
                )}
                <p>
                  ⚡ <strong>UPI UTR / Ref:</strong> {confirmedUtr}
                </p>
                <p>
                  💳 <strong>Payment Route:</strong> Direct NPCI UPI (0% Fee)
                </p>
                <p>
                  🪑 <strong>Table Assignment:</strong> Allocated by Host upon arrival
                </p>
                <p>
                  👥 <strong>Party Size:</strong> {guests} Guests
                </p>
                <p>
                  📅 <strong>Reserved For:</strong> {date} at {time}
                </p>
                <p>
                  📱 <strong>Customer Phone:</strong> {phone}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/70 bg-white/70 p-3 rounded-xl flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-relaxed text-gray-700">
                  <strong>100% Bill Credit Guarantee:</strong> Present this receipt or your phone number to the cashier when
                  paying your dining bill. The full <strong>₹{paidAdvance}</strong> deposit will be deducted directly from
                  your check.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto border border-gray-300 bg-white hover:bg-gray-50 text-[#24150e] px-6 py-2.5 rounded-full text-xs font-condensed font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Print / Save Receipt
              </button>
              <button
                onClick={() => {
                  setIsBooked(false);
                  setName("");
                  setPhone("");
                  setUpiUtr("");
                }}
                className="w-full sm:w-auto bg-[#24150e] text-white px-6 py-2.5 rounded-full text-xs font-condensed font-bold uppercase tracking-wider hover:bg-[#b91c1c] transition-colors cursor-pointer"
              >
                Book Another Table
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleInitiateHoldAndPay}
            className="bg-white rounded-3xl p-6 md:p-10 border border-[#e8ded2] shadow-lg space-y-8"
          >
            {/* Step 1: Date, Time & Guests */}
            <div>
              <span className="text-xs uppercase font-mono tracking-widest text-[#c88a48] font-bold block mb-3">
                Step 1: Date, Time & Guest Count
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-sans">
                    <CalendarIcon className="w-4 h-4 text-[#c88a48]" /> Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-sans">
                    <Clock className="w-4 h-4 text-[#c88a48]" /> Time Slot
                  </label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  >
                    <option value="12:30">12:30 PM (Lunch)</option>
                    <option value="14:00">02:00 PM (Lunch)</option>
                    <option value="18:30">06:30 PM (Sunset)</option>
                    <option value="19:30">07:30 PM (Dinner)</option>
                    <option value="21:00">09:00 PM (Late Dinner)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 font-sans">
                    <Users className="w-4 h-4 text-[#c88a48]" /> Guests (₹200 / person)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                      className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-amber-100 border border-gray-300 font-extrabold text-lg text-[#24150e] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      aria-label="Decrease guests"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center font-bold text-base bg-gray-50 border border-gray-200 rounded-xl py-2.5 font-condensed text-[#24150e]">
                      {guests} {guests === 1 ? "Guest" : "Guests"}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuests((g) => Math.min(12, g + 1))}
                      className="w-11 h-11 rounded-xl bg-gray-100 hover:bg-amber-100 border border-gray-300 font-extrabold text-lg text-[#24150e] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                      aria-label="Increase guests"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center justify-between">
                    <span>{guests} × ₹200 = <strong>₹{totalAdvance}</strong> deposit</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">Bill Credit</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 italic font-sans">
                    This deposit will be adjusted against your final café bill.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Contact Info */}
            <div className="pt-6 border-t border-gray-100">
              <span className="text-xs uppercase font-mono tracking-widest text-[#c88a48] font-bold block mb-3">
                Step 2: Contact Details
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block font-sans">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Verma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block font-sans">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#c88a48] bg-gray-50/50 font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Advance Deposit Summary Pill */}
            <div className="p-4 bg-linear-to-r from-amber-50 to-orange-50/40 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#24150e]">
                  <Wallet className="w-4 h-4 text-[#c88a48]" />
                  <span>Advance Booking Deposit Required</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5">
                  ₹{ADVANCE_PER_GUEST} × {guests} {guests === 1 ? "Guest" : "Guests"} = <strong>₹{totalAdvance}</strong>{" "}
                  (100% credited against your final dining bill)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 block uppercase font-mono tracking-wider">Payable Now</span>
                <span className="text-xl font-extrabold text-[#b91c1c] font-condensed">₹{totalAdvance}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-sans flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Action button triggers temporary hold & opens UPI portal */}
            <button
              type="submit"
              disabled={isHoldingSlot}
              className="w-full bg-[#24150e] hover:bg-[#b91c1c] disabled:opacity-50 text-white py-4 rounded-2xl font-condensed font-bold text-xl uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isHoldingSlot ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                  <span>Checking Capacity & Creating 7-Min Hold...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-amber-300" />
                  <span>PROCEED TO PAYMENT (₹{totalAdvance})</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-400 font-sans">
              🔒 0% Fee Direct UPI Payment • 7-Min Guaranteed Hold • 100% Dining Tab Credit
            </p>
          </motion.form>
        )}
      </main>

      {/* ========================================================= */}
      {/* 7-MINUTE TEMPORARY HOLD & DIRECT UPI PAYMENT MODAL         */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showUpiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[94vh] overflow-y-auto border border-[#e8ded2] shadow-2xl relative flex flex-col"
            >
              {/* Header with Live Expiration Countdown */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/70 rounded-t-3xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#24150e] text-white flex items-center justify-center shadow-xs">
                    <QrCode className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-condensed font-bold text-xl text-[#24150e] uppercase tracking-wide">
                      Reservation Deposit
                    </h3>
                    <p className="text-[11px] text-gray-600 font-sans">
                      {guests} {guests === 1 ? "Guest" : "Guests"} • {date} at {time}
                    </p>
                  </div>
                </div>

                {/* Hold Expiration Timer Pill */}
                <div className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 ${
                  holdExpired
                    ? "bg-red-100 text-red-700 border-red-300"
                    : secondsRemaining < 60
                    ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                    : "bg-white text-[#24150e] border-amber-300 shadow-xs"
                }`}>
                  <Timer className="w-3.5 h-3.5 text-[#c88a48]" />
                  <span>{holdExpired ? "EXPIRED" : formatTimer(secondsRemaining)}</span>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {holdExpired ? (
                  <div className="p-6 text-center space-y-3 bg-red-50/70 border border-red-200 rounded-2xl">
                    <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
                    <h4 className="font-condensed font-bold text-2xl text-red-900 uppercase">
                      Temporary Hold Expired
                    </h4>
                    <p className="text-xs text-gray-600 font-sans leading-relaxed">
                      The 7-minute temporary hold has elapsed, and the reservation slot has been released back to availability.
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelHold}
                      className="mt-2 bg-[#24150e] text-white px-5 py-2 rounded-xl text-xs font-condensed font-bold uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Amount Banner */}
                    <div className="bg-[#24150e] text-white p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300 block">
                          RESERVATION DEPOSIT
                        </span>
                        <span className="text-xs text-gray-300 font-sans">
                          {guests} {guests === 1 ? "Guest" : "Guests"} × ₹200 • {date} at {time}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-extrabold font-condensed text-amber-400">₹{totalAdvance}</span>
                        <span className="text-[10px] text-emerald-300 block font-medium">✓ Adjusted against final bill</span>
                      </div>
                    </div>

                    {/* Live Listening Status Banner */}
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-sans text-amber-950">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <p className="leading-snug">
                        <strong>Waiting for payment confirmation...</strong> Once paid via any UPI app, our café listener will automatically confirm your reservation.
                      </p>
                    </div>

                    {/* Dynamic UPI QR Code Display */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                      {qrCodeDataUrl ? (
                        <div className="bg-white p-2.5 rounded-2xl border border-gray-300 shadow-sm shrink-0 flex flex-col items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrCodeDataUrl}
                            alt="Dynamic UPI QR Code"
                            className="w-36 h-36 rounded-xl object-contain"
                          />
                          <span className="text-[9px] font-mono text-gray-500 mt-1 uppercase font-bold">
                            Scan with any UPI App
                          </span>
                        </div>
                      ) : (
                        <div className="w-36 h-36 bg-gray-200 rounded-2xl flex items-center justify-center animate-pulse">
                          <QrCode className="w-8 h-8 text-gray-400" />
                        </div>
                      )}

                      <div className="space-y-2.5 text-left w-full">
                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                          Pay with any UPI App:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {["Google Pay", "PhonePe", "Paytm", "BHIM", "CRED"].map((app) => (
                            <span
                              key={app}
                              className="text-[10px] font-semibold bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-700"
                            >
                              {app}
                            </span>
                          ))}
                        </div>

                        {/* Direct Mobile UPI Intent Link Button */}
                        {upiUri && (
                          <a
                            href={upiUri}
                            className="inline-flex items-center justify-center gap-1.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-condensed font-bold uppercase tracking-wider transition-colors shadow-xs"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Open in UPI App (Mobile)</span>
                            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                          </a>
                        )}

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                            Official Café UPI ID:
                          </label>
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs font-mono bg-white border border-gray-200 px-2.5 py-1.5 rounded-xl font-bold text-[#24150e] select-all">
                              {heldUpiId || DEFAULT_MERCHANT_UPI_ID}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyUpi}
                              className="p-1.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-100 text-xs text-gray-700 flex items-center gap-1 cursor-pointer"
                            >
                              {isCopiedUpi ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[10px]">{isCopiedUpi ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* UTR Input Section */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                      <div>
                        <label className="text-xs font-bold text-[#24150e] uppercase tracking-wider block font-sans mb-1">
                          Step 2: Enter 12-Digit UPI Reference / UTR
                        </label>
                        <p className="text-[11px] text-gray-600 font-sans mb-2">
                          After making the ₹{totalAdvance} payment in your UPI app, enter the 12-digit UTR/Ref number from the receipt:
                        </p>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 426819283741 or UPI Ref"
                          value={upiUtr}
                          onChange={(e) => setUpiUtr(e.target.value)}
                          className="w-full text-sm p-3 rounded-xl border border-gray-300 bg-white font-mono focus:outline-hidden focus:border-[#c88a48] tracking-widest text-[#24150e]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block font-sans mb-1">
                          Your UPI ID / VPA (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. yourname@oksbi"
                          value={customerVpa}
                          onChange={(e) => setCustomerVpa(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-hidden focus:border-[#c88a48]"
                        />
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-sans flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        disabled={isVerifyingUpi || !upiUtr.trim()}
                        onClick={handleVerifyUpiPayment}
                        className="w-full bg-[#24150e] hover:bg-[#b91c1c] disabled:opacity-50 text-white py-3.5 rounded-2xl font-condensed font-bold text-lg uppercase tracking-wider transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isVerifyingUpi ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                            <span>Verifying UPI Payment...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>Verify Payment & Confirm Reservation</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCancelHold}
                        className="w-full text-center text-xs text-gray-500 hover:text-red-700 font-sans py-1 transition-colors cursor-pointer"
                      >
                        Cancel & Release Hold
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TanFooter />
    </div>
  );
}
