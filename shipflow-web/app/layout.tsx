import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { RegionModeProvider } from "@/contexts/RegionModeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "SendiFlash | Domestic shipping for selected markets",
  description:
    "Compare rates, create labels, and track domestic shipments in selected markets with SendiFlash.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <RegionModeProvider>
          <AuthProvider>{children}</AuthProvider>
        </RegionModeProvider>
      </body>
    </html>
  );
}
