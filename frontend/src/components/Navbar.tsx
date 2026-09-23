"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ShoppingBag, Calendar, Info, MapPin, Coffee, QrCode } from "lucide-react";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export default function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Menu", href: "/", icon: <Coffee className="w-4 h-4" /> },
    { name: "Book Table", href: "/book-table", icon: <Calendar className="w-4 h-4" /> },
    { name: "Our Story", href: "/about", icon: <Info className="w-4 h-4" /> },
    { name: "Contact", href: "/contact", icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#f7f3ee]/95 backdrop-blur-md border-b border-[#e8ded2] shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Tan Coffee Style Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#24150e] flex items-center justify-center text-[#c88a48] group-hover:scale-105 transition-transform shadow-xs">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="flex flex-col">
            <span className="font-condensed font-extrabold text-2xl leading-none tracking-wider text-[#24150e] uppercase">
              JAADOO <span className="text-[#c88a48]">UDAIPUR</span>
            </span>
            <span className="text-[10px] font-sans tracking-[0.2em] text-[#c88a48] uppercase font-semibold">
              Italian Kitchen & Coffee
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/90 p-1.5 rounded-full border border-[#e8ded2] shadow-2xs">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-[#24150e] text-white shadow-2xs"
                    : "text-gray-600 hover:text-[#24150e] hover:bg-gray-100/60"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Running Bill / Cart Trigger Button */}
        <button
          onClick={() => onOpenCart && onOpenCart()}
          className="flex items-center gap-2.5 bg-[#24150e] hover:bg-[#b91c1c] text-white px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-95"
          aria-label="Open Running Bill Cart"
        >
          <ShoppingBag className="w-4 h-4 text-[#c88a48]" />
          <span>Bill</span>
          {(cartCount ?? 0) > 0 && (
            <span className="bg-[#b91c1c] text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Navigation Links */}
      <div className="md:hidden flex items-center justify-around bg-white/70 border-t border-[#e8ded2] px-2 py-1.5">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                isActive ? "bg-[#24150e] text-white" : "text-gray-600 hover:text-[#24150e]"
              }`}
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
