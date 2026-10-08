"use client";

import { MapPin, Navigation, Car, Clock, Phone, ExternalLink, Compass } from "lucide-react";

export default function LocationBrewStation() {
  return (
    <section className="my-16 bg-[#FAF7F2] rounded-xl p-6 md:p-10 border border-[#DDD3C4] shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-[#DDD3C4] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-[#9E3E26] text-xs font-sans font-bold uppercase tracking-widest mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#9E3E26]" />
            <span>Old City Udaipur • Gangaur Ghat</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-[#140E0A]">
            Find Us in Old City, Udaipur
          </h2>
        </div>

        <a
          href="https://maps.google.com/?q=Gangaur+Ghat+Udaipur"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[#140E0A] hover:bg-[#8F351F] text-[#FAF8F5] px-6 py-3 rounded-lg font-sans font-bold text-xs tracking-wider uppercase transition-all shadow-xs self-start md:self-auto border border-[#140E0A]"
        >
          <Navigation className="w-4 h-4 text-[#E8A563]" />
          <span>Open Google Maps</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Address Card */}
        <div className="bg-[#F2ECE1] rounded-lg p-6 border border-[#DDD3C4] space-y-2">
          <div className="flex items-center gap-2 text-[#9E3E26]">
            <MapPin className="w-4 h-4" />
            <h4 className="font-serif font-bold text-lg text-[#140E0A]">Station Address</h4>
          </div>
          <p className="text-sm text-[#1A120B] leading-relaxed font-sans font-medium">
            Near Gangaur Ghat, Old City Lanes, Udaipur, Rajasthan 313001.
          </p>
          <p className="text-xs text-[#3E2C20] font-sans font-normal pt-1.5 border-t border-[#DDD3C4]/60">
            2-minute walk from historic Lake Pichola waterfront.
          </p>
        </div>

        {/* Parking & Access */}
        <div className="bg-[#F2ECE1] rounded-lg p-6 border border-[#DDD3C4] space-y-2">
          <div className="flex items-center gap-2 text-[#9E3E26]">
            <Car className="w-4 h-4" />
            <h4 className="font-serif font-bold text-lg text-[#140E0A]">Parking and Access</h4>
          </div>
          <p className="text-sm text-[#1A120B] leading-relaxed font-sans font-medium">
            Park at <strong className="text-[#140E0A] font-bold">Chandpole Gate Parking</strong> or <strong className="text-[#140E0A] font-bold">Jagdish Temple Square</strong>.
          </p>
          <p className="text-xs font-sans font-semibold text-[#1F2E1A] bg-[#E3EBDD] p-3 rounded-lg border border-[#A5BC99] mt-2.5 leading-relaxed flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1F2E1A] shrink-0" />
            <span>Old City lanes are pedestrian-friendly. Enjoy a scenic 3-minute walk to our cafe.</span>
          </p>
        </div>

        {/* Timings & Support */}
        <div className="bg-[#F2ECE1] rounded-lg p-6 border border-[#DDD3C4] space-y-2">
          <div className="flex items-center gap-2 text-[#9E3E26]">
            <Clock className="w-4 h-4" />
            <h4 className="font-serif font-bold text-lg text-[#140E0A]">Brewing Hours</h4>
          </div>
          <p className="text-sm text-[#1A120B] leading-relaxed font-sans">
            <strong className="text-[#140E0A] font-bold">Monday – Sunday:</strong> 11:30 AM – 10:30 PM
          </p>
          <div className="flex items-center gap-2 text-sm text-[#140E0A] font-sans font-semibold pt-3 border-t border-[#DDD3C4]">
            <Phone className="w-4 h-4 text-[#9E3E26]" />
            <span>+91 98290 12345 (Station Helpdesk)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
