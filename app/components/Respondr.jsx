'use client'

import { useState } from "react"
import { Mic, Video } from "lucide-react"

const Respondr = () => {
  const [note, setNote] = useState("")

  return (
    <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 min-h-[90vh] relative">
      {/* hero heading */}
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          instant accident analysis
        </h1>
        <p className="text-gray-300 text-lg md:text-xl line-clamp-3">
          record your accident, add details with voice or text, and get
          immediate guidance based on severity, location, and time
        </p>
      </div>

      {/* stacked action area */}
      <div className="mt-14 flex flex-col gap-8 w-full max-w-2xl">
        {/* video feed placeholder */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-[#1c1c1c]/80 backdrop-blur-sm h-[40vh] md:h-[50vh] relative">
          <p className="text-gray-500 text-sm mb-4">video feed / camera input</p>
          <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-medium">
            <Video size={18} /> start recording
          </button>
        </div>

        {/* description input */}
        <div className="flex flex-col gap-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional: describe what happened..."
            className="resize-none rounded-xl border border-gray-700 bg-[#1c1c1c]/80 backdrop-blur-sm p-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
          />
          <div className="flex items-center justify-between gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:opacity-90 transition-all text-sm">
              <Mic size={16} /> use voice instead
            </button>
            <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-semibold text-sm">
              analyze
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Respondr
