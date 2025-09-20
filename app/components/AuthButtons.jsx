"use client"

import { useAuth0 } from "@auth0/auth0-react"
import Image from "next/image"
import { useState } from "react"

const AuthButtons = () => {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0()
  const [menuOpen, setMenuOpen] = useState(false)

  // While Auth0 is loading (checking authentication state), we can return a placeholder or nothing
  if (isLoading) {
    return (
      <button className="px-4 py-2 rounded-lg bg-gray-500 cursor-not-allowed text-sm" disabled>
        Loading...
      </button>
    )
  }

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

  // If authenticated, show the user avatar and a dropdown menu
  return (
    <div className="relative">
      <button onClick={() => setMenuOpen(!menuOpen)} className="cursor-pointer">
        {user && (
          <Image
            src={user.picture}
            alt={user.name}
            width={36}
            height={36}
            className="rounded-full border border-white/20"
          />
        )}
      </button>
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-lg bg-[#1c1c1c] border border-gray-700 shadow-lg">
          <button
            onClick={() => {
              logout({ logoutParams: { returnTo: window.location.origin } })
              setMenuOpen(false)
            }}
            className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthButtons
