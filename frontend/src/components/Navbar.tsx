"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ShoppingCart, Calendar, Info, PhoneCall, Utensils } from "lucide-react";

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
}

export default function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Menu", href: "/", icon: <Utensils className="w-4 h-4" /> },
    { name: "Book Table", href: "/book-table", icon: <Calendar className="w-4 h-4" /> },
    { name: "Our Story", href: "/about", icon: <Info className="w-4 h-4" /> },
    { name: "Contact", href: "/contact", icon: <PhoneCall className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#fcfaf8]/90 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-cafe-gold/10 flex items-center justify-center group-hover:bg-cafe-gold/20 transition-colors">
            <Flame className="w-5 h-5 text-cafe-red" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg leading-none tracking-widest text-cafe-dark uppercase">
              JAADOO
            </span>
            <span className="text-[10px] font-sans tracking-widest text-cafe-gold uppercase font-semibold">
              Udaipur
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/80 p-1.5 rounded-full border border-gray-200/60 shadow-2xs">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-cafe-dark text-white shadow-2xs"
                    : "text-gray-600 hover:text-cafe-dark hover:bg-gray-100/60"
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Cart Trigger Button */}
        <button
          onClick={onOpenCart}
          className="flex items-center gap-2.5 bg-cafe-dark text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-cafe-red transition-all shadow-sm active:scale-95"
          aria-label="Open Running Bill Cart"
        >
          <ShoppingCart className="w-4 h-4 text-cafe-gold" />
          <span className="font-serif font-semibold">Bill</span>
          {cartCount > 0 && (
            <span className="bg-cafe-red text-white text-xs px-2 py-0.5 rounded-full font-sans font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Navigation Links */}
      <div className="md:hidden flex items-center justify-around bg-white/60 border-t border-gray-100 px-2 py-1.5">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-cafe-dark text-white" : "text-gray-600 hover:text-cafe-dark"
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
