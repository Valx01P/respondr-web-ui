'use client'

import { useState, useRef, useEffect } from "react"
import { Mic, Video, Upload } from "lucide-react"

const Respondr = () => {
  const [note, setNote] = useState("")
  const [recording, setRecording] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const liveStreamRef = useRef(null)
  const stopTimeoutRef = useRef(null)
  const streamRef = useRef(null) // keep stream reference alive

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
      }
    }
  }, [videoPreview])

  const startRecording = async () => {
    try {
      // Clear any previous video state
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
        setVideoPreview(null)
      }
      setVideoFile(null)

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setRecording(true)

      // Use setTimeout to ensure the video element is rendered
      setTimeout(() => {
        if (liveStreamRef.current) {
          liveStreamRef.current.srcObject = stream
          liveStreamRef.current.play().catch(() => {})
        }
      }, 100)

      mediaRecorderRef.current = new MediaRecorder(stream, { 
        mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
      })
      chunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const file = new File([blob], "recording.webm", { type: "video/webm" })
        setVideoFile(file)
        setVideoPreview(URL.createObjectURL(blob))

        // stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorderRef.current.start()

      // force stop at 20s
      stopTimeoutRef.current = setTimeout(() => {
        stopRecording()
      }, 20000)
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Could not start recording. Please check camera permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      clearTimeout(stopTimeoutRef.current)
    }
  }

  const handleUploadChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Check file type first
      if (!file.type.startsWith('video/')) {
        alert("Please select a valid video file.")
        return
      }
      
      // Clear any previous video state
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
        setVideoPreview(null)
      }
      setVideoFile(null)

      const url = URL.createObjectURL(file)
      const videoEl = document.createElement("video")
      videoEl.preload = "metadata"
      videoEl.src = url
      
      videoEl.onloadedmetadata = () => {
        console.log("Video metadata loaded:", {
          duration: videoEl.duration,
          videoWidth: videoEl.videoWidth,
          videoHeight: videoEl.videoHeight,
          fileType: file.type,
          fileName: file.name
        })
        
        if (videoEl.duration > 20) {
          alert("Video must be 20 seconds or shorter.")
          URL.revokeObjectURL(url)
        } else {
          setVideoFile(file)
          setVideoPreview(url)
        }
        // Clean up the temporary video element
        videoEl.remove()
      }
      
      videoEl.onerror = (e) => {
        console.warn("Video metadata loading failed, but proceeding anyway:", e)
        console.log("File details:", {
          name: file.name,
          type: file.type,
          size: file.size
        })
        
        // Don't block the upload - just proceed without duration check
        setVideoFile(file)
        setVideoPreview(url)
        videoEl.remove()
      }
      
      // Fallback timeout in case neither event fires
      setTimeout(() => {
        if (!videoFile && !videoPreview) {
          console.log("Video loading timeout, proceeding without validation")
          setVideoFile(file)
          setVideoPreview(url)
          videoEl.remove()
        }
      }, 3000)
    }
  }

  const handleAnalyze = () => {
    if (!videoFile) {
      alert("Please record or upload a video first")
      return
    }

    console.log("Sending video to backend:", {
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileType: videoFile.type,
      noteLength: note.length
    })

    const formData = new FormData()
    formData.append("video", videoFile)
    formData.append("note", note)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:8000/analyze", true)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setUploadProgress(percent)
      }
    }

    xhr.onload = () => {
      setUploadProgress(0)
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText)
          console.log("Backend response:", data)
          alert(`Analysis complete!\n\nSeverity: ${data.video_analysis?.severity}\nCars involved: ${data.video_analysis?.cars_involved}\nAdvice: ${data.decision?.advice}`)
        } catch (e) {
          console.error("Error parsing response:", e)
          alert("Analysis complete! Check console for details.")
        }
      } else {
        console.error("Upload failed with status:", xhr.status, xhr.responseText)
        alert(`Upload failed (${xhr.status}). Check console for details.`)
      }
    }

    xhr.onerror = () => {
      setUploadProgress(0)
      console.error("Network error during upload")
      alert("Network error. Is the backend running on http://localhost:8000?")
    }

    xhr.send(formData)
  }

  return (
    <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 min-h-[90vh] relative">
      {/* heading */}
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          instant accident analysis
        </h1>
        <p className="text-gray-300 text-lg md:text-xl">
          record your accident, add details with voice or text, and get
          immediate guidance based on severity, location, and time
        </p>
      </div>

      <div className="mt-14 flex flex-col gap-8 w-full max-w-2xl">
        {/* video area */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-[#1c1c1c]/80 backdrop-blur-sm relative gap-4 p-4 w-full">
          <p className="text-gray-500 text-sm">
            record or upload accident video (max 20s)
            {videoFile && <span className="text-green-400 ml-2">✓ Video ready for analysis</span>}
          </p>

          {/* Recording indicator */}
          {recording && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              Recording...
            </div>
          )}

          {/* Video display - always present but conditionally showing different content */}
          <div className="w-full">
            {recording ? (
              <video
                ref={liveStreamRef}
                autoPlay
                muted
                playsInline
                className="rounded-lg w-full object-contain h-[400px] bg-black"
              />
            ) : videoPreview ? (
              <video
                src={videoPreview}
                controls
                playsInline
                className="rounded-lg w-full object-contain h-[400px]"
              />
            ) : (
              <div className="w-full h-[400px] rounded-lg bg-[#161616] flex items-center justify-center border-2 border-dashed border-gray-600">
                <div className="text-center text-gray-400">
                  <Video size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No video recorded or uploaded</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {!recording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-medium"
              >
                <Video size={18} /> start recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 transition-all font-medium"
              >
                stop recording
              </button>
            )}

            <label className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 hover:opacity-90 transition-all font-medium cursor-pointer">
              <Upload size={18} /> upload video
              <input type="file" accept="video/*" onChange={handleUploadChange} className="hidden" />
            </label>
          </div>

          {uploadProgress > 0 && (
            <p className="text-sm text-gray-300">Uploading... {uploadProgress}%</p>
          )}
        </div>

        {/* description */}
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
            <button
              onClick={handleAnalyze}
              disabled={uploadProgress > 0 || !videoFile}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadProgress > 0 ? `uploading ${uploadProgress}%` : videoFile ? 'analyze video' : 'no video selected'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Respondr