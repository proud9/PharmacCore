import type { Metadata } from "next";
import { Schibsted_Grotesk, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Headings: Schibsted Grotesk. Body: Source Sans 3. Both self-hosted by next/font.
const display = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "Parallax | Medicine supply, kept in order",
  description:
    "The trading network for medicine supply in Zambia: manufacturers, wholesalers, pharmacies, hospitals, clinics, schools and NGOs ask for quotes, place orders and keep stock, each in a private account.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans font-normal`}>{children}</body>
    </html>
  );
}
