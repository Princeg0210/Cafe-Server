"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("jaadoo_cookie_consent");
      if (!consent) {
        setShowBanner(true);
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("jaadoo_cookie_consent", "accepted");
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Cookie and Privacy Notice"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-[#261C18]/95 backdrop-blur-md text-[#FBF9F5] p-4 sm:p-5 rounded-2xl border border-[#E4DCD0]/20 shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#4A5842]/20 border border-[#4A5842]/30 text-[#4A5842] shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="space-y-2 text-xs text-stone-300 font-sans leading-relaxed">
          <p className="font-serif font-bold text-sm text-[#FBF9F5]">
            Privacy & Dining Experience
          </p>
          <p>
            We use essential local storage to remember your table ordering session and preferences. We do not track personal profiles across third-party networks. Learn more in our{" "}
            <Link href="/privacy" className="text-[#B85B43] hover:underline font-medium">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="text-[#B85B43] hover:underline font-medium">
              Terms
            </Link>.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleAccept}
              className="bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] px-4 py-1.5 rounded-full font-semibold text-[11px] uppercase tracking-wider transition-all shadow-xs active:scale-95"
            >
              Got It
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-stone-400 hover:text-stone-200 text-[11px] px-2 py-1 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-stone-400 hover:text-stone-200 p-1 shrink-0 -mt-1 -mr-1"
          aria-label="Close Notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
