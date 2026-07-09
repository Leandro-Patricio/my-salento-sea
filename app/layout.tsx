import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Salento Sea",
  description: "App made for choosing the next place to swim in Salento, Italy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>)
{
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh w-dvw antialiased overflow-hidden`}
    >
      <body className="h-full w-full min-h-[screen]  min-w-[320px]">{children}</body>
    </html>
  );
}
