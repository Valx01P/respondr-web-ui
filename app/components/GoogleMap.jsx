'use client'
import { useEffect, useRef, useState } from 'react'

const GoogleMap = ({ 
  services = [], 
  userLocation = "Miami, FL", 
  compact = false, 
  className = "",
  mapConfig = null 
}) => {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [markers, setMarkers] = useState([])
  const [loadError, setLoadError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mapHeight, setMapHeight] = useState(compact ? 250 : 300)

  // Load Google Maps when component mounts and ref is available
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current && !map && !loadError) {
        loadGoogleMaps()
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [map, loadError])

  // Add markers when map and services are available
  useEffect(() => {
    if (map && services.length > 0) {
      addServiceMarkers()
    }
  }, [map, services])

  // Update map height based on content
  useEffect(() => {
    const calculateHeight = () => {
      if (services.length === 0) return compact ? 250 : 300
      if (services.length === 1) return compact ? 280 : 320
      if (services.length <= 3) return compact ? 320 : 360
      return compact ? 350 : 400
    }
    setMapHeight(calculateHeight())
  }, [services.length, compact])

  const loadGoogleMaps = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 
                   process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY

    if (!apiKey) {
      console.error("Google Maps API key missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local")
      setLoadError(true)
      setIsLoading(false)
      return
    }

    // Check if already loaded
    if (window.google?.maps?.Map) {
      initializeMap()
      return
    }

    // Check if script already exists
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      waitForLoad()
      return
    }

    // Create and load script
    const script = document.createElement('script')
    const callbackName = `initMap_${Date.now()}`
    
    // Global callback
    window[callbackName] = () => {
      if (mapRef.current) {
        initializeMap()
      }
      delete window[callbackName]
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`
    script.async = true
    script.onerror = () => {
      console.error("Failed to load Google Maps")
      setLoadError(true)
      setIsLoading(false)
      delete window[callbackName]
    }

    document.head.appendChild(script)

    // Timeout fallback
    setTimeout(() => {
      if (isLoading && !map) {
        setLoadError(true)
        setIsLoading(false)
        delete window[callbackName]
      }
    }, 10000)
  }

  const waitForLoad = () => {
    const checkInterval = setInterval(() => {
      if (window.google?.maps?.Map && mapRef.current) {
        clearInterval(checkInterval)
        initializeMap()
      }
    }, 100)

    setTimeout(() => {
      clearInterval(checkInterval)
      if (isLoading && !map) {
        setLoadError(true)
        setIsLoading(false)
      }
    }, 10000)
  }

  const initializeMap = () => {
    if (!mapRef.current || !window.google?.maps) {
      setLoadError(true)
      setIsLoading(false)
      return
    }

    try {
      // Use mapConfig if provided, otherwise use defaults
      const center = mapConfig?.center || { lat: 25.7617, lng: -80.1918 }
      const zoom = mapConfig?.zoom_level || (compact ? 11 : 12)

      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] }
        ],
        disableDefaultUI: true,
        zoomControl: true
      })

      setMap(mapInstance)
      setIsLoading(false)
      setLoadError(false)
      
    } catch (error) {
      console.error("Map initialization error:", error)
      setLoadError(true)
      setIsLoading(false)
    }
  }

  const addServiceMarkers = () => {
    if (!map || !window.google || !services.length) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))
    
    const newMarkers = []
    const bounds = new window.google.maps.LatLngBounds()
    let validMarkers = 0
    
    services.forEach((service) => {
      // Ensure service has proper coordinates and is map_ready
      if (!service.coordinates || !service.map_ready) {
        console.warn("Service missing coordinates or not map ready:", service.name)
        return
      }
      
      const position = new window.google.maps.LatLng(
        service.coordinates.lat,
        service.coordinates.lng
      )
      
      const marker = new window.google.maps.Marker({
        position,
        map,
        title: service.name,
        icon: {
          url: getMarkerIcon(service.type),
          scaledSize: new window.google.maps.Size(30, 30)
        }
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(service)
      })

      marker.addListener('click', () => {
        // Close other info windows
        newMarkers.forEach(m => m.infoWindow?.close())
        infoWindow.open(map, marker)
      })

      marker.infoWindow = infoWindow
      newMarkers.push(marker)
      bounds.extend(position)
      validMarkers++
    })

    // Fit map to markers or use provided bounds
    if (validMarkers > 0) {
      if (mapConfig?.bounds) {
        // Use provided bounds from backend
        const backendBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(mapConfig.bounds.south, mapConfig.bounds.west),
          new window.google.maps.LatLng(mapConfig.bounds.north, mapConfig.bounds.east)
        )
        map.fitBounds(backendBounds)
      } else if (validMarkers === 1) {
        // Single marker - center on it
        map.setCenter(newMarkers[0].getPosition())
        map.setZoom(14)
      } else {
        // Multiple markers - fit bounds
        map.fitBounds(bounds)
      }
    }
    
    setMarkers(newMarkers)
    console.log(`Successfully added ${validMarkers} markers to map`)
  }

  const createInfoWindowContent = (service) => {
    return `
      <div style="color: #333; max-width: 250px; font-family: system-ui;">
        <h4 style="margin: 0 0 8px 0; color: #1a73e8; font-size: 16px;">${service.name}</h4>
        <p style="margin: 0 0 4px 0; font-size: 14px;">${service.address}</p>
        ${service.phone ? `<p style="margin: 0 0 4px 0; font-size: 14px;">📞 ${service.phone}</p>` : ''}
        ${service.distance ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${service.distance}</p>` : ''}
        ${service.hours ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">🕒 ${service.hours}</p>` : ''}
        ${service.rating ? `<p style="margin: 4px 0; font-size: 12px; color: #666;">⭐ ${service.rating}/5</p>` : ''}
      </div>
    `
  }

  const getMarkerIcon = (serviceType) => {
    const colors = {
      'tire_shop': '#f59e0b',
      'mechanic': '#3b82f6', 
      'tow_truck': '#ef4444',
      'auto_body_shop': '#8b5cf6',
      'hospital': '#dc2626'
    }
    
    const color = colors[serviceType] || '#6b7280'
    
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="30" height="30">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>
    `)}`
  }

  if (loadError) {
    return (
      <div className={`bg-gradient-to-br from-[#1c1c1c] to-[#2a2a2a] rounded-xl border border-gray-600 p-4 shadow-xl ${className}`}>
        <h4 className="text-md font-bold mb-3 text-white flex items-center gap-2">
          📍 Nearby Services
        </h4>
        <div className="w-full bg-[#1a1a1a] rounded-xl border border-gray-700 p-8 text-center">
          <p className="text-gray-500 text-sm mb-3">Maps temporarily unavailable</p>
          <p className="text-gray-600 text-xs">Check API key in .env.local</p>
        </div>
        {services.length > 0 && <ServicesList services={services} />}
      </div>
    )
  }

  return (
    <div className={`bg-gradient-to-br from-[#1c1c1c] to-[#2a2a2a] rounded-xl border border-gray-600 p-4 shadow-xl ${className}`}>
      <h4 className="text-md font-bold mb-3 text-white flex items-center gap-2">
        📍 Nearby Services
        {services.length > 0 && (
          <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full">
            {services.length} found
          </span>
        )}
      </h4>
      
      {isLoading ? (
        <div 
          className="w-full bg-[#1a1a1a] rounded-xl border border-gray-700 flex items-center justify-center"
          style={{ height: `${mapHeight}px` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm">Loading map...</p>
          </div>
        </div>
      ) : (
        <div 
          ref={mapRef} 
          className="w-full rounded-lg border border-gray-700"
          style={{ height: `${mapHeight}px` }}
        />
      )}
      
      {services.length > 0 && <ServicesList services={services} />}
    </div>
  )
}

const ServicesList = ({ services }) => (
  <div className="mt-4 space-y-3">
    {services.slice(0, 4).map((service, index) => (
      <div key={service.id || index} className="p-3 bg-[#1f2937] rounded-lg border border-gray-600">
        <div className="flex justify-between items-start mb-2">
          <h5 className="font-semibold text-white text-sm">{service.name}</h5>
          <div className="flex items-center gap-2">
            {service.rating && (
              <span className="text-xs text-yellow-400">⭐ {service.rating}</span>
            )}
            <span className="text-xs text-blue-300 bg-blue-600/20 px-2 py-0.5 rounded-full">
              {(service.type || '').replace('_', ' ')}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-2">{service.address}</p>
        
        {/* Show any AI advice or recommendation reason */}
        {service.ai_advice && (
          <div className="bg-green-600/10 border-l-2 border-green-400 pl-2 py-1 mb-2">
            <p className="text-xs text-green-200">💡 {service.ai_advice}</p>
          </div>
        )}
        {service.recommendation_reason && (
          <div className="bg-blue-600/10 border-l-2 border-blue-400 pl-2 py-1 mb-2">
            <p className="text-xs text-blue-200 italic">"{service.recommendation_reason}"</p>
          </div>
        )}
        
        <div className="flex justify-between items-center text-xs">
          <div className="flex gap-3 text-gray-500">
            {service.distance && <span>📍 {service.distance}</span>}
            {service.wait_time && <span>⏱️ {service.wait_time}</span>}
            {service.price_range && <span>💰 {service.price_range}</span>}
          </div>
          {service.phone && (
            <a href={`tel:${service.phone}`} className="text-blue-400 hover:text-blue-300 underline">
              {service.phone}
            </a>
          )}
        </div>
      </div>
    ))}
  </div>
)

export default GoogleMap