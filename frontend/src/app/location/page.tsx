"use client";

import { motion } from "framer-motion";
import { MapPin, Car, Footprints, Landmark } from "lucide-react";
import Navbar from "@/components/Navbar";
import TanFooter from "@/components/TanFooter";
import LocationBrewStation from "@/components/LocationBrewStation";

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#140E0A] font-sans flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-16">
          {/* Header Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-10"
          >
            <div className="inline-flex items-center gap-2 text-[#9E3E26] text-xs font-sans font-bold uppercase tracking-[0.22em] mb-2.5">
              <MapPin className="w-3.5 h-3.5 text-[#9E3E26]" />
              <span>Old City • Ganesh Ghati</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#140E0A] tracking-tight">
              Location & Directions
            </h1>
            <p className="text-[#3B2C23] text-sm sm:text-base mt-3 font-sans leading-relaxed">
              Tucked away at 32 Sitaphal ki gali in the historic heritage lanes of Ganesh Ghati, Old City Udaipur.
            </p>
          </motion.div>

          {/* LocationBrewStation component with embedded Google Map */}
          <LocationBrewStation />

          {/* Quick Arrival Guide */}
          <div className="mt-12 bg-white rounded-2xl p-6 sm:p-8 border border-[#DDD3C4] shadow-xs">
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#140E0A] mb-4">
              How to Reach Us
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#9E3E26] font-bold">
                  <Footprints className="w-4 h-4" />
                  <span>From Jagdish Temple / Chandpole</span>
                </div>
                <p className="text-xs text-[#3B2C23] leading-relaxed">
                  Stroll through the scenic Old City lanes towards Ganesh Ghati. Turn into Sitaphal ki gali (House No. 32).
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#9E3E26] font-bold">
                  <Car className="w-4 h-4" />
                  <span>By Auto / Cab</span>
                </div>
                <p className="text-xs text-[#3B2C23] leading-relaxed">
                  Ask the driver to drop you at <strong className="font-semibold text-[#140E0A]">Chandpole Parking</strong> or <strong className="font-semibold text-[#140E0A]">Jagdish Chowk</strong>. Four-wheelers cannot enter narrow heritage lanes.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#9E3E26] font-bold">
                  <Landmark className="w-4 h-4" />
                  <span>Near Gangaur Ghat Waterfront</span>
                </div>
                <p className="text-xs text-[#3B2C23] leading-relaxed">
                  Just a 2-minute walk from the lake ghats and Bagore Ki Haveli. Perfect for a cozy dining stop after lake sightseeing.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <TanFooter />
    </div>
  );
}
