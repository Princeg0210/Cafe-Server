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
            src="/jaadoo-margherita-lakeside.png"
            alt="Jaadoo Trattoria Artisanal Lakeside Pizza"
            fill
            className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
          />
        </div>

        {/* Right Side: Editorial Headline and Story */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <span className="font-serif italic text-sm text-[#9E3E26] tracking-widest font-normal block mb-1">
              La Nostra Storia · Est. 2023 · Udaipur
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#140E0A] leading-tight font-bold">
              If It’s Magic, It’s Jaadoo
            </h2>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-[#1A110B] font-sans leading-relaxed">
            <p>
              In 2023, two friends—<strong className="text-[#140E0A] font-bold">Shivank Verma</strong> and <strong className="text-[#140E0A] font-bold">Nishant Mitthal</strong>—set out to build a genuine culinary retreat in Old City Udaipur honoring slow food principles.
            </p>

            <p>
              <strong className="text-[#140E0A] font-bold">Jaadoo Pizza Project</strong> celebrates the ritual of 48-hour natural sourdough fermentation using Italian Tipo 00 flour, San Marzano tomato passata, and fresh mozzarella Fior di Latte, paired with wild-harvested Himalayan tisanes.
            </p>

            <blockquote className="text-base sm:text-lg text-[#8F351F] font-serif font-semibold italic pt-2 pl-4 border-l-3 border-[#8F351F]/60">
              “A mindful pause between the aroma of wood-fired baking and panoramic views of Lake Pichola.”
            </blockquote>
          </div>

          <div className="pt-3">
            <Link
              href="/about"
              className="inline-block bg-[#140E0A] hover:bg-[#8F351F] text-[#FAF8F5] px-8 py-3.5 rounded-lg font-sans font-bold text-xs uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95"
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
            sub: "Artisanal tiramisu and Lake Pichola views",
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative h-64 md:h-72 rounded-xl border border-[#DDD3C4] overflow-hidden shadow-xs group cursor-pointer"
          >
            <Image
              src={item.img}
              alt={item.tagline}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120D0A]/95 via-[#120D0A]/40 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-center">
              <h3 className="font-serif font-bold text-lg uppercase tracking-wider text-white drop-shadow-md">
                {item.tagline}
              </h3>
              <p className="text-xs font-sans font-semibold text-[#F4D3B4] mt-1.5 drop-shadow-sm tracking-wide">
                {item.sub}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
