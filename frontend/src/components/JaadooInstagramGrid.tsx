"use client";

import Image from "next/image";
import { Camera, Play, Layers } from "lucide-react";

export default function JaadooInstagramGrid() {
  const posts = [
    {
      id: 1,
      image: "/jaadoo-pizza-twilight.png",
      type: "video",
      alt: "Wood-Fired Neapolitan Pizza at Twilight overlooking Lake Pichola",
      overlayBrand: "WOODFIRED AT TWILIGHT",
      overlaySub: "Lake Pichola Waterfront",
    },
    {
      id: 2,
      image: "/jaadoo-margherita-lakeside.png",
      type: "image",
      alt: "Lakeside Margherita Bufala on Olive Wood Peel",
      overlayBrand: "MARGHERITA CLASSICA",
      overlaySub: "48h Sourdough Fermentation",
    },
    {
      id: 3,
      image: "/jaadoo-pizza-prep.png",
      type: "carousel",
      alt: "Artisan Baker Shaping 48h Fermented Sourdough Base",
      overlayTitle: "ARTISANAL FLOUR AND CRAFT",
      overlaySub: "Hand-stretched with Tipo 00 and San Marzano",
    },
    {
      id: 4,
      image: "/jaadoo-focaccia-rosemary.png",
      type: "image",
      alt: "Freshly Baked Rosemary and Cherry Tomato Focaccia",
      overlayBrand: "ROSEMARY FOCACCIA",
      overlaySub: "Cold-Pressed Garlic Olive Oil",
    },
    {
      id: 5,
      image: "/jaadoo-tiramisu-craft.jpg",
      type: "carousel",
      alt: "Authentic House Tiramisu and Mountain Espresso",
      overlayBrand: "DOLCE TIRAMISU",
      overlaySub: "Valrhona Cocoa and Arabica Extract",
    },
    {
      id: 6,
      image: "/jaadoo-pizza-oven.jpg",
      type: "video",
      alt: "Blazing Wood-Fired Brick Dome Oven",
      overlayBrand: "450°C WOOD OVEN",
      overlaySub: "Baking in 90 Seconds",
    },
  ];

  return (
    <section className="my-16 bg-[#FBF9F5] rounded-xl border border-[#E4DCD0] shadow-xs overflow-hidden">
      {/* Instagram Profile Header */}
      <div className="bg-white px-5 sm:px-6 py-5 border-b border-[#E4DCD0] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar with Story Ring */}
          <a
            href="https://www.instagram.com/jaadoo_pizza_project/"
            target="_blank"
            rel="noopener noreferrer"
            className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 hover:scale-105 transition-transform"
          >
            <Image
              src="/jaadoo-logo-ring.png"
              alt="Jaadoo Pizza Project Official Logo"
              fill
              className="object-contain rounded-full drop-shadow-xs"
              priority
            />
          </a>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/jaadoo_pizza_project/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans font-bold text-base sm:text-lg text-[#140E0A] hover:underline"
              >
                jaadoo_pizza_project
              </a>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                Verified Kitchen
              </span>
            </div>
            <span className="font-serif font-bold text-sm text-[#9E3E26]">
              Jaadoo Pizza Project
            </span>
            <p className="text-xs text-stone-600 font-sans mt-0.5 hidden sm:block">
              Artisanal Italian pizza · 32 Sitaphal ki gali, Ganesh Ghati, Udaipur
            </p>
            <div className="flex items-center gap-3 text-xs text-stone-600 font-sans mt-1">
              <span><strong className="text-stone-900 font-semibold">161</strong> posts</span>
              <span>•</span>
              <span><strong className="text-stone-900 font-semibold">5,792</strong> followers</span>
              <span>•</span>
              <span><strong className="text-stone-900 font-semibold">154</strong> following</span>
            </div>
          </div>
        </div>

        {/* Instagram Direct Link CTA Button */}
        <a
          href="https://www.instagram.com/jaadoo_pizza_project/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9E3E26] hover:bg-[#83321E] text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
          aria-label="Visit Instagram Profile"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span>Follow @jaadoo_pizza_project</span>
        </a>
      </div>

      {/* 6-Photo Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 bg-[#E4DCD0] p-1">
        {posts.map((post) => (
          <div
            key={post.id}
            className="relative aspect-square group overflow-hidden bg-[#261C18] cursor-pointer"
          >
            <Image
              src={post.image}
              alt={post.alt}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Media Type Icon Badge Top-Right */}
            <div className="absolute top-3 right-3 z-10 text-white drop-shadow-md">
              {post.type === "video" && (
                <div className="bg-black/40 backdrop-blur-xs p-1.5 rounded-md">
                  <Play className="w-4 h-4 fill-white text-white" />
                </div>
              )}
              {post.type === "carousel" && (
                <div className="bg-black/40 backdrop-blur-xs p-1.5 rounded-md">
                  <Layers className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Postcard Overlay (Tile 4) */}
            {post.overlayTitle && (
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-4">
                <span className="text-[10px] font-sans text-stone-200 tracking-[0.2em] uppercase mb-1">
                  think About Good Food and Coffee
                </span>
                <h3 className="text-2xl sm:text-3xl font-sans font-extrabold text-white tracking-wider uppercase drop-shadow-lg leading-tight">
                  {post.overlayTitle}
                </h3>
                <p className="text-xs font-serif italic text-amber-200 mt-1">
                  {post.overlaySub}
                </p>
              </div>
            )}

            {/* Brand Overlay (Tile 5) */}
            {post.overlayBrand && (
              <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-2xl sm:text-3xl font-serif font-extrabold text-white tracking-widest uppercase drop-shadow-lg">
                  {post.overlayBrand}
                </h3>
                <p className="text-xs font-sans italic text-stone-200 mt-1">
                  {post.overlaySub}
                </p>
              </div>
            )}

            {/* Hover Darken Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-6 h-6 text-white drop-shadow-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
