"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";

interface NavbarProps {
  cartCount?: number;
  onOpenCart?: () => void;
  tableNumber?: string;
}

export default function Navbar({ cartCount, onOpenCart, tableNumber }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Menu", href: "/menu" },
    { name: "Book a Table", href: "/book-table" },
    { name: "Our Story", href: "/about" },
    { name: "Location", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E4DCD0]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Editorial Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#261C18] flex items-center justify-center text-[#FBF9F5] border border-[#B85B43]/40 group-hover:border-[#B85B43] transition-all shrink-0">
            <span className="font-serif italic font-bold text-lg leading-none text-[#B85B43]">J</span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-serif font-extrabold text-xl sm:text-2xl leading-tight tracking-wide text-[#261C18] truncate">
              JAADOO <span className="font-serif italic font-normal text-base sm:text-lg text-[#B85B43] ml-0.5">Trattoria</span>
            </span>
            <span className="text-[9px] font-sans tracking-[0.2em] text-[#4A5842] uppercase font-semibold leading-none mt-0.5">
              CAFÉ & PIZZERIA • UDAIPUR
            </span>
          </div>
        </Link>

        {/* Desktop Typographic Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-medium tracking-[0.18em] uppercase transition-colors relative py-1 ${
                  isActive
                    ? "text-[#261C18] font-semibold"
                    : "text-[#261C18]/65 hover:text-[#B85B43]"
                }`}
              >
                {link.name}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#B85B43]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Table Badge + Cart / Bill */}
        <div className="flex items-center gap-3 shrink-0">
          {tableNumber && (
            <div className="px-3 py-1 rounded-md bg-[#4A5842]/10 border border-[#4A5842]/20 text-[#4A5842] text-[11px] font-mono font-bold tracking-wider uppercase">
              {tableNumber}
            </div>
          )}

          {onOpenCart && (
            <button
              onClick={() => onOpenCart()}
              className="flex items-center gap-2 bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all shadow-xs active:scale-95 shrink-0"
              aria-label="Open Running Bill Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#B85B43]" />
              <span>Bill</span>
              {(cartCount ?? 0) > 0 && (
                <span className="bg-[#B85B43] text-[#FBF9F5] text-[10px] px-1.5 py-0.2 rounded font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center justify-center gap-5 bg-[#F6F3EC] border-t border-[#E4DCD0]/70 px-4 py-2.5 overflow-x-auto no-scrollbar">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[11px] tracking-wider uppercase whitespace-nowrap transition-colors ${
                isActive
                  ? "text-[#261C18] font-bold border-b border-[#B85B43]"
                  : "text-[#261C18]/70 hover:text-[#261C18]"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
