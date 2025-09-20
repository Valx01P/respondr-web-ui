import localFont from "next/font/local"
import "./globals.css"

export const googleSansCode = localFont({
  src: [
    {
      path: "../public/fonts/GoogleSansCode-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/GoogleSansCode-Light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/GoogleSansCode-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/GoogleSansCode-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-google-sans-code",
  preload: true,
});

export const metadata = {
  title: "Respondr",
  description: "Accident Helper",
  icons: {
    icon: "https://res.cloudinary.com/startup-grind/image/upload/c_fill,dpr_2.0,f_auto,g_center,h_16,q_auto:good,w_16/v1/gcs/platform-data-goog/contentbuilder/GDG_Bevy_Favicon_y29LtMy.png",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${googleSansCode.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
