import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { GoogleAnalytics } from "@/components/google-analytics"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://trip.example"),
  applicationName: "Trip",
  title: {
    default: "Trip | Safe rides, clear earning paths, in-trip media",
    template: "%s | Trip",
  },
  description:
    "Trip helps South Africans move and earn with verified drivers, flexible payments, and partner advertising built for real trips.",
  keywords: [
    "Trip",
    "Trip",
    "South Africa ride hailing",
    "verified drivers",
    "driver earnings",
    "Trip Media",
    "in-trip advertising",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Trip",
    description: "Move and earn with verification and payments that fit South Africa.",
    url: "/",
    siteName: "Trip",
    type: "website",
    locale: "en_ZA",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Trip",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Trip",
    description: "Move and earn with verification and payments that fit South Africa.",
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <SiteFooter />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
