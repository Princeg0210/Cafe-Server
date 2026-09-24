"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Calendar, Info, MapPin, Utensils } from "lucide-react";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
  tableNumber?: string;
}

export default function Navbar({ cartCount, onOpenCart, tableNumber }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Menu", href: "/menu", icon: <Utensils className="w-3.5 h-3.5" /> },
    { name: "Book Table", href: "/book-table", icon: <Calendar className="w-3.5 h-3.5" /> },
    { name: "Our Story", href: "/about", icon: <Info className="w-3.5 h-3.5" /> },
    { name: "Location", href: "/contact", icon: <MapPin className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0] shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Editorial Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/30 group-hover:border-[#B85B43] transition-all shrink-0 shadow-2xs">
            <span className="font-serif italic font-bold text-base sm:text-lg leading-none text-[#B85B43]">J</span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-serif font-extrabold text-lg sm:text-2xl leading-snug tracking-wide text-[#261C18] truncate">
              JAADOO <span className="font-serif italic font-normal text-base sm:text-lg text-[#B85B43] ml-0.5">Trattoria</span>
            </span>
            <span className="text-[8px] sm:text-[9px] font-sans tracking-[0.2em] sm:tracking-[0.25em] text-[#4A5842] uppercase font-semibold leading-tight">
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
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all whitespace-nowrap ${
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

        {/* Right Actions: Table Number Badge + Bill Button (if onOpenCart is provided) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {tableNumber && (
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#4A5842]/10 border border-[#4A5842]/30 text-[#4A5842] text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase shadow-2xs">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{tableNumber}</span>
            </div>
          )}

          {/* Running Bill / Cart Button */}
          {onOpenCart && (
            <button
              onClick={() => onOpenCart()}
              className="flex items-center gap-1.5 sm:gap-2 bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider sm:tracking-widest uppercase transition-all border border-[#E4DCD0]/30 shadow-xs active:scale-95 shrink-0"
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
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar - Single Line, Horizontally Centered, No Wrapping */}
      <div className="md:hidden flex items-center justify-center gap-1 bg-[#F6F3EC] border-t border-[#E4DCD0] px-2 py-1.5 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap transition-all shrink-0 ${
                isActive ? "bg-[#261C18] text-[#FBF9F5] shadow-xs" : "text-[#261C18]/70 hover:text-[#261C18]"
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
