import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { GoogleAnalytics } from "@/components/google-analytics"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://media.trip.example"),
  applicationName: "Trip Media",
  title: {
    default: "Trip Media | Partner Portal",
    template: "%s | Trip Media",
  },
  description: "Plan, launch, and monitor in-trip media campaigns with Trip / Taxi Assist.",
  keywords: [
    "Trip Media",
    "Taxi Assist Media",
    "in-trip advertising",
    "South Africa advertising",
    "ride hailing media",
    "partner campaigns",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Trip Media | Partner Portal",
    description: "Plan, launch, and monitor in-trip media campaigns with Trip / Taxi Assist.",
    url: "/",
    siteName: "Trip Media",
    type: "website",
    locale: "en_ZA",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Trip Media",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Trip Media | Partner Portal",
    description: "Plan, launch, and monitor in-trip media campaigns with Trip / Taxi Assist.",
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
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  )
}
