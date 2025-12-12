"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { io } from "socket.io-client"
import "./BuildingParking.css"

const ParkingBooking = () => {
  const [availability, setAvailability] = useState({ total: 0, available: 0, booked: 0, occupied: 0 })
  const [bookingForm, setBookingForm] = useState({
    userName: "",
    vehicleNumber: "",
    phoneNumber: "",
    arrivalTime: "",
  })
  const [bookingStatus, setBookingStatus] = useState({ type: "", message: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [rate, setRate] = useState(50)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    console.log("🔌 ParkingBooking: Initializing socket connection...")

    socketRef.current = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: true,
    })

    const socket = socketRef.current

    socket.on("connect", () => {
      console.log("✅ ParkingBooking: Socket connected:", socket.id)
      setSocketConnected(true)
    })

    socket.on("disconnect", (reason) => {
      console.log("❌ ParkingBooking: Socket disconnected:", reason)
      setSocketConnected(false)
    })

    socket.on("availabilityUpdated", (newAvailability) => {
      console.log("📡 ParkingBooking: Received availability update:", newAvailability)
      if (newAvailability && typeof newAvailability === "object") {
        setAvailability({ ...newAvailability })
      }
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date())
    }

    updateTime()
    const timer = setInterval(updateTime, 60000)

    return () => clearInterval(timer)
  }, [])

  // Fetch availability and rate
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [availabilityRes, rateRes] = await Promise.all([
          axios.get("http://localhost:5000/api/availability"),
          axios.get("http://localhost:5000/api/rate"),
        ])

        setAvailability(availabilityRes.data)
        setRate(rateRes.data.ratePerHour)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBookingForm((prev) => ({ ...prev, [name]: value }))
  }

  const validateArrivalTime = (arrivalTime) => {
    if (!arrivalTime) return false

    const now = new Date()
    const arrival = new Date(arrivalTime)

    if (isNaN(arrival.getTime())) return false

    // Calculate difference in milliseconds, then convert to minutes
    const diffInMs = arrival.getTime() - now.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

    console.log("Time validation:", {
      now: now.toISOString(),
      arrival: arrival.toISOString(),
      diffInMs,
      diffInMinutes,
    })

    // Allow booking from now (including current minute) to 30 minutes ahead
    // Use -1 minute tolerance to account for small timing differences
    return diffInMinutes >= -1 && diffInMinutes <= 30
  }

  const getTimeValidationMessage = (arrivalTime) => {
    if (!arrivalTime) return ""

    const now = new Date()
    const arrival = new Date(arrivalTime)

    if (isNaN(arrival.getTime())) return "Please enter a valid date and time"

    // Calculate difference in milliseconds, then convert to minutes
    const diffInMs = arrival.getTime() - now.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

    console.log("Validation check:", {
      now: now.toLocaleString(),
      arrival: arrival.toLocaleString(),
      diffInMinutes,
      nowISO: now.toISOString(),
      arrivalISO: arrival.toISOString(),
    })

    // Allow 2 minute tolerance for past times to account for timing differences
    if (diffInMinutes < -2) {
      return "Arrival time cannot be in the past"
    }

    if (diffInMinutes > 30) {
      return "Arrival time cannot be more than 30 minutes from now"
    }

    return ""
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()

    const timeValidationMessage = getTimeValidationMessage(bookingForm.arrivalTime)
    if (timeValidationMessage) {
      setBookingStatus({
        type: "error",
        message: timeValidationMessage,
      })
      setTimeout(() => {
        setBookingStatus({ type: "", message: "" })
      }, 5000)
      return
    }

    setIsLoading(true)

    try {
      console.log("🚗 ParkingBooking: Submitting booking...")

      const response = await axios.post("http://localhost:5000/api/book-parking", {
        userName: bookingForm.userName,
        vehicleNumber: bookingForm.vehicleNumber.toUpperCase(),
        phoneNumber: bookingForm.phoneNumber.replace(/\D/g, ""),
        arrivalTime: bookingForm.arrivalTime,
      })

      console.log("✅ ParkingBooking: Booking successful:", response.data)

      setBookingStatus({
        type: "success",
        message: `🎉 Booking Successful! Your parking slot ${response.data.slotNumber} on Floor ${response.data.floor} is reserved.`,
      })

      // Reset form
      setBookingForm({
        userName: "",
        vehicleNumber: "",
        phoneNumber: "",
        arrivalTime: "",
      })

      setTimeout(() => {
        setBookingStatus({ type: "", message: "" })
      }, 8000)
    } catch (error) {
      console.error("ParkingBooking: Booking error:", error)
      setBookingStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to book parking slot. Please try again.",
      })

      setTimeout(() => {
        setBookingStatus({ type: "", message: "" })
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "")
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join("-")
    }
    return value
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setBookingForm((prev) => ({ ...prev, phoneNumber: formatted }))
  }

  const getCurrentTimeDisplay = () => {
    return currentTime.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getMaxTimeDisplay = () => {
    const maxTime = new Date(currentTime.getTime() + 30 * 60 * 1000)
    return maxTime.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getMinTimeDisplay = () => {
    return currentTime.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Set minimum and maximum arrival time with proper local time handling
  useEffect(() => {
    const now = new Date()

    // Create local datetime strings without timezone conversion issues
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")

    // Set minimum time to current time
    const minTimeString = `${year}-${month}-${day}T${hours}:${minutes}`

    // Set maximum time to current time + 30 minutes
    const maxTime = new Date(now.getTime() + 30 * 60 * 1000)
    const maxYear = maxTime.getFullYear()
    const maxMonth = String(maxTime.getMonth() + 1).padStart(2, "0")
    const maxDay = String(maxTime.getDate()).padStart(2, "0")
    const maxHours = String(maxTime.getHours()).padStart(2, "0")
    const maxMinutes = String(maxTime.getMinutes()).padStart(2, "0")

    const maxTimeString = `${maxYear}-${maxMonth}-${maxDay}T${maxHours}:${maxMinutes}`

    const arrivalTimeInput = document.getElementById("arrivalTime")
    if (arrivalTimeInput) {
      arrivalTimeInput.setAttribute("min", minTimeString)
      arrivalTimeInput.setAttribute("max", maxTimeString)

      // Set a default value if none exists
      if (!bookingForm.arrivalTime) {
        const defaultTime = new Date(now.getTime() + 5 * 60 * 1000) // 5 minutes from now
        const defaultYear = defaultTime.getFullYear()
        const defaultMonth = String(defaultTime.getMonth() + 1).padStart(2, "0")
        const defaultDay = String(defaultTime.getDate()).padStart(2, "0")
        const defaultHours = String(defaultTime.getHours()).padStart(2, "0")
        const defaultMinutes = String(defaultTime.getMinutes()).padStart(2, "0")
        const defaultTimeString = `${defaultYear}-${defaultMonth}-${defaultDay}T${defaultHours}:${defaultMinutes}`

        setBookingForm((prev) => ({ ...prev, arrivalTime: defaultTimeString }))
      }
    }

    console.log("Time constraints set:", {
      min: minTimeString,
      max: maxTimeString,
      current: `${year}-${month}-${day}T${hours}:${minutes}`,
    })
  }, [currentTime])

  const timeValidationMessage = getTimeValidationMessage(bookingForm.arrivalTime)

  return (
    <div className="parking-booking-container">
      <div className="booking-header">
        <div className="header-content">
          <h1>🚗 Smart Parking</h1>
          <p>Reserve your parking spot in advance</p>
          <div className="current-time">
            <span className="time-label">Current Time:</span>
            <span className="time-value">{getCurrentTimeDisplay()}</span>
          </div>
          <div className="socket-status-booking">
            <span className={`status-indicator ${socketConnected ? "connected" : "disconnected"}`}></span>
            <span className="status-text">{socketConnected ? "Live Updates" : "Offline"}</span>
          </div>
        </div>

        <div className="availability-card">
          <div className="availability-header">
            <h3>Live Availability</h3>
            <div className="refresh-indicator">
              <div className="pulse-dot"></div>
              <span>Live</span>
            </div>
          </div>
          <div className="availability-stats">
            <div className="stat-item available">
              <div className="stat-number">{availability.available}</div>
              <div className="stat-label">Available</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item total">
              <div className="stat-number">{availability.total}</div>
              <div className="stat-label">Total Spots</div>
            </div>
          </div>
          <div className="rate-info">
            <span>₹{rate}/hour</span>
          </div>
        </div>
      </div>

      {bookingStatus.message && (
        <div className={`booking-alert ${bookingStatus.type}`}>
          <div className="alert-content">{bookingStatus.message}</div>
        </div>
      )}

      <div className="booking-card">
        <div className="card-header">
          <h2>Book Your Parking Spot</h2>
          <p>Fill in your details to reserve a parking space</p>
        </div>

        <form onSubmit={handleBookingSubmit} className="booking-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="userName">
                <span className="label-icon">👤</span>
                Full Name
              </label>
              <input
                type="text"
                id="userName"
                name="userName"
                value={bookingForm.userName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">
                <span className="label-icon">📱</span>
                Phone Number
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={bookingForm.phoneNumber}
                onChange={handlePhoneChange}
                placeholder="123-456-7890"
                maxLength="12"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="vehicleNumber">
              <span className="label-icon">🚗</span>
              Vehicle Number
            </label>
            <input
              type="text"
              id="vehicleNumber"
              name="vehicleNumber"
              value={bookingForm.vehicleNumber}
              onChange={handleInputChange}
              placeholder="e.g., MH 01 AB 1234"
              style={{ textTransform: "uppercase" }}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="arrivalTime">
              <span className="label-icon">⏰</span>
              Expected Arrival Time
            </label>
            <input
              type="datetime-local"
              id="arrivalTime"
              name="arrivalTime"
              value={bookingForm.arrivalTime}
              onChange={handleInputChange}
              required
            />
            <div className="time-constraint">
              <span className="constraint-icon">ℹ️</span>
              <span>
                Book from {getMinTimeDisplay()} to {getMaxTimeDisplay()} today
              </span>
            </div>
            {timeValidationMessage && (
              <div className="validation-message error">
                <span className="validation-icon">⚠️</span>
                <span>{timeValidationMessage}</span>
              </div>
            )}
            {bookingForm.arrivalTime && !timeValidationMessage && (
              <div className="validation-message success">
                <span className="validation-icon">✅</span>
                <span>Valid arrival time selected</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className={`book-button ${isLoading ? "loading" : ""}`}
            disabled={isLoading || availability.available === 0 || !!timeValidationMessage}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                <span>Booking...</span>
              </>
            ) : availability.available === 0 ? (
              <>
                <span>❌ No Spots Available</span>
              </>
            ) : timeValidationMessage ? (
              <>
                <span>⚠️ Invalid Time Selected</span>
              </>
            ) : (
              <>
                <span>🎯 Book Parking Spot</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>📋 Booking Guidelines</h3>
          <ul>
            <li>Bookings can be made for immediate arrival up to 30 minutes ahead</li>
            <li>Please arrive within your specified time window</li>
            <li>Contact support if you need to modify your booking</li>
            <li>Payment is collected upon departure</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ParkingBooking
