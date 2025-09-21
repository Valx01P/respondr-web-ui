'use client'

import { useState, useRef, useEffect } from "react"
import { Mic, Video, Upload, Send, Bot, User, ChevronsDown, MapPin, AlertCircle } from "lucide-react"
import GoogleMap from "./GoogleMap"

const Respondr = () => {
  const [note, setNote] = useState("")
  const [recording, setRecording] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [chatCount, setChatCount] = useState(0)
  const [isRecordingChatAudio, setIsRecordingChatAudio] = useState(false)
  const [backendError, setBackendError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const liveStreamRef = useRef(null)
  const stopTimeoutRef = useRef(null)
  const streamRef = useRef(null)
  const audioRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const audioStreamRef = useRef(null)
  const chatAudioRecorderRef = useRef(null)
  const chatAudioChunksRef = useRef([])
  const chatAudioStreamRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (chatAudioStreamRef.current) {
        chatAudioStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
      }
    }
  }, [videoPreview])

  const startRecording = async () => {
    try {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
        setVideoPreview(null)
      }
      setVideoFile(null)

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setRecording(true)

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

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorderRef.current.start()
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
      
      if (!file.type.startsWith('video/')) {
        alert("Please select a valid video file.")
        return
      }
      
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
        if (videoEl.duration > 20) {
          alert("Video must be 20 seconds or shorter.")
          URL.revokeObjectURL(url)
        } else {
          setVideoFile(file)
          setVideoPreview(url)
        }
        videoEl.remove()
      }
      
      videoEl.onerror = () => {
        setVideoFile(file)
        setVideoPreview(url)
        videoEl.remove()
      }
      
      setTimeout(() => {
        if (!videoFile && !videoPreview) {
          setVideoFile(file)
          setVideoPreview(url)
          videoEl.remove()
        }
      }, 3000)
    }
  }

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      setIsRecordingAudio(true)
      
      audioRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      audioRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      audioRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], "audio.webm", { type: "audio/webm" })
        
        const formData = new FormData()
        formData.append("audio", file)

        const xhr = new XMLHttpRequest()
        xhr.open("POST", "http://localhost:8000/transcribe", true)

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText)
            setNote(prev => prev + (prev ? ' ' : '') + data.transcription)
          }
        }

        xhr.send(formData)

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop())
          audioStreamRef.current = null
        }
      }

      audioRecorderRef.current.start()
    } catch (error) {
      console.error("Error starting audio recording:", error)
      alert("Could not start audio recording. Please check microphone permissions.")
    }
  }

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop()
      setIsRecordingAudio(false)
    }
  }

  const startChatAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chatAudioStreamRef.current = stream
      setIsRecordingChatAudio(true)
      
      chatAudioRecorderRef.current = new MediaRecorder(stream)
      chatAudioChunksRef.current = []

      chatAudioRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chatAudioChunksRef.current.push(e.data)
      }

      chatAudioRecorderRef.current.onstop = async () => {
        const blob = new Blob(chatAudioChunksRef.current, { type: "audio/webm" })
        const file = new File([blob], "chat_audio.webm", { type: "audio/webm" })
        
        const formData = new FormData()
        formData.append("audio", file)

        const xhr = new XMLHttpRequest()
        xhr.open("POST", "http://localhost:8000/transcribe", true)

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText)
            setChatInput(prev => prev + (prev ? ' ' : '') + data.transcription)
          }
        }

        xhr.send(formData)

        if (chatAudioStreamRef.current) {
          chatAudioStreamRef.current.getTracks().forEach((track) => track.stop())
          chatAudioStreamRef.current = null
        }
      }

      chatAudioRecorderRef.current.start()
    } catch (error) {
      console.error("Error starting chat audio recording:", error)
      alert("Could not start audio recording. Please check microphone permissions.")
    }
  }

  const stopChatAudioRecording = () => {
    if (chatAudioRecorderRef.current && isRecordingChatAudio) {
      chatAudioRecorderRef.current.stop()
      setIsRecordingChatAudio(false)
    }
  }

  const handleAnalyze = async () => {
    if (!videoFile) {
      alert("Please record or upload a video first")
      return
    }

    setIsAnalyzing(true)
    setUploadProgress(0)
    setBackendError(null)

    const formData = new FormData()
    formData.append("video", videoFile)
    formData.append("note", note)
    formData.append("session_id", "new")
    formData.append("user_location", "Miami, FL")

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
      setIsAnalyzing(false)
      
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText)
          setAnalysisResults(data)
          setCurrentSessionId(data.session_id)
          
          // Create a single rich message object for the initial analysis
          const initialMessage = {
            type: 'ai_analysis',
            data: data,
            timestamp: new Date().toISOString()
          }

          setChatMessages([initialMessage])
          setBackendError(null)
        } catch (e) {
          console.error("Error parsing response:", e)
          setBackendError("Analysis complete but there was an error processing the results.")
        }
      } else {
        console.error("Analysis failed:", xhr.status, xhr.responseText)
        setBackendError(`Analysis failed (${xhr.status}). Please check if the backend is running.`)
      }
    }

    xhr.onerror = () => {
      setUploadProgress(0)
      setIsAnalyzing(false)
      setBackendError("Network error. Is the backend running on http://localhost:8000?")
    }

    xhr.send(formData)
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatCount >= 10) return

    const userMessage = {
      type: 'user',
      content: chatInput,
      timestamp: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, userMessage])
    const currentInput = chatInput
    setChatInput("")
    setIsChatLoading(true)

    try {
      const formData = new FormData()
      formData.append('session_id', currentSessionId)
      formData.append('message', currentInput)

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        const aiMessage = {
          type: 'ai',
          content: data.response,
          timestamp: new Date().toISOString(),
          location_data: data.location_data // Include enhanced location data
        }
        setChatMessages(prev => [...prev, aiMessage])
        setChatCount(prev => prev + 1)
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage = {
        type: 'ai',
        content: "Sorry, I'm having trouble responding right now. Please check if the backend is running and try again.",
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleNewAnalysis = () => {
    setVideoFile(null)
    setNote("")
    setAnalysisResults(null)
    setCurrentSessionId(null)
    setChatMessages([])
    setChatInput("")
    setChatCount(0)
    setUploadProgress(0)
    setBackendError(null)
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
      setVideoPreview(null)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'from-red-500 to-red-600 border-red-400'
      case 'high': return 'from-orange-500 to-orange-600 border-orange-400'
      case 'medium': return 'from-yellow-500 to-yellow-600 border-yellow-400'
      default: return 'from-green-500 to-green-600 border-green-400'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'emergency': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '⚡'
      default: return '✅'
    }
  }

  // Enhanced component to render the rich analysis message
  const AnalysisMessage = ({ analysisData }) => {
    const { priority, analysis, recommendations, location_services } = analysisData
    const finalAssessment = analysis?.final_assessment || {}
    
    // Extract map configuration from location services
    const getMapConfigFromServices = () => {
      if (!recommendations?.services?.length) return null
      
      // Find any location service data that has map_config
      for (const [serviceType, locationData] of Object.entries(location_services || {})) {
        if (locationData?.map_config) {
          return locationData.map_config
        }
      }
      return null
    }
    
    return (
      <div className="space-y-4">
        {/* 1. Overview */}
        <div className={`p-4 rounded-xl border-2 bg-gradient-to-r ${getPriorityColor(priority)}`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{getPriorityIcon(priority)}</div>
            <div className="text-white">
              <h3 className="text-lg font-bold capitalize">{priority} Priority Incident</h3>
              <p className="opacity-90 text-sm">
                {finalAssessment.overview_summary || 'Here is a summary of the situation.'}
              </p>
            </div>
          </div>
        </div>
        
        {/* 2. Detailed Explanation */}
        <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-xl">
          <h4 className="font-bold text-white mb-3">Detailed Analysis</h4>
          <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">
            {finalAssessment.detailed_explanation || 'No detailed explanation available.'}
          </p>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-gray-800 p-2 rounded-lg">
              <div className="font-bold text-white text-lg">{finalAssessment.cars_involved || 1}</div>
              <div className="text-xs text-gray-400">Vehicle(s) Involved</div>
            </div>
            <div className="bg-gray-800 p-2 rounded-lg">
              <div className="font-bold text-white text-lg capitalize">{finalAssessment.severity || 'Unknown'}</div>
              <div className="text-xs text-gray-400">Severity Level</div>
            </div>
          </div>
          {finalAssessment.damages?.length > 0 && (
            <div className="mt-4">
              <h5 className="text-xs font-medium text-gray-400 mb-2">Detected Damages</h5>
              <div className="flex flex-wrap gap-2">
                {finalAssessment.damages.map((damage, index) => (
                  <span key={index} className="bg-gray-700 text-gray-200 px-2 py-1 rounded-md text-xs">{damage}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Recommended Steps */}
        <div className="p-4 bg-[#2a2a2a] border border-gray-700 rounded-xl">
           <h4 className="font-bold text-white mb-3">Recommended Next Steps</h4>
           {recommendations?.immediate_actions?.length > 0 && (
            <div className="mb-4">
                <h5 className="text-sm font-semibold text-blue-300 mb-2">Immediate Actions</h5>
                <div className="space-y-2">
                {recommendations.immediate_actions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-gray-200">
                    <span className="text-blue-400 font-bold bg-blue-900/50 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{index + 1}</span>
                    <span>{action}</span>
                    </div>
                ))}
                </div>
            </div>
           )}
           {recommendations?.general_advice?.length > 0 && (
            <div>
                <h5 className="text-sm font-semibold text-gray-400 mb-2">General Advice</h5>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                  {recommendations.general_advice.map((advice, index) => <li key={index}>{advice}</li>)}
                </ul>
            </div>
           )}
        </div>
        
        {/* 4. Nearby Services with Enhanced Map */}
        {recommendations?.services?.length > 0 && (
            <GoogleMap 
                services={recommendations.services}
                userLocation="Miami, FL"
                mapConfig={getMapConfigFromServices()}
                className="mt-4"
            />
        )}

        {/* 5. Comprehensive Tips */}
        {recommendations?.comprehensive_tips?.length > 0 && (
          <div className="p-4 bg-[#1f2937] border border-gray-600 rounded-xl">
            <h4 className="font-bold text-white mb-3">💡 Pro Tips</h4>
            <div className="space-y-2">
              {recommendations.comprehensive_tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 font-bold text-xs flex-shrink-0 mt-1">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Component to render chat messages with location data
  const ChatMessage = ({ message }) => {
    return (
      <div className="space-y-3">
        {/* Main message content */}
        <div className="p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* Location data if available */}
        {message.location_data && message.location_data.services?.length > 0 && (
          <div className="border-t border-gray-600 pt-3">
            <GoogleMap 
              services={message.location_data.services}
              userLocation="Miami, FL"
              mapConfig={message.location_data.map_config || null}
              compact={true}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 min-h-[90vh] relative">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          instant accident analysis
        </h1>
        
        {!analysisResults && (
           <p className="text-gray-300 text-lg md:text-xl">
             record your accident, add details with voice or text, and get
             immediate guidance based on severity, location, and time
           </p>
        )}
      </div>

      {/* Backend Error Alert */}
      {backendError && (
        <div className="mt-6 w-full max-w-2xl bg-red-900/20 border border-red-700 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-red-400 font-semibold">Backend Connection Error</h3>
              <p className="text-red-300 text-sm mt-1">{backendError}</p>
            </div>
          </div>
        </div>
      )}

      {!analysisResults ? (
        <div className="mt-14 flex flex-col gap-8 w-full max-w-2xl">
          {/* Video area */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-700 bg-[#1c1c1c]/80 backdrop-blur-sm relative gap-4 p-4 w-full">
            <p className="text-gray-500 text-sm">
              record or upload accident video (max 20s)
              {videoFile && <span className="text-green-400 ml-2">✓ Video ready for analysis</span>}
            </p>

            {recording && (
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                Recording...
              </div>
            )}

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
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-medium disabled:opacity-50"
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
                <input type="file" accept="video/*" onChange={handleUploadChange} className="hidden" disabled={isAnalyzing} />
              </label>
            </div>

            {uploadProgress > 0 && (
              <div className="w-full">
                <p className="text-sm text-gray-300 mb-2">Analyzing... {uploadProgress}%</p>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="optional: describe what happened..."
                disabled={isAnalyzing}
                className="resize-none rounded-xl border border-gray-700 bg-[#1c1c1c]/80 backdrop-blur-sm p-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] w-full disabled:opacity-50"
              />
              {isRecordingAudio && (
                <div className="absolute top-2 right-2 flex items-center gap-2 text-red-400 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  Recording audio...
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                disabled={isAnalyzing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium disabled:opacity-50 ${
                  isRecordingAudio 
                    ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90' 
                    : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:opacity-90'
                }`}
              >
                <Mic size={16} /> 
                {isRecordingAudio ? 'stop recording' : 'use voice instead'}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={uploadProgress > 0 || !videoFile || isAnalyzing}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'analyzing...' : uploadProgress > 0 ? `uploading ${uploadProgress}%` : videoFile ? 'analyze video' : 'no video selected'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 w-full max-w-3xl">
            {/* Enhanced Chat UI */}
            <div className="bg-gradient-to-br from-[#1c1c1c] to-[#2a2a2a] rounded-2xl border border-gray-700 shadow-xl flex flex-col h-[75vh]">
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {chatMessages.map((message, index) => (
                    <div key={index} className={`flex items-end gap-3 ${message.type.startsWith('ai') ? 'justify-start' : 'justify-end'}`}>
                        {/* Avatar */}
                        {message.type.startsWith('ai') && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                <Bot size={18} className="text-white" />
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`max-w-[85%] ${
                            message.type === 'user'
                            ? 'bg-blue-600 text-white rounded-2xl rounded-br-none'
                            : 'bg-[#2a2a2a] border border-gray-700 text-gray-100 rounded-2xl rounded-bl-none'
                        }`}>
                            {message.type === 'ai_analysis' ? (
                                <AnalysisMessage analysisData={message.data} />
                            ) : (
                                <ChatMessage message={message} />
                            )}
                        </div>

                         {message.type === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <User size={18} className="text-gray-300" />
                            </div>
                        )}
                    </div>
                    ))}

                    {isChatLoading && (
                    <div className="flex items-end gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <Bot size={18} className="text-white" />
                        </div>
                        <div className="bg-[#2a2a2a] border border-gray-700 p-4 rounded-2xl rounded-bl-none">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                        </div>
                        </div>
                    </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                 {/* Enhanced Chat Input */}
                 <div className="p-4 border-t border-gray-700">
                    {chatCount < 10 ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <textarea
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        sendChatMessage()
                                    }
                                    }}
                                    placeholder="Ask about next steps, pricing, insurance, or request 'find nearby mechanics'..."
                                    className="w-full p-3 pr-24 bg-[#181818] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                                    rows="1"
                                    disabled={isChatLoading}
                                />
                                
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                                    <button
                                        onClick={isRecordingChatAudio ? stopChatAudioRecording : startChatAudioRecording}
                                        disabled={isChatLoading}
                                        className={`p-2 rounded-lg transition-all ${
                                        isRecordingChatAudio
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-700 hover:bg-gray-600'
                                        } disabled:opacity-50`}
                                    >
                                        <Mic size={16} className="text-white" />
                                    </button>
                                    
                                    <button
                                        onClick={sendChatMessage}
                                        disabled={!chatInput.trim() || isChatLoading}
                                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50"
                                    >
                                        <Send size={16} className="text-white" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Quick suggestions */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    "Find nearby tire shops",
                                    "Show me mechanics",
                                    "What's next?",
                                    "Insurance help",
                                    "Cost estimates"
                                ].map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setChatInput(suggestion)}
                                        disabled={isChatLoading}
                                        className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                         <div className="text-center">
                            <p className="text-gray-400 text-sm mb-3">Chat limit reached.</p>
                            <button
                                onClick={handleNewAnalysis}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-all font-medium text-sm"
                            >
                                Start New Analysis
                            </button>
                         </div>
                    )}
                    <p className="text-xs text-gray-500 text-center mt-2">
                        {10 - chatCount} messages remaining • Try: "find nearby services" or "what should I do next?"
                    </p>
                 </div>
            </div>
        </div>
      )}
    </section>
  )
}

export default Respondr