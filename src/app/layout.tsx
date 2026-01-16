import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "HackVento Judging Dashboard",
  description: "Evaluate HackVento teams swiftly with focused insights and scoring."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.className} bg-slate-950 text-cloud`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
