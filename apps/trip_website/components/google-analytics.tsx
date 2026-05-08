import Script from "next/script"

export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const propertyId = process.env.NEXT_PUBLIC_GA_PROPERTY_ID

  if (!measurementId) {
    if (process.env.NODE_ENV === "development" && propertyId) {
      console.info(`GA4 property ${propertyId} is configured, but NEXT_PUBLIC_GA_MEASUREMENT_ID is missing.`)
    }

    return null
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  )
}
