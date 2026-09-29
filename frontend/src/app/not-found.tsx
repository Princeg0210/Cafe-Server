import Link from "next/link";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";
import { Utensils, Calendar, Home, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] text-[#261C18] font-sans flex flex-col justify-between">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center my-auto">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#B85B43]/10 border border-[#B85B43]/30 flex items-center justify-center mx-auto mb-6 text-[#B85B43]">
          <span className="font-serif italic font-extrabold text-3xl sm:text-4xl">404</span>
        </div>

        <span className="text-[11px] font-sans font-bold tracking-[0.25em] text-[#4A5842] uppercase bg-[#4A5842]/10 px-4 py-1.5 rounded-full border border-[#4A5842]/20">
          PAGE NOT FOUND • PAGINA NON TROVATA
        </span>

        <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-[#261C18] tracking-tight mt-4 mb-3">
          This Slice Has Wandered Off
        </h1>

        <p className="text-sm sm:text-base font-serif italic text-stone-600 max-w-lg mx-auto mb-8">
          The page or table session you are looking for does not exist, has expired, or was relocated to another corner of our trattoria.
        </p>

        {/* Clear Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#261C18] hover:bg-[#1C1512] text-[#FBF9F5] px-6 py-3 rounded-full font-sans font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 border border-[#E4DCD0]/20"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>

          <Link
            href="/menu"
            className="inline-flex items-center gap-2 bg-[#B85B43] hover:bg-[#A84E38] text-[#FBF9F5] px-6 py-3 rounded-full font-sans font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 border border-[#E4DCD0]/30"
          >
            <Utensils className="w-4 h-4" />
            <span>Explore Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/book-table"
            className="inline-flex items-center gap-2 bg-white hover:bg-stone-50 text-[#261C18] px-6 py-3 rounded-full font-sans font-semibold text-xs tracking-wider uppercase transition-all shadow-2xs active:scale-95 border border-[#E4DCD0]"
          >
            <Calendar className="w-4 h-4 text-[#B85B43]" />
            <span>Book Table</span>
          </Link>
        </div>
      </main>

      <TanFooter />
    </div>
  );
}
