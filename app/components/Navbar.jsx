import Image from "next/image"
import Link from "next/link"
import AuthButtons from "./AuthButtons"

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-4 md:px-8 py-4 bg-[#0a0a0a]/80 backdrop-blur-md text-white sticky top-0 z-50 border-b border-white/10">
      {/* logo and brand */}
      <div className="flex items-center gap-2">
        <Image
          src="/svgs/logo.svg"
          alt="Respondr Logo"
          width={36}
          height={36}
          priority
        />
        <Link href="/" className="text-xl md:text-2xl font-bold tracking-tight">
          Respondr
        </Link>
      </div>

      {/* nav links */}
      <div className="hidden md:flex gap-8 text-sm font-medium items-center">
        <Link href="#features" className="hover:text-blue-400 transition-colors">
          features
        </Link>
        <Link href="#about" className="hover:text-blue-400 transition-colors">
          about
        </Link>
        <Link href="#contact" className="hover:text-blue-400 transition-colors">
          contact
        </Link>

        {/* auth buttons */}
        <AuthButtons />
      </div>
    </nav>
  )
}

export default Navbar
