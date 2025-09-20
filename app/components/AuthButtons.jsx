"use client"

import { useAuth0 } from "@auth0/auth0-react"
import Image from "next/image"
import { useState } from "react"

const AuthButtons = () => {
  const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => loginWithRedirect()}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-medium text-sm cursor-pointer"
      >
        Log In
      </button>
    )
  }

  return (
    <div className="relative">
      <button onClick={() => setMenuOpen(!menuOpen)} className="cursor-pointer">
        <Image
          src={user.picture}
          alt={user.name}
          width={36}
          height={36}
          className="rounded-full border border-white/20"
        />
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg bg-[#1c1c1c] border border-gray-700 shadow-lg">
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 cursor-pointer"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthButtons
