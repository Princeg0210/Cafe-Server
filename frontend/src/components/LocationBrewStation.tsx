"use client";

import { MapPin, Navigation, Car, Clock, Phone, ExternalLink } from "lucide-react";

export default function LocationBrewStation() {
  return (
    <section className="my-16 bg-[#FBF9F5] rounded-3xl p-6 md:p-10 border border-[#E4DCD0] shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#E4DCD0] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#4A5842]/10 text-[#4A5842] px-3.5 py-1 rounded-full text-xs font-sans font-semibold uppercase tracking-widest mb-2 border border-[#4A5842]/20">
            <MapPin className="w-3.5 h-3.5 text-[#B85B43]" />
            <span>Find Us • Location Finder</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#261C18]">
            Find Us in Old City, Udaipur
          </h2>
        </div>

        <a
          href="https://maps.google.com/?q=Gangaur+Ghat+Udaipur"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[#261C18] hover:bg-[#B85B43] text-[#FBF9F5] px-5 py-3 rounded-full font-sans font-semibold text-xs tracking-wider uppercase transition-all shadow-xs self-start md:self-auto border border-[#E4DCD0]/30"
        >
          <Navigation className="w-4 h-4 text-[#B85B43]" />
          <span>Open Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Address Card */}
        <div className="bg-[#F6F3EC] rounded-2xl p-6 border border-[#E4DCD0] space-y-2">
          <div className="flex items-center gap-2 text-[#B85B43]">
            <MapPin className="w-4 h-4" />
            <h4 className="font-serif font-bold text-lg text-[#261C18]">Station Address</h4>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-sans">
            Near Gangaur Ghat, Old City Lanes, Udaipur, Rajasthan 313001.
          </p>
          <p className="text-[11px] text-stone-500 font-sans italic pt-1">
            2-minute walk from historic Lake Pichola waterfront.
          </p>
        </div>

        {/* Parking & Access */}
        <div className="bg-[#F6F3EC] rounded-2xl p-6 border border-[#E4DCD0] space-y-2">
          <div className="flex items-center gap-2 text-[#B85B43]">
            <Car className="w-4 h-4" />
            <h4 className="font-serif font-bold text-lg text-[#261C18]">Parking & Access</h4>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-sans">
            Park at <strong>Chandpole Gate Parking</strong> or <strong>Jagdish Temple Square</strong>.
          </p>
          <p className="text-[11px] text-[#261C18] bg-[#4A5842]/10 p-2.5 rounded-xl border border-[#4A5842]/20 font-sans mt-2">
            🌿 Old City lanes are pedestrian-friendly. Enjoy a scenic 3-minute walk to our cafe.
          </p>
        </div>

        {/* Timings & Support */}
        <div className="bg-[#F6F3EC] rounded-2xl p-6 border border-[#E4DCD0] space-y-2">
          <div className="flex items-center gap-2 text-[#B85B43]">
            <Clock className="w-4 h-4" />
            <h4 className="font-serif font-bold text-lg text-[#261C18]">Brewing Hours</h4>
          </div>
          <p className="text-xs text-stone-700 leading-relaxed font-sans">
            <strong>Monday – Sunday:</strong> 11:30 AM – 10:30 PM
          </p>
          <div className="flex items-center gap-2 text-xs text-stone-600 font-sans pt-3 border-t border-[#E4DCD0]">
            <Phone className="w-3.5 h-3.5 text-[#B85B43]" />
            <span>+91 98290 12345 (Station Helpdesk)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
