'use client'

import Navbar from "./components/Navbar"
import Respondr from "./components/Respondr"
import Footer from "./components/Footer"
import { Auth0Provider } from "@auth0/auth0-react"

export default function Home() {
  return (
    <main className="relative bg-gradient-to-b from-[#0a0a0a] via-[#0e0e0e] to-[#1a1919] text-white overflow-hidden">
      <Auth0Provider
        domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
        clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
        authorizationParams={{ redirect_uri: typeof window !== "undefined" ? window.location.origin : "" }}
      >
      {/* animated background shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-[pulse_12s_infinite] w-[60vw] h-[60vw] rounded-full bg-gradient-to-r from-blue-800/20 to-purple-800/20 blur-3xl absolute -top-1/3 -left-1/3"></div>
        <div className="animate-[pulse_20s_infinite] w-[70vw] h-[70vw] rounded-full bg-gradient-to-r from-indigo-800/20 to-pink-800/20 blur-3xl absolute top-1/2 -right-1/3"></div>
      </div>

      <Navbar />
      <Respondr />
      <Footer />
    </Auth0Provider>
    </main>
  )
}
