"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { io } from "socket.io-client"
import { Landmark, Store, Coffee, School } from "lucide-react"
import "./street-parking-slots.css"

const StreetParkingSlots = () => {
  // State for slots from database
  const [slots, setSlots] = useState([])
  const [lastUpdate, setLastUpdate] = useState("")
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef(null)

  // Initialize socket connection with better error handling
  useEffect(() => {
    console.log("🔌 Initializing Socket.io connection for street parking...")

    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true,
    })

    const socket = socketRef.current

    // Connection event handlers
    socket.on("connect", () => {
      console.log("✅ Street parking socket connected:", socket.id)
      setSocketConnected(true)
    })

    socket.on("disconnect", (reason) => {
      console.log("❌ Street parking socket disconnected:", reason)
      setSocketConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("🔥 Street parking socket connection error:", error)
      setSocketConnected(false)
    })

    // Listen for real-time slot updates
    socket.on("slotsUpdated", (updatedSlots) => {
      console.log("📡 REAL-TIME UPDATE: Street parking slots updated:", updatedSlots)

      // Transform updated data to match component structure
      const transformedSlots = updatedSlots.map((slot) => ({
        id: slot.id,
        slot_number: slot.slot_number,
        occupied: slot.occupied || slot.status === "occupied", // Handle both fields
        accessible: slot.slot_number === "A3", // Make A3 accessible for demo
        position: slot.slot_number.startsWith("A") ? "top" : "bottom",
      }))

      setSlots(transformedSlots)
      setLastUpdate(new Date().toLocaleTimeString())

      // Visual feedback for real-time update
      const container = document.querySelector(".street-slots-container")
      if (container) {
        container.style.boxShadow = "0 0 20px rgba(76, 175, 80, 0.5)"
        setTimeout(() => {
          container.style.boxShadow = "none"
        }, 1000)
      }
    })

    return () => {
      console.log("🧹 Cleaning up street parking socket connection...")
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Function to fetch slots from database
  const fetchSlots = async () => {
    try {
      console.log("🔄 Fetching street parking slots from database...")
      const response = await axios.get("http://localhost:5000/slots")
      console.log("📡 Fetched slots:", response.data)

      // Transform database data to match component structure
      const transformedSlots = response.data.map((slot) => ({
        id: slot.id,
        slot_number: slot.slot_number,
        occupied: slot.occupied || slot.status === "occupied", // Handle both fields
        accessible: slot.slot_number === "A3", // Make A3 accessible for demo
        position: slot.slot_number.startsWith("A") ? "top" : "bottom",
      }))

      setSlots(transformedSlots)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (error) {
      console.error("❌ Error fetching slots:", error)
    }
  }

  // Fetch slots on component mount
  useEffect(() => {
    fetchSlots()
  }, [])

  // Landmarks near Veer Santaji Ghorpade Road
  const landmarks = [
    {
      id: 1,
      name: "Shaniwar Wada",
      type: "historical",
      position: "top",
      icon: Landmark,
      description: "Historic fortification in the city of Pune",
    },
    {
      id: 2,
      name: "Laxmi Road Shopping",
      type: "commercial",
      position: "top",
      icon: Store,
      description: "Popular shopping street with various stores",
    },
    {
      id: 3,
      name: "Parvati Hill Temple",
      type: "religious",
      position: "bottom",
      icon: Landmark,
      description: "Historic temple complex on a hill",
    },
    {
      id: 4,
      name: "Vaishali Restaurant",
      type: "restaurant",
      position: "bottom",
      icon: Coffee,
      description: "Famous restaurant known for South Indian cuisine",
    },
    {
      id: 5,
      name: "Deccan College",
      type: "educational",
      position: "bottom",
      icon: School,
      description: "One of the oldest institutions of modern learning in India",
    },
  ]

  return (
    <div className="street-slots-container" style={{ transition: "box-shadow 0.3s ease" }}>
      <div className="street-slots-header">
        <h3>Veer Santaji Ghorpade Road</h3>
        <p>Street Parking Availability</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: socketConnected ? "#4caf50" : "#f44336",
                animation: socketConnected ? "pulse 2s infinite" : "none",
              }}
            ></div>
            <span style={{ fontSize: "12px", color: "#666" }}>{socketConnected ? "Live Updates" : "Offline"}</span>
          </div>
        </div>
      </div>

      <div className="street-slots-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color occupied"></div>
          <span>Occupied</span>
        </div>
        <div className="legend-item">
          <div className="legend-color accessible"></div>
          <span>Accessible</span>
        </div>
      </div>

      <div className="street-slots-map">
        {/* Landmarks on top side */}
        <div className="landmarks-row top-landmarks">
          {landmarks
            .filter((landmark) => landmark.position === "top")
            .map((landmark) => (
              <div key={landmark.id} className="landmark-building">
                <div className="building-3d">
                  <div className="building-roof"></div>
                  <div className="building-facade">
                    <landmark.icon className="landmark-icon" />
                  </div>
                </div>
                <span className="landmark-name">{landmark.name}</span>
              </div>
            ))}
        </div>

        {/* Top row of parking slots */}
        <div className="slots-row top-row">
          {slots
            .filter((slot) => slot.position === "top")
            .map((slot) => (
              <div
                key={slot.id}
                data-slot={slot.slot_number}
                className={`parking-slot ${slot.occupied ? "occupied" : "available"} ${
                  slot.accessible ? "accessible" : ""
                }`}
                style={{
                  transition: "all 0.3s ease",
                }}
              >
                <span className="slot-number">{slot.slot_number}</span>
              </div>
            ))}
        </div>

        {/* Road */}
        <div className="street-road">
          <div className="road-marking"></div>
          <div className="road-name">Veer Santaji Ghorpade Road</div>
        </div>

        {/* Bottom row of parking slots */}
        <div className="slots-row bottom-row">
          {slots
            .filter((slot) => slot.position === "bottom")
            .map((slot) => (
              <div
                key={slot.id}
                data-slot={slot.slot_number}
                className={`parking-slot ${slot.occupied ? "occupied" : "available"} ${
                  slot.accessible ? "accessible" : ""
                }`}
                style={{
                  transition: "all 0.3s ease",
                }}
              >
                <span className="slot-number">{slot.slot_number}</span>
              </div>
            ))}
        </div>

        {/* Landmarks on bottom side */}
        <div className="landmarks-row bottom-landmarks">
          {landmarks
            .filter((landmark) => landmark.position === "bottom")
            .map((landmark) => (
              <div key={landmark.id} className="landmark-building">
                <div className="building-3d">
                  <div className="building-roof"></div>
                  <div className="building-facade">
                    <landmark.icon className="landmark-icon" />
                  </div>
                </div>
                <span className="landmark-name">{landmark.name}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="street-slots-stats">
        <div className="stat">
          <div className="stat-value">{slots.filter((s) => !s.occupied).length}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat">
          <div className="stat-value">{slots.filter((s) => s.occupied).length}</div>
          <div className="stat-label">Occupied</div>
        </div>
        <div className="stat">
          <div className="stat-value">{slots.filter((s) => s.accessible && !s.occupied).length}</div>
          <div className="stat-label">Accessible</div>
        </div>
      </div>

      <div className="street-slots-nearby">
        <h4>Nearby Landmarks</h4>
        <div className="landmarks-grid">
          {landmarks.map((landmark) => (
            <div key={landmark.id} className="landmark-card">
              <div className="landmark-icon-container">
                <landmark.icon size={24} />
              </div>
              <div className="landmark-info">
                <h5>{landmark.name}</h5>
                <p>{landmark.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default StreetParkingSlots
