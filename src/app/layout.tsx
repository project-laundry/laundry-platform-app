import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NooraCare – Gjør hverdagen renere, lysere, enklere",
  description: "Profesjonell vaskservice med henting og levering i Bergen og Oslo. Spar tid med vår pålitelige klesvask - perfekt for travle familier. Allergivennlige produkter og miljøvennlig vask.",
  keywords: ["vaskeri", "klesvask", "henting og levering", "Bergen", "Oslo", "vaskservice", "profesjonell vask", "allergivennlig", "miljøvennlig"],
  authors: [{ name: "NooraCare" }],
  openGraph: {
    title: "NooraCare – Gjør hverdagen renere, lysere, enklere",
    description: "Profesjonell vaskservice med henting og levering. Spar tid for det som betyr mest.",
    type: "website",
    locale: "no_NO",
  },
  twitter: {
    card: "summary_large_image",
    title: "NooraCare – Gjør hverdagen renere, lysere, enklere",
    description: "Profesjonell vaskservice med henting og levering i Bergen og Oslo.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body
        className={`${cormorant.variable} ${inter.variable} ${geistMono.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
