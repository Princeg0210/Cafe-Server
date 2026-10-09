import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";
import Link from "next/link";
import { Shield, Lock, Eye, FileText, ArrowLeft, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Jaadoo Udaipur",
  description: "Learn how Jaadoo Udaipur (Jazz & Blues Hospitality LLP) collects, handles, and protects your personal and reservation information.",
  alternates: {
    canonical: "https://cafe-piza.vercel.app/privacy",
  },
};

export default function PrivacyPolicyPage() {
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
          <div className="inline-flex items-center gap-2 bg-[#4A5842]/10 text-[#4A5842] px-3.5 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Official Policy Document</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-extrabold text-[#261C18] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-serif italic mt-2">
            Last Updated: September 2026 • Effective for Jaadoo - The Pizza Project (Jazz and Blues Hospitality LLP)
          </p>
        </header>

        {/* Legal Policy Content */}
        <div className="prose prose-stone max-w-none space-y-8 text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-[#B85B43]" />
              1. Information We Collect
            </h2>
            <p>
              When you interact with our dining and reservation systems at <strong>Jaadoo - The Pizza Project</strong> (operated by <strong>Jazz and Blues Hospitality LLP</strong>), we collect minimal essential information necessary to serve you:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li><strong>Reservation Details:</strong> Name, contact phone number, email address (optional), guest count, requested date, and time slot.</li>
              <li><strong>Dining and Order Activity:</strong> Table session tokens, ordered menu items, timestamps, and dietary preferences specified during table ordering.</li>
              <li><strong>Payment Verification References:</strong> Bank UPI Transaction Reference (UTR) or payment reference numbers provided to verify table deposit credits. We do <em>not</em> store banking passwords, UPI PINs, or raw credit/debit card credentials.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#4A5842]" />
              2. How We Use Your Information
            </h2>
            <p>We utilize the collected information strictly for authentic hospitality and café operations:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-stone-600">
              <li>To confirm, manage, and schedule your table reservations and pizza dough production allocation.</li>
              <li>To transmit Kitchen Order Tickets (KOT) directly to our wood-fired pizza kitchen thermal printer.</li>
              <li>To accurately apply reservation advance deposits (₹200 per guest) as billing credits against your final dining bill.</li>
              <li>To dispatch automated reservation reminders via SMS/WhatsApp/Email prior to your scheduled booking.</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#B85B43]" />
              3. Data Security & Storage
            </h2>
            <p>
              All customer transmissions are encrypted using Transport Layer Security (HTTPS/WSS). Operational dashboard access is restricted to verified café staff via Role-Based Access Control (RBAC). We never sell, rent, or lease customer data to third-party advertisers.
            </p>
          </section>

          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4DCD0] shadow-2xs space-y-3">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-[#261C18] flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#4A5842]" />
              4. Contact and Privacy Inquiries
            </h2>
            <p>
              If you have any questions regarding our privacy practices or wish to request data correction/deletion, please contact our management team:
            </p>
            <div className="bg-[#F8F5F0] p-4 rounded-xl border border-[#E4DCD0] text-xs font-mono space-y-1 text-stone-800">
              <p><strong>Entity:</strong> Jaadoo - The Pizza Project (Jazz and Blues Hospitality LLP)</p>
              <p><strong>Address:</strong> 32 Sitaphal ki gali, Ganesh Ghati, Old City, Udaipur, Rajasthan 313001, India</p>
              <p><strong>Email:</strong> privacy@jaadooudaipur.com [PLACEHOLDER]</p>
              <p><strong>Phone:</strong> +91 98290 12345 [PLACEHOLDER]</p>
            </div>
          </section>
        </div>
      </main>

      <TanFooter />
    </div>
  );
}
