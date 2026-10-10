"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";

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
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-22 relative flex items-center justify-center">
        
        {/* Left Side: Brand Logo + Typographic Navigation */}
        <div className="flex items-center gap-6 lg:gap-10 min-w-0">
          {/* Editorial Brand Logo */}
          <Link href="/" className="flex items-center gap-3.5 group shrink-0 min-w-0">
            <div className="relative w-20 h-12 sm:w-24 sm:h-14 rounded-xl overflow-hidden bg-white border-2 border-[#9E3E26]/40 group-hover:border-[#9E3E26] transition-all shrink-0 shadow-md">
              <img
                src="/jaadoo_logo.jpg"
                alt="Jaadoo Pizza Project"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-serif font-extrabold text-xl sm:text-2xl leading-tight tracking-wide text-[#140E0A] truncate">
                JAADOO <span className="font-serif italic font-normal text-base sm:text-lg text-[#9E3E26] ml-0.5">Pizza Project</span>
              </span>
              <span className="text-[10px] font-sans tracking-[0.22em] text-[#3B2C23] uppercase font-bold leading-none mt-0.5">
                ARTISANAL PIZZERIA · UDAIPUR
              </span>
            </div>
          </Link>

          {/* Desktop Typographic Navigation (Left-Aligned next to Logo) */}
          {showNavigation && <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-sans font-bold tracking-[0.18em] uppercase transition-colors relative py-1 ${
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
          </nav>}
        </div>

        {/* Right Actions: Table Badge + Cart / Bill */}
        <div className="absolute right-4 sm:right-6 flex items-center gap-3 shrink-0">
          {tableNumber && (
            <div className="px-3 py-1 rounded-md bg-[#1B3618]/10 border border-[#1B3618]/25 text-[#1B3618] text-[11px] font-mono font-bold tracking-wider uppercase">
              {tableNumber}
            </div>
          )}

          {onOpenCart && (
            <button
              onClick={() => onOpenCart()}
              className="flex items-center gap-2 bg-[#140E0A] hover:bg-[#9E3E26] text-[#FAF8F5] px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all shadow-xs active:scale-95 shrink-0"
              aria-label="Open Running Bill Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#E8A563]" />
              <span>Bill</span>
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
      {showNavigation && <div className="md:hidden flex items-center justify-center gap-6 bg-[#FAF7F2] border-t border-[#DDD3C4] px-5 py-2.5 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[11px] font-sans tracking-wider uppercase whitespace-nowrap transition-colors ${
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
