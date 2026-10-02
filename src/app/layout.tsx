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
  title: {
    default: "TrayVoice — School Cafeteria Feedback",
    template: "%s | TrayVoice",
  },
  description:
    "Turn everyday student feedback into better school meals and clearer cafeteria decisions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistSans.variable + " " + geistMono.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
