import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BlendByteOS",
  description: "Internal operations app for clients, content and tasks.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "BlendByteOS",
    description: "Internal operations app for clients, content and tasks.",
    images: [{ url: "/brand/blendbyteos-icon.png", width: 550, height: 550 }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-blendbyte-pathname") ?? "";
  const isAccessPage = pathname.startsWith("/access");
  const isInvest2030PublicPage = pathname.startsWith("/invest2030");

  return (
    <html
      lang="pt"
      className={`${manrope.variable} ${geistMono.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full overflow-x-hidden">
        {isAccessPage || isInvest2030PublicPage ? children : <AppShell>{children}</AppShell>}
      </body>
    </html>
  );
}
