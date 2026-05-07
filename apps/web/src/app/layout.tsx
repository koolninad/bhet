import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Amrut Bhet — Video Conferencing",
  description: "Self-hosted video conferencing platform. Create and join meetings securely.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full bg-gray-950 text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
