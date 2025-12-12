"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { io } from "socket.io-client"
import { useNavigate } from "react-router-dom"
import "./ParkingSlots.css"

const socket = io("http://localhost:5000")

const ParkingSlots = () => {
  const [slots, setSlots] = useState([])
  const [isToggling, setIsToggling] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")
  const navigate = useNavigate()

  // Function to fetch slots
  const fetchSlots = async () => {
    try {
      console.log("🔄 Fetching slots from API...")
      const response = await axios.get("http://localhost:5000/slots")
      console.log("📡 Raw API response:", response.data)

      setSlots(response.data)
      setDebugInfo(`Fetched ${response.data.length} slots at ${new Date().toLocaleTimeString()}`)

      // Log each slot for debugging
      response.data.forEach((slot) => {
        console.log(`Slot ${slot.slot_number}: occupied=${slot.occupied}, status=${slot.status}`)
      })
    } catch (error) {
      console.error("❌ Error fetching slots:", error)
      setDebugInfo(`Error: ${error.message}`)
    }
  }

  // Navigate to pay-and-park page when building is clicked
  const handleBuildingClick = () => {
    navigate("/pay-and-park")
  }

  // Function to toggle slot status
  const toggleSlotStatus = async (slotNumber) => {
    if (isToggling) return

    setIsToggling(true)
    try {
      console.log(`🔄 Toggling slot ${slotNumber}...`)
      const response = await axios.put(`http://localhost:5000/slots/${slotNumber}/toggle`)
      console.log("✅ Toggle response:", response.data)

      // Show success message
      alert(`✅ Slot ${slotNumber} toggled! ${response.data.message}`)

      // Refresh data
      setTimeout(fetchSlots, 500)
    } catch (error) {
      console.error(`❌ Error toggling slot ${slotNumber}:`, error)
      alert(`❌ Failed to toggle slot ${slotNumber}. Error: ${error.message}`)
    } finally {
      setIsToggling(false)
    }
  }

  // Fetch slots on mount
  useEffect(() => {
    console.log("🚀 Component mounted, fetching initial data...")
    fetchSlots()

    // Listen for real-time updates
    socket.on("slotsUpdated", (updatedSlots) => {
      console.log("📡 Real-time update received:", updatedSlots)
      setSlots(updatedSlots)
      setDebugInfo(`Real-time update at ${new Date().toLocaleTimeString()}`)
    })

    return () => {
      console.log("🧹 Component unmounting, cleaning up socket...")
      socket.off("slotsUpdated")
    }
  }, [])

  // Split slots into two groups for the two sides of the road
  const half = Math.ceil(slots.length / 2)
  const leftSideSlots = slots.slice(0, half)
  const rightSideSlots = slots.slice(half)

  return (
    <div className="parking-container">
      {/* Debug Panel */}
      <div
        style={{
          padding: "15px",
          background: "#f0f8ff",
          border: "2px solid #007bff",
          margin: "10px 0",
          borderRadius: "5px",
          fontFamily: "monospace",
        }}
      >
        <h3 style={{ margin: "0 0 10px 0", color: "#007bff" }}>🐛 DEBUG INFO</h3>
        <div>
          <strong>Total slots:</strong> {slots.length}
        </div>
        <div>
          <strong>Last update:</strong> {debugInfo}
        </div>
        <div>
          <strong>Left side slots:</strong>{" "}
          {leftSideSlots.map((s) => `${s.slot_number}(${s.occupied ? "occupied" : "available"})`).join(", ")}
        </div>
        <div>
          <strong>Right side slots:</strong>{" "}
          {rightSideSlots.map((s) => `${s.slot_number}(${s.occupied ? "occupied" : "available"})`).join(", ")}
        </div>
        <button
          onClick={fetchSlots}
          style={{
            marginTop: "10px",
            padding: "5px 10px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Left side slots */}
      <div className="parking-row">
        {leftSideSlots.map((slot) => (
          <div
            key={slot.id}
            className={`parking-slot ${slot.occupied ? "occupied" : "available"}`}
            onClick={() => toggleSlotStatus(slot.slot_number)}
            style={{
              cursor: "pointer",
              border: "3px solid #000",
              position: "relative",
            }}
            title={`${slot.slot_number}: ${slot.occupied ? "OCCUPIED" : "AVAILABLE"} (Click to toggle)`}
          >
            {slot.slot_number}
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                fontSize: "10px",
                background: slot.occupied ? "#fff" : "#000",
                color: slot.occupied ? "#000" : "#fff",
                padding: "1px 3px",
                borderRadius: "2px",
              }}
            >
              {slot.occupied ? "OCC" : "AVL"}
            </div>
          </div>
        ))}
      </div>

      {/* Road */}
      <div className="road">Veer Santaji Ghorpade Road</div>

      {/* Right side slots */}
      <div className="parking-row">
        {rightSideSlots.map((slot) => (
          <div
            key={slot.id}
            className={`parking-slot ${slot.occupied ? "occupied" : "available"}`}
            onClick={() => toggleSlotStatus(slot.slot_number)}
            style={{
              cursor: "pointer",
              border: "3px solid #000",
              position: "relative",
            }}
            title={`${slot.slot_number}: ${slot.occupied ? "OCCUPIED" : "AVAILABLE"} (Click to toggle)`}
          >
            {slot.slot_number}
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "2px",
                fontSize: "10px",
                background: slot.occupied ? "#fff" : "#000",
                color: slot.occupied ? "#000" : "#fff",
                padding: "1px 3px",
                borderRadius: "2px",
              }}
            >
              {slot.occupied ? "OCC" : "AVL"}
            </div>
          </div>
        ))}
      </div>

      {/* Building */}
      <div className="building" onClick={handleBuildingClick}>
        BUILDING
      </div>
    </div>
  )
}

export default ParkingSlots
