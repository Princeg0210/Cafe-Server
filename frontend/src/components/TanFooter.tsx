"use client";

import Link from "next/link";
import { useState } from "react";

export default function TanFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 3000);
      setEmail("");
    }
  };

  return (
    <footer className="mt-20 bg-[#261C18] text-[#FBF9F5] pt-16 pb-8 px-6 md:px-12 border-t border-[#E4DCD0]/20">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12">
        
        {/* Column 1: Brand & Identity */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B85B43] text-[#FBF9F5] flex items-center justify-center font-serif font-bold text-xl italic border border-[#E4DCD0]/30 shadow-xs">
              J
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-wide block leading-none text-[#FBF9F5]">
                JAADOO <span className="font-serif italic text-[#B85B43] font-normal text-lg">Trattoria</span>
              </span>
              <span className="text-[9px] font-sans tracking-[0.25em] text-emerald-400 uppercase font-semibold">
                CAFÉ & PIZZERIA • UDAIPUR EST. 2024
              </span>
            </div>
          </div>
          
          <p className="text-xs text-stone-300 leading-relaxed font-sans max-w-sm">
            Authentic wood-fired Neapolitan pizza with 48-hour natural dough fermentation and wild-harvested Himalayan tisanes in the heart of Old City Udaipur.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-sans text-stone-400">
            <Link href="/privacy" className="hover:text-stone-200 underline underline-offset-2 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-stone-200 underline underline-offset-2 transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>

        {/* Column 2: Contacts & Quick Links */}
        <div className="md:col-span-3 space-y-3 font-sans">
          <h3 className="font-serif font-bold text-base text-[#FBF9F5] border-b border-[#E4DCD0]/20 pb-1 inline-block">
            Explore & Contact
          </h3>
          <ul className="space-y-2 text-xs text-stone-300">
            <li className="font-mono text-stone-200">ciao@jaadooudaipur.com</li>
            <li className="font-mono text-stone-200">+91 98290 12345</li>
            <li className="pt-2">
              <Link href="/menu" className="hover:text-[#B85B43] transition-colors font-medium text-stone-200">
                Artisanal Menu
              </Link>
            </li>
            <li>
              <Link href="/book-table" className="hover:text-[#B85B43] transition-colors font-medium text-stone-200">
                Book a Table
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-[#B85B43] transition-colors font-medium text-stone-200">
                Our Story & Heritage
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-[#B85B43] transition-colors font-medium text-stone-200">
                Brew Station & Location
              </Link>
            </li>
            <li className="pt-1">
              <Link href="/pos" className="hover:text-[#B85B43] transition-colors font-medium text-stone-400 text-[11px] font-mono">
                Staff POS Terminal →
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Newsletter */}
        <div className="md:col-span-4 space-y-3 font-sans">
          <h3 className="font-serif font-bold text-base text-[#FBF9F5] border-b border-[#E4DCD0]/20 pb-1 inline-block">
            Newsletters & Events
          </h3>
          <p className="text-xs text-stone-300">
            Register your email to receive updates on seasonal chef specials and acoustic evening sessions.
          </p>

          {subscribed ? (
            <div className="bg-[#4A5842]/40 border border-emerald-500/40 text-emerald-200 p-2.5 rounded-xl text-xs font-semibold text-center font-sans">
              Grazie! Thank you for subscribing.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 pt-1">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="Email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-full border border-[#E4DCD0]/20 bg-[#1C1512] text-[#FBF9F5] placeholder-stone-400 focus:outline-hidden focus:border-[#B85B43] font-sans"
              />
              <button
                type="submit"
                className="bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] px-5 py-2.5 rounded-full font-sans font-semibold text-xs uppercase tracking-wider transition-all shadow-xs shrink-0 border border-[#E4DCD0]/20 active:scale-95"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="max-w-6xl mx-auto pt-6 border-t border-[#E4DCD0]/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400 font-sans">
        <p className="text-center md:text-left">
          Copyright © JAADOO TRATTORIA (Jazz & Blues Hospitality LLP [PLACEHOLDER]) {new Date().getFullYear()}. All Rights Reserved.
        </p>

        <div className="flex items-center gap-4">
          <span className="font-serif italic text-xs text-stone-300">Follow Us:</span>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#B85B43] transition-colors p-1" aria-label="Instagram">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
