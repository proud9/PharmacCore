import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Headings: Playfair Display (variable 400–900, roman + italic). Body: Source Sans 3.
// Both are self-hosted by next/font.
const display = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "PharmaCore | A connected pharmaceutical industry",
  description:
    "PharmaCore brings retail pharmacies, wholesale pharmacies, hospitals, and clinics together in one system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans font-normal`}>{children}</body>
    </html>
  );
}
