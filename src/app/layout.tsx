import type { Metadata } from "next";
import { Fraunces, Jost, Geist_Mono } from "next/font/google";
import "./globals.css";

// Brand fonts: Fraunces for headlines and the wordmark, Jost for body and labels.
// Both are variable fonts; opsz lets Fraunces sharpen up at display sizes.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "NooraCare";
const DESCRIPTION =
  "Noora kobler deg med en renser i nabolaget som vasker klærne dine.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "NooraCare" }],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "no_NO",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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
        className={`${fraunces.variable} ${jost.variable} ${geistMono.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
