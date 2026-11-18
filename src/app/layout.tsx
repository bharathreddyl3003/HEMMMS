import type { Metadata } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "HEMMMS - Heavy Equipment Management",
  description: "Monitor and manage RBH 150mm drills.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <TopNav user={session ? { username: session.username, role: session.role } : null} />
          {children}
        </div>
      </body>
    </html>
  );
}
