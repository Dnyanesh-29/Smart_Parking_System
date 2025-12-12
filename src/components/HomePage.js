"use client"

import { useState, useEffect, useCallback } from "react"
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api"
import { useNavigate } from "react-router-dom"
import { Menu, MapPin, Navigation, X, Search } from "lucide-react"
import StreetParkingSlots from "./street-parking-slots"

const containerStyle = {
  width: "100%",
  height: "calc(100vh - 60px)", // Changed from 96px to 60px since search bar is now inline
  border: "1px solid #ccc",
  borderRadius: "8px",
}

const defaultCenter = {
  lat: 18.5204,
  lng: 73.8567,
}

// Sample parking locations with address-based names
const locations = [
  {
    id: 1,
    name: "FC Road Parking",
    address: "Fergusson College Road, Shivajinagar",
    // 18.522412426988133, 73.84109180494498
    position: { lat: 18.522412426988133, lng: 73.84109180494498 },
    route: "/pay-and-park",
    availableSpaces: 12,
  },
  {
    id: 2,
    name: "JM Road Parking",
    address: "Jangali Maharaj Road, Shivajinagar",
    position: { lat: 18.53, lng: 73.85 },
    route: "/new-parking",
    availableSpaces: 8,
  },
  {
    id: 3,
    name: "Deccan Gymkhana Parking",
    address: "Deccan Gymkhana, Pune",
    position: { lat: 18.515, lng: 73.84 },
    route: "/deccan-parking",
    availableSpaces: 15,
  },
  {
    id: 4,
    name: "Veer Santaji Ghorpade Road",
    // 18.519347387811045, 73.85623956338455
    address: "Near Shaniwar Wada, Pune",
    position: { lat: 18.519347387811045, lng: 73.85623956338455 },
    route: "/street-parking",
    availableSpaces: 7,
    isStreetParking: true,
  },
]

const libraries = ["places"]

const HomePage = () => {
  const navigate = useNavigate()
  const [currentPosition, setCurrentPosition] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [directionsDetails, setDirectionsDetails] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapRef, setMapRef] = useState(null)
  const [directionsRequested, setDirectionsRequested] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showCustomInfoWindow, setShowCustomInfoWindow] = useState(false)
  const [infoPosition, setInfoPosition] = useState({ bottom: "20px", right: "20px" })
  const [showStreetParking, setShowStreetParking] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredLocations, setFilteredLocations] = useState(locations)
  const [/*showSearchResults*/ /*setShowSearchResults*/ ,] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Get current location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        console.log("Current position set:", position.coords.latitude, position.coords.longitude)
      },
      () => {
        setCurrentPosition(defaultCenter)
        console.log("Using default location")
      },
    )
  }, [])

  const handleMapLoad = useCallback((map) => {
    setMapRef(map)
    setMapLoaded(true)
    console.log("Map loaded successfully")
  }, [])

  const handleMarkerClick = (location) => {
    setSelectedLocation(location)
    setDirectionsResponse(null)
    setDirectionsDetails(null)
    setDirectionsRequested(false)
    setShowMobileNav(false)
    setShowCustomInfoWindow(false)
    setShowStreetParking(location.isStreetParking || false)

    // Center map on the selected location
    if (mapRef) {
      mapRef.panTo(location.position)
      mapRef.setZoom(16)
    }

    console.log("Selected location:", location.name)
  }

  const handleOpenSpace = () => {
    navigate(selectedLocation.route, { state: { location: selectedLocation } })
  }

  const handleGetDirections = () => {
    if (!currentPosition || !selectedLocation) return
    setDirectionsRequested(true)
    // Hide the standard info window and show our custom one
    setShowCustomInfoWindow(true)
    console.log("Requesting directions")
  }

  const directionsCallback = useCallback(
    (response) => {
      console.log("Directions callback received", response?.status)

      if (response !== null && response.status === "OK") {
        setDirectionsResponse(response)
        setDirectionsRequested(false)

        // Extract route details
        const route = response.routes[0]
        const leg = route.legs[0]

        setDirectionsDetails({
          distance: leg.distance.text,
          duration: leg.duration.text,
          steps: leg.steps.map((step) => ({
            instructions: step.instructions,
            distance: step.distance.text,
          })),
        })

        // Adjust map to fit the route with proper bounds
        if (mapRef) {
          const bounds = new window.google.maps.LatLngBounds()

          // Add origin and destination to bounds
          bounds.extend(leg.start_location)
          bounds.extend(leg.end_location)

          // Add all waypoints to bounds
          leg.steps.forEach((step) => {
            bounds.extend(step.start_location)
            bounds.extend(step.end_location)
          })

          mapRef.fitBounds(bounds)

          // Ensure we're not zoomed in too far
          const zoom = mapRef.getZoom()
          if (zoom > 16) {
            mapRef.setZoom(16)
          }
        }
      } else {
        console.error("Directions request failed", response)
        setDirectionsRequested(false)
        setDirectionsDetails({
          error: "Could not calculate directions. Please try again.",
        })
      }
    },
    [mapRef],
  )

  const renderInfoWindowContent = () => {
    // If directions have been requested but not yet received
    if (directionsRequested && !directionsDetails) {
      return (
        <div style={{ padding: "8px", maxWidth: "200px" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "14px" }}>{selectedLocation.name}</h3>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "5px 0",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid #4285F4",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <span style={{ marginLeft: "8px", fontSize: "12px" }}>Getting directions...</span>
          </div>
          <button
            onClick={() => {
              setDirectionsRequested(false)
              setDirectionsResponse(null)
            }}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
              backgroundColor: "#757575",
              color: "white",
              border: "none",
              borderRadius: "4px",
              width: "100%",
              fontSize: "12px",
            }}
          >
            Cancel
          </button>
        </div>
      )
    }

    // Street parking info window
    if (selectedLocation?.isStreetParking) {
      return (
        <div style={{ padding: "8px", maxWidth: "200px" }}>
          <h3 style={{ margin: "0 0 5px 0", fontSize: "14px" }}>{selectedLocation.name}</h3>
          <p style={{ margin: "0 0 5px 0", fontSize: "12px" }}>
            <strong>Address:</strong> {selectedLocation.address}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "5px" }}>
            <button
              onClick={handleGetDirections}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                backgroundColor: "#4285F4",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                flex: 1,
              }}
            >
              Directions
            </button>
            <button
              onClick={() => setShowStreetParking(true)}
              style={{
                padding: "6px 10px",
                cursor: "pointer",
                backgroundColor: "#0F9D58",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                flex: 1,
              }}
            >
              View Slots
            </button>
          </div>
        </div>
      )
    }

    // Default info view (more compact)
    return (
      <div style={{ padding: "8px", maxWidth: "200px" }}>
        <h3 style={{ margin: "0 0 5px 0", fontSize: "14px" }}>{selectedLocation.name}</h3>
        <p style={{ margin: "0 0 5px 0", fontSize: "12px" }}>
          <strong>Address:</strong> {selectedLocation.address}
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "5px" }}>
          <button
            onClick={handleGetDirections}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
              backgroundColor: "#4285F4",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              flex: 1,
            }}
          >
            Directions
          </button>
          <button
            onClick={handleOpenSpace}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
              backgroundColor: "#0F9D58",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              flex: 1,
            }}
          >
            Open Space
          </button>
        </div>
      </div>
    )
  }

  // Custom info window that appears in the bottom right corner
  const renderCustomInfoWindow = () => {
    if (!showCustomInfoWindow || !selectedLocation) return null

    return (
      <div
        style={{
          position: "absolute",
          bottom: infoPosition.bottom,
          right: infoPosition.right,
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          zIndex: 10,
          maxWidth: "300px",
          width: isMobile ? "calc(100% - 40px)" : "300px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "16px" }}>{selectedLocation.name}</h3>
          <button
            onClick={() => setShowCustomInfoWindow(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "12px 16px" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            <strong>Address:</strong> {selectedLocation.address}
          </p>

          {directionsDetails && (
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "6px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Distance</p>
                  <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>{directionsDetails.distance}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>Time</p>
                  <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>{directionsDetails.duration}</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            {directionsResponse ? (
              <button
                onClick={() => {
                  setDirectionsResponse(null)
                  setDirectionsDetails(null)
                  setShowCustomInfoWindow(false)
                }}
                style={{
                  padding: "8px 0",
                  cursor: "pointer",
                  backgroundColor: "#757575",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  flex: 1,
                }}
              >
                Clear Route
              </button>
            ) : (
              <button
                onClick={handleGetDirections}
                style={{
                  padding: "8px 0",
                  cursor: "pointer",
                  backgroundColor: "#4285F4",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  flex: 1,
                }}
              >
                Directions
              </button>
            )}
            <button
              onClick={selectedLocation.isStreetParking ? () => setShowStreetParking(true) : handleOpenSpace}
              style={{
                padding: "8px 0",
                cursor: "pointer",
                backgroundColor: "#0F9D58",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                flex: 1,
              }}
            >
              {selectedLocation.isStreetParking ? "View Slots" : "Open Space"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Street parking slots panel
  const renderStreetParkingPanel = () => {
    if (!showStreetParking || !selectedLocation?.isStreetParking) return null

    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          backgroundColor: "white",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          boxShadow: "0 -4px 10px rgba(0,0,0,0.1)",
          zIndex: 1000,
          maxHeight: "80vh",
          overflow: "auto",
          transition: "transform 0.3s ease-in-out",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h3 style={{ margin: 0 }}>{selectedLocation.name}</h3>
          <button
            onClick={() => setShowStreetParking(false)}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: "16px" }}>
          <StreetParkingSlots />
        </div>
      </div>
    )
  }

  // Mobile navigation drawer
  const renderMobileNav = () => {
    if (!showMobileNav) return null

    return (
      <div
        style={{
          position: "fixed",
          top: "60px", // This stays the same since navbar is still 60px
          left: 0,
          width: "100%",
          height: "calc(100vh - 60px)",
          backgroundColor: "rgba(255, 255, 255, 0.95)", // Added transparency
          backdropFilter: "blur(10px)", // Added blur effect
          zIndex: 1000,
          overflowY: "auto",
          padding: "16px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            marginBottom: "16px",
            padding: "0 0 16px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <h2 style={{ margin: 0 }}>Nearby Parking Spaces</h2>
          {searchQuery && (
            <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#666" }}>Results for "{searchQuery}"</p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredLocations.map((location) => (
            <div
              key={location.id}
              style={{
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: "rgba(245, 245, 245, 0.7)", // Added transparency
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
              onClick={() => handleMarkerClick(location)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    backgroundColor: location.isStreetParking ? "#FF9800" : "#4285F4",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                  }}
                >
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>{location.name}</h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>{location.address}</p>
                  {location.isStreetParking && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#FF9800" }}>Street Parking</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredLocations.length === 0 && (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <p>No parking places found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Filter locations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLocations(locations)
      return
    }

    const filtered = locations.filter(
      (location) =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredLocations(filtered)
  }, [searchQuery])

  const handleSearchResultClick = (location) => {
    handleMarkerClick(location)
    setSearchQuery("")
    setShowMobileNav(false)
  }

  // Search results dropdown
  /*const renderSearchResults = () => {
    if (!showSearchResults || !searchQuery.trim()) return null

    return (
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "50%", // Match the search bar width
          maxWidth: "400px", // Set a reasonable max width
          minWidth: "250px", // Set a minimum width
          backgroundColor: "rgba(255, 255, 255, 0.95)", // Semi-transparent white
          backdropFilter: "blur(10px)", // Add blur effect
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 1002,
          maxHeight: "200px",
          overflowY: "auto",
          border: "1px solid rgba(255, 255, 255, 0.2)", // Subtle border
        }}
      >
        {filteredLocations.length > 0 ? (
          <div>
            {filteredLocations.map((location, index) => (
              <div
                key={location.id}
                style={{
                  padding: "8px 12px",
                  borderBottom: index < filteredLocations.length - 1 ? "1px solid rgba(238, 238, 238, 0.5)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "background-color 0.2s",
                  borderRadius:
                    index === 0 ? "8px 8px 0 0" : index === filteredLocations.length - 1 ? "0 0 8px 8px" : "0",
                }}
                onClick={() => handleSearchResultClick(location)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(245, 245, 245, 0.8)"
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "transparent"
                }}
              >
                <div
                  style={{
                    backgroundColor: location.isStreetParking ? "#FF9800" : "#4285F4",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={12} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", fontWeight: "600" }}>{location.name}</h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      color: "#666",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {location.address}
                  </p>
                  {location.isStreetParking && (
                    <p style={{ margin: "1px 0 0 0", fontSize: "10px", color: "#FF9800" }}>Street Parking</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "12px", textAlign: "center", color: "#666" }}>
            <p style={{ margin: 0, fontSize: "12px" }}>No parking places found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    )
  }*/

  /*useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside search area
      const searchContainer = event.target.closest("[data-search-container]");
      if (!searchContainer && showSearchResults) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearchResults]);*/

  return (
    <div style={{ padding: 0, position: "relative", height: "100vh", overflow: "hidden" }}>
      {/* Mobile Navbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#4285F4",
          color: "white",
          padding: "0 16px",
          height: "60px",
          position: "relative",
          zIndex: 1001,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          gap: "12px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "18px", flexShrink: 0 }}>Find Parking</h1>

        {/* Search Bar - now inline */}
        <div
          data-search-container
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "0 12px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            flex: 1,
            maxWidth: "50%",
            height: "36px",
          }}
        >
          <Search size={16} color="#666" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={() => setShowMobileNav(true)}
            onFocus={() => setShowMobileNav(true)}
            style={{
              border: "none",
              padding: "0 8px",
              width: "100%",
              outline: "none",
              fontSize: "14px",
              backgroundColor: "transparent",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2px",
              }}
            >
              <X size={14} color="#666" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowMobileNav(!showMobileNav)}
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {showMobileNav ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Search Results are now shown in the navbar */}

      {/* Mobile Navigation Drawer */}
      {renderMobileNav()}

      <div style={{ position: "relative", height: "calc(100vh - 60px)" }}>
        <LoadScript googleMapsApiKey="Your_google_maps_api_key" libraries={libraries}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={currentPosition || defaultCenter}
            zoom={15}
            onLoad={handleMapLoad}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControl: true,
              gestureHandling: "greedy",
            }}
          >
            {/* Current location marker */}
            {currentPosition && (
              <Marker
                position={currentPosition}
                title="You are here"
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                }}
              />
            )}

            {/* Parking location markers */}
            {locations.map((loc) => (
              <Marker
                key={loc.id}
                position={loc.position}
                title={loc.name}
                onClick={() => handleMarkerClick(loc)}
                icon={{
                  url: loc.isStreetParking
                    ? "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                }}
              />
            ))}

            {/* Info window for selected location - only show if custom info window is not visible */}
            {selectedLocation && !showCustomInfoWindow && (
              <InfoWindow
                position={selectedLocation.position}
                onCloseClick={() => {
                  setSelectedLocation(null)
                  setDirectionsResponse(null)
                  setDirectionsDetails(null)
                  setDirectionsRequested(false)
                  setShowStreetParking(false)
                }}
              >
                {renderInfoWindowContent()}
              </InfoWindow>
            )}

            {/* Directions service - only active when directions are requested */}
            {directionsRequested && currentPosition && selectedLocation && (
              <DirectionsService
                options={{
                  destination: selectedLocation.position,
                  origin: currentPosition,
                  travelMode: "DRIVING",
                }}
                callback={directionsCallback}
              />
            )}

            {/* Directions renderer - only active when directions response exists */}
            {directionsResponse && (
              <DirectionsRenderer
                options={{
                  directions: directionsResponse,
                  suppressMarkers: false,
                  markerOptions: {
                    visible: false,
                  },
                }}
              />
            )}
          </GoogleMap>

          {/* Fallback message if map doesn't load */}
          {!mapLoaded && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(245, 245, 245, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                zIndex: 10,
              }}
            >
              <p>Loading map...</p>
              <p style={{ fontSize: "12px" }}>If the map doesn't appear, please check your Google Maps API key.</p>
            </div>
          )}

          {/* Custom info window in bottom right corner */}
          {renderCustomInfoWindow()}

          {/* Street parking slots panel */}
          {renderStreetParkingPanel()}

          {/* Current location button */}
          <button
            onClick={() => {
              if (mapRef && currentPosition) {
                mapRef.panTo(currentPosition)
                mapRef.setZoom(15)
              }
            }}
            style={{
              position: "absolute",
              bottom: "80px", // Moved up to avoid overlap with custom info window
              right: "20px",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "white",
              border: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 5,
            }}
          >
            <Navigation size={20} color="#4285F4" />
          </button>
        </LoadScript>
      </div>
    </div>
  )
}

export default HomePage
