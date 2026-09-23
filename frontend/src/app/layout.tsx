import type { Metadata } from "next";
import { Poppins, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      <body className={`${poppins.variable} ${barlow.variable} antialiased selection:bg-amber-200/50`}>
        {children}
      </body>
    </html>
  );
}
