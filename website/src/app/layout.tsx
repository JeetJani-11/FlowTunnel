// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
import { ClientOnly } from "@/components/ui/clientOnly";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/ui/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TunnelPro – Secure Tunnels",
  description:
    "Expose your local web server to the internet with secure tunnels.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Render dark/light logic only on client */}
        <ClientOnly>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="h-full flex flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
            </div>
          </ThemeProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
