import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";
import Link from "next/link";
import { Scale, Clock, Receipt, Utensils, ArrowLeft, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions | Jaadoo Udaipur",
  description: "Terms and conditions, table reservation advance deposit rules, cancellation policy, and dining guidelines for Jaadoo Udaipur.",
  alternates: {
    canonical: "https://cafe-piza.vercel.app/terms",
  },
};

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B85B43] hover:text-[#A84E38] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="border-b border-[#E4DCD0] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 bg-[#B85B43]/10 text-[#B85B43] px-3.5 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider mb-3">
            <Scale className="w-3.5 h-3.5" />
            <span>Dining & Booking Terms</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-extrabold text-[#261C18] tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-serif italic mt-2">
            Last Updated: September 2026 • Jaadoo Trattoria (Jazz & Blues Hospitality LLP [PLACEHOLDER])
          </p>
        </header>

        {/* Terms Content */}
        <div className="prose prose-stone max-w-none space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
          
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <Receipt className="w-4 h-4 text-[#B85B43]" />
              1. Table Reservations & Advance Deposit
            </h2>
            <p>
              To ensure fair access to seating and protect daily small-batch Neapolitan pizza dough production:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>A refundable reservation advance deposit of <strong>₹200 per guest</strong> is required to confirm online table bookings.</li>
              <li><strong>100% Billing Credit:</strong> The entire deposit amount (e.g. ₹800 for 4 guests) is automatically credited in full against your final food and beverage dining tab upon seating.</li>
              <li>Temporary holds are maintained for 7 minutes to allow payment completion before the reserved slot is automatically released to other guests.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#4A5842]" />
              2. Cancellation & Rescheduling Policy
            </h2>
            <p>
              Because our dough undergoes a strict 48-hour natural fermentation cycle, daily kitchen capacity is reserved in advance for confirmed bookings:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li><strong>Cancellation Cutoff:</strong> Cancellations or reschedule requests made at least <strong>2 hours prior</strong> to the scheduled booking time slot are eligible for a full refund or date adjustment.</li>
              <li><strong>No-Shows:</strong> If guests fail to arrive within 20 minutes of the reserved time slot without prior notice, the reservation may be marked as NO-SHOW, and the advance deposit is forfeited to compensate for unused kitchen preparation.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <Utensils className="w-4 h-4 text-[#B85B43]" />
              3. QR Table Ordering & Dining Experience
            </h2>
            <p>
              When seated at our café in Old City Udaipur:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>Each dining table features an individual secure QR code allowing contactless digital menu browsing and order dispatch directly to our thermal kitchen printer (KOT).</li>
              <li>All menu items are 100% vegetarian, prepared in our wood-fired oven using imported Italian flour and San Marzano tomatoes.</li>
              <li>Final bill settlement can be completed via UPI, credit/debit card, or cash with the cashier terminal before checkout.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#4A5842]" />
              4. Governing Law & Dispute Resolution
            </h2>
            <p>
              These Terms & Conditions are governed by and construed in accordance with the laws of India. Any legal proceedings or disputes arising from café services shall be subject to the exclusive jurisdiction of the competent courts in Udaipur, Rajasthan, India [PLACEHOLDER].
            </p>
          </section>
        </div>
      </main>

      <TanFooter />
    </div>
  );
}
