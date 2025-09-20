import localFont from "next/font/local"
import AuthProvider from "./AuthProvider"
import "./globals.css"

export const googleSansCode = localFont({
  src: [
    { path: "../public/fonts/GoogleSansCode-Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/GoogleSansCode-Light.woff", weight: "300", style: "normal" },
    { path: "../public/fonts/GoogleSansCode-Bold.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/GoogleSansCode-Bold.woff", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-google-sans-code",
  preload: true,
})

export const metadata = {
  title: "Respondr",
  description: "Accident Helper",
  icons: {
    icon: "https://res.cloudinary.com/dqo1uzz0i/image/upload/v1758348744/respondr_logo_p8gdks.png",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${googleSansCode.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
