"use client";

import { motion } from "framer-motion";
import { MapPin, Navigation, Car, Clock, Phone, ExternalLink } from "lucide-react";

export default function LocationBrewStation() {
  return (
    <section className="my-16 bg-white rounded-3xl p-6 md:p-10 border border-[#e8ded2] shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#24150e]/10 text-[#24150e] px-3.5 py-1 rounded-full text-xs font-condensed font-bold uppercase tracking-widest mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#c88a48]" />
            <span>Brew Station Finder</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-condensed font-extrabold text-[#24150e] uppercase tracking-wide">
            Find Us in Old City, Udaipur
          </h2>
        </div>

        <a
          href="https://maps.google.com/?q=Gangaur+Ghat+Udaipur"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[#24150e] hover:bg-[#b91c1c] text-white px-5 py-3 rounded-2xl font-condensed font-bold text-xs uppercase tracking-wider transition-colors shadow-sm self-start md:self-auto"
        >
          <Navigation className="w-4 h-4 text-[#c88a48]" />
          <span>Open Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Address Card */}
        <div className="bg-[#f7f3ee] rounded-2xl p-5 border border-[#e8ded2] space-y-2">
          <div className="flex items-center gap-2 text-[#c88a48]">
            <MapPin className="w-5 h-5" />
            <h4 className="font-condensed font-bold text-lg text-[#24150e] uppercase tracking-wide">Station Address</h4>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-sans">
            Near Gangaur Ghat, Old City Lanes, Udaipur, Rajasthan 313001.
          </p>
          <p className="text-[11px] text-gray-500 font-sans italic pt-1">
            2-minute walk from historic Lake Pichola waterfront.
          </p>
        </div>

        {/* Parking & Access */}
        <div className="bg-[#f7f3ee] rounded-2xl p-5 border border-[#e8ded2] space-y-2">
          <div className="flex items-center gap-2 text-[#c88a48]">
            <Car className="w-5 h-5" />
            <h4 className="font-condensed font-bold text-lg text-[#24150e] uppercase tracking-wide">Parking & Access</h4>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-sans">
            Park at <strong>Chandpole Gate Parking</strong> or <strong>Jagdish Temple Square</strong>.
          </p>
          <p className="text-[11px] text-amber-900 bg-amber-100/70 p-2 rounded-lg border border-amber-200/60 font-sans mt-2">
            💡 Old City lanes are pedestrian-friendly. Enjoy a scenic 3-minute walk to the cafe.
          </p>
        </div>

        {/* Timings & Support */}
        <div className="bg-[#f7f3ee] rounded-2xl p-5 border border-[#e8ded2] space-y-2">
          <div className="flex items-center gap-2 text-[#c88a48]">
            <Clock className="w-5 h-5" />
            <h4 className="font-condensed font-bold text-lg text-[#24150e] uppercase tracking-wide">Brewing Hours</h4>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed font-sans">
            <strong>Mon – Sun:</strong> 11:30 AM – 10:30 PM
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600 font-sans pt-2 border-t border-[#e8ded2]">
            <Phone className="w-3.5 h-3.5 text-[#c88a48]" />
            <span>+91 98290 12345 (Station Helpdesk)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
