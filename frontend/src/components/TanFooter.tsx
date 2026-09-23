"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
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
    <footer className="mt-20 bg-[#b86638] text-white pt-16 pb-8 px-6 md:px-12 border-t border-black/10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12">
        
        {/* Column 1: Brand & Logo */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#f5e6d3] text-[#24150e] flex items-center justify-center border-2 border-white/20 shadow-md">
              <Flame className="w-8 h-8 text-[#b86638] fill-[#b86638]" />
            </div>
            <div>
              <span className="font-condensed font-extrabold text-2xl tracking-widest uppercase block leading-none text-white">
                JAADOO UDAIPUR
              </span>
              <span className="text-[11px] font-sans tracking-widest text-[#f5e6d3] uppercase">
                Italian Kitchen Magic
              </span>
            </div>
          </div>
          
          <p className="text-xs text-white/90 leading-relaxed font-sans max-w-sm">
            Welcome to Jaadoo, a cafe that doesn't just serve food—but curates conversations, sparks creativity, and celebrates modern India and its evolving culinary & coffee culture.
          </p>
        </div>

        {/* Column 2: Careers & Contact */}
        <div className="md:col-span-3 space-y-3 font-sans">
          <h4 className="font-condensed font-bold text-lg text-white uppercase tracking-wider border-b border-white/20 pb-1 inline-block">
            CAREERS & CONTACT
          </h4>
          <ul className="space-y-2 text-xs text-white/90">
            <li>ciao@jaadooudaipur.com</li>
            <li>+91 98290 12345</li>
            <li className="pt-2">
              <Link href="/about" className="hover:underline font-semibold text-[#f5e6d3]">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:underline font-semibold text-[#f5e6d3]">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Newsletter & Event */}
        <div className="md:col-span-4 space-y-3 font-sans">
          <h4 className="font-condensed font-bold text-lg text-white uppercase tracking-wider border-b border-white/20 pb-1 inline-block">
            NEWSLETTERS & EVENT
          </h4>
          <p className="text-xs text-white/90">
            Register your email to not miss any news and offers from us
          </p>

          {subscribed ? (
            <div className="bg-[#f5e6d3] text-[#24150e] p-2.5 rounded-lg text-xs font-bold text-center font-sans">
              Thank you for subscribing!
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2 pt-1">
              <input
                type="email"
                required
                placeholder="Email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-white/30 bg-black/10 text-white placeholder-white/60 focus:outline-hidden focus:border-white font-sans"
              />
              <button
                type="submit"
                className="bg-[#f5e6d3] hover:bg-white text-[#24150e] px-5 py-2.5 rounded-lg font-condensed font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex-shrink-0"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Bottom Footer Bar */}
      <div className="max-w-6xl mx-auto pt-6 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/80 font-sans">
        <p className="text-center md:text-left">
          Copyright © JAADOO UDAIPUR (Jazz & Blues Hospitality LLP) 2026 All Rights Reserved.
        </p>

        <div className="flex items-center gap-4">
          <span className="font-condensed font-bold text-sm uppercase text-[#f5e6d3]">Follow Us:</span>
          <a href="#" className="hover:text-[#f5e6d3] transition-colors p-1" aria-label="Facebook">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a href="#" className="hover:text-[#f5e6d3] transition-colors p-1" aria-label="Instagram">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="#" className="hover:text-[#f5e6d3] transition-colors p-1" aria-label="LinkedIn">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
