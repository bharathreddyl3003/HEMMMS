import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
import { getSession } from "@/lib/auth";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const heading = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HEMMMS — Heavy Earth Moving Machinery Management",
  description: "Fleet telemetry, daily HMR register, scheduled maintenance, and spares inventory for Shovels & Drills.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  return (
    <html lang="en" className={`${sans.variable} ${heading.variable} ${mono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="app-container">
          <TopNav user={session ? { username: session.username, role: session.role } : null} />
          <div id="main-content" tabIndex={-1} style={{ flex: 1, outline: 'none' }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
