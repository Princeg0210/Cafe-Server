"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Calendar, Info, MapPin, Utensils } from "lucide-react";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export default function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Menu", href: "/menu", icon: <Utensils className="w-3.5 h-3.5" /> },
    { name: "Book Table", href: "/book-table", icon: <Calendar className="w-3.5 h-3.5" /> },
    { name: "Our Story", href: "/about", icon: <Info className="w-3.5 h-3.5" /> },
    { name: "Location", href: "/contact", icon: <MapPin className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Editorial Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/30 group-hover:border-[#B85B43] transition-all">
            <span className="font-serif italic font-bold text-lg leading-none text-[#B85B43]">J</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-extrabold text-2xl leading-none tracking-wide text-[#261C18]">
              JAADOO <span className="font-serif italic font-normal text-lg text-[#B85B43] ml-0.5">Trattoria</span>
            </span>
            <span className="text-[9px] font-sans tracking-[0.25em] text-[#4A5842] uppercase font-semibold mt-0.5">
              CAFÉ & PIZZERIA • UDAIPUR
            </span>
          </div>
        </Link>

        {/* Desktop Editorial Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F6F3EC] p-1.5 rounded-full border border-[#E4DCD0]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all ${
                  isActive
                    ? "bg-[#261C18] text-[#FBF9F5] shadow-xs"
                    : "text-[#261C18]/70 hover:text-[#261C18] hover:bg-[#E4DCD0]/40"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Running Bill / Cart Button */}
        <button
          onClick={() => onOpenCart && onOpenCart()}
          className="flex items-center gap-2.5 bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase transition-all border border-[#E4DCD0]/30 shadow-xs active:scale-95"
          aria-label="Open Running Bill Cart"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#B85B43]" />
          <span>Bill</span>
          {(cartCount ?? 0) > 0 && (
            <span className="bg-[#B85B43] text-[#FBF9F5] text-[10px] px-2 py-0.5 rounded-full font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-[#F6F3EC] border-t border-[#E4DCD0] px-2 py-1.5">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium tracking-wider uppercase transition-colors ${
                isActive ? "bg-[#261C18] text-[#FBF9F5]" : "text-[#261C18]/70 hover:text-[#261C18]"
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
