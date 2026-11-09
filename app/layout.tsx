import type { Metadata, Viewport } from "next";
import { body, pixel } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blush Booth · a photo booth for you and your online friends",
  description: "Snap cute photo strips with your friends online. Pick a theme, set a timer, and strike a pose.",
};

export const viewport: Viewport = {
  themeColor: "#ff4fa3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
