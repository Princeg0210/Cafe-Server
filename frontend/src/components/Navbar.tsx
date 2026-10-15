"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import BrandTitle from "@/components/BrandTitle";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
  tableNumber?: string;
  showNavigation?: boolean;
}

export default function Navbar({ cartCount, onOpenCart, tableNumber, showNavigation = true }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Menu", href: "/menu" },
    { name: "Book a Table", href: "/book-table" },
    { name: "Our Story", href: "/about" },
    { name: "Location", href: "/location" },
    { name: "Contact Us", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0]/80 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-22 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        
        {/* Left Side: Desktop Typographic Navigation */}
        <div className="flex items-center justify-start min-w-0">
          {showNavigation && (
            <nav className="hidden md:flex items-center gap-5 lg:gap-7">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs font-sans font-bold tracking-[0.16em] uppercase transition-colors relative py-1 touch-manipulation whitespace-nowrap ${
                      isActive
                        ? "text-[#140E0A]"
                        : "text-[#3B2C23] hover:text-[#9E3E26]"
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#9E3E26]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
          {tableNumber && (
            <div className="md:hidden px-2 py-0.5 rounded-md bg-[#1B3618]/10 border border-[#1B3618]/25 text-[#1B3618] text-[9px] font-mono font-bold tracking-wider uppercase shrink-0">
              {tableNumber}
            </div>
          )}
        </div>

        {/* Center: Editorial Brand Logo + Jaadoo Pizza Project Title */}
        <div className="flex items-center justify-center min-w-0">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group shrink-0 min-w-0 touch-manipulation">
            <div className="relative w-14 h-9 sm:w-22 sm:h-13 rounded-xl overflow-hidden bg-white border-2 border-[#9E3E26]/40 group-hover:border-[#9E3E26] transition-all shrink-0 shadow-md">
              <img
                src="/jaadoo_logo.jpg"
                alt="Jaadoo Pizza Project"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <BrandTitle className="font-poppins font-bold tracking-wide text-[#5F3F6D] text-base sm:text-2xl leading-tight truncate text-center sm:text-left" />
              <span className="text-[9px] sm:text-[11px] font-sans tracking-wide text-[#B6623B] font-bold leading-none mt-0.5 text-center truncate">
                Con o senza avanti!
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions: Table Badge (Desktop) + Cart / Bill */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
          {tableNumber && (
            <div className="hidden md:inline-flex px-2.5 sm:px-3 py-1 rounded-md bg-[#1B3618]/10 border border-[#1B3618]/25 text-[#1B3618] text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase">
              {tableNumber}
            </div>
          )}

          {onOpenCart && (
            <button
              onClick={() => onOpenCart()}
              className="flex items-center gap-2 bg-[#140E0A] hover:bg-[#9E3E26] text-[#FAF8F5] px-3 sm:px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all shadow-xs active:scale-95 shrink-0 touch-manipulation select-none cursor-pointer"
              aria-label="Open Running Bill Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#E8A563]" />
              <span className="hidden sm:inline">Bill</span>
              {(cartCount ?? 0) > 0 && (
                <span className="bg-[#9E3E26] text-[#FAF8F5] text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      {showNavigation && <div className="md:hidden flex items-center justify-start sm:justify-center gap-6 bg-[#FAF7F2] border-t border-[#DDD3C4] px-5 py-2.5 overflow-x-auto no-scrollbar touch-pan-x">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[11px] font-sans tracking-wider uppercase whitespace-nowrap transition-colors touch-manipulation py-1 ${
                isActive
                  ? "text-[#140E0A] font-extrabold border-b-2 border-[#9E3E26]"
                  : "text-[#3B2C23] font-bold hover:text-[#140E0A]"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>}
    </header>
  );
}
