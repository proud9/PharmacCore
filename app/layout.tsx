import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaCore | A connected pharmaceutical industry",
  description:
    "PharmaCore brings retail pharmacies, wholesale pharmacies, hospitals, and clinics together in one system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans font-normal">{children}</body>
    </html>
  );
}
