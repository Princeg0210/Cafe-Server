"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function TanStorySection() {
  return (
    <section className="my-24 space-y-16">
      {/* Editorial Story Block */}
      <div className="bg-[#FBF9F5] rounded-xl p-8 md:p-12 border border-[#E4DCD0] shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Side: Photo */}
        <div className="lg:col-span-6 relative h-[320px] sm:h-[400px] md:h-[440px] rounded-lg overflow-hidden border border-[#E4DCD0]/80">
          <Image
            src="/story-food.jpg"
            alt="Jaadoo Trattoria Artisanal Panini & Pizza"
            fill
            className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
          />
        </div>

        {/* Right Side: Editorial Headline & Story */}
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2">
            <span className="w-6 h-[1px] bg-[#B85B43]/60" />
            <span className="text-xs font-serif tracking-[0.25em] text-[#B85B43] uppercase font-medium">
              OUR HERITAGE
            </span>
            <span className="w-6 h-[1px] bg-[#B85B43]/60" />
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#261C18] leading-tight font-normal">
            If It’s Magic, It’s Jaadoo
          </h2>

          <div className="space-y-4 text-sm text-stone-700 font-sans leading-relaxed">
            <p>
              In 2023, two friends—<strong className="text-[#261C18] font-semibold">Shivank Verma</strong> and <strong className="text-[#261C18] font-semibold">Nishant Mitthal</strong>—set out to build a genuine culinary retreat in Old City Udaipur honoring slow food principles.
            </p>

            <p>
              <strong className="text-[#261C18] font-semibold">Jaadoo Trattoria</strong> celebrates the ritual of 48-hour natural sourdough fermentation using Italian Tipo 00 flour, San Marzano tomato passata, and fresh mozzarella Fior di Latte, paired with wild-harvested Himalayan tisanes.
            </p>

            <p className="font-serif italic text-stone-600 text-sm pt-1">
              “A mindful pause between the aroma of wood-fired baking and panoramic views of Lake Pichola.”
            </p>
          </div>

          <div className="pt-3">
            <Link
              href="/about"
              className="inline-block bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] px-7 py-3 rounded-lg font-serif text-xs uppercase tracking-[0.2em] transition-all shadow-xs active:scale-95"
            >
              DISCOVER OUR STORY
            </Link>
          </div>
        </div>
      </div>

      {/* Postcard Editorial Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            img: "/gallery-1.jpg",
            tagline: "POSTCARD FROM UDAIPUR",
            sub: "A peaceful corner in the historic Old City",
          },
          {
            img: "/gallery-2.jpg",
            tagline: "WOOD-FIRED OVEN",
            sub: "48-hour slow natural sourdough fermentation",
          },
          {
            img: "/gallery-3.jpg",
            tagline: "LAKESIDE SUNSET",
            sub: "Artisanal tiramisu & Lake Pichola views",
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative h-64 md:h-72 rounded-xl overflow-hidden shadow-xs group cursor-pointer border border-[#E4DCD0]"
          >
            <Image
              src={item.img}
              alt={item.tagline}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A120D]/90 via-[#1A120D]/30 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-[#FBF9F5] text-center">
              <h3 className="font-serif font-normal text-lg uppercase tracking-wider text-[#FBF9F5]">
                {item.tagline}
              </h3>
              <p className="text-xs font-serif italic text-[#C88A48] mt-1">
                {item.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
