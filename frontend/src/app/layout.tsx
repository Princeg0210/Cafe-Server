import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond, Grenze_Gotisch } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const grenzeGotisch = Grenze_Gotisch({
  variable: "--font-gothic",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Jaadoo Udaipur | Specialty Italian Kitchen & Coffee Magic",
  description: "Authentic Wood-fired Pizza, Artisanal Coffee & Himalayan Tisanes in Old City, Udaipur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${cormorant.variable} ${grenzeGotisch.variable} antialiased selection:bg-[#B85B43]/20`}
      >
        {children}
      </body>
    </html>
  );
}
