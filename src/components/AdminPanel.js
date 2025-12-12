"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { io } from "socket.io-client"
import "./AdminPanel.css"

const AdminPanel = () => {
  const [bookings, setBookings] = useState([])
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false)
  const [checkoutAmount, setCheckoutAmount] = useState("")
  const [activeTab, setActiveTab] = useState("bookings")
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [currentRate, setCurrentRate] = useState(50)
  const [newRateValue, setNewRateValue] = useState("")
  const [availability, setAvailability] = useState({ total: 0, available: 0, booked: 0, occupied: 0 })
  const [walkinForm, setWalkinForm] = useState({
    userName: "",
    vehicleNumber: "",
    phoneNumber: "",
  })
  const [walkinStatus, setWalkinStatus] = useState({ type: "", message: "" })
  const [isWalkinLoading, setIsWalkinLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef(null)

  // Initialize socket connection
  useEffect(() => {
    console.log("🔌 Initializing socket connection...")

    // Create socket connection
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
      console.log("✅ Socket connected:", socket.id)
      setSocketConnected(true)
    })

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason)
      setSocketConnected(false)
    })

    socket.on("connect_error", (error) => {
      console.error("🔥 Socket connection error:", error)
      setSocketConnected(false)
    })

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts")
      setSocketConnected(true)
    })

    // Data event handlers
    socket.on("availabilityUpdated", (newAvailability) => {
      console.log("📡 Received availability update:", newAvailability)
      if (newAvailability && typeof newAvailability === "object") {
        setAvailability((prev) => {
          const changes = Object.keys(newAvailability)
            .filter((key) => newAvailability[key] !== prev[key])
            .map((key) => `${key}: ${prev[key]} → ${newAvailability[key]}`)

          if (changes.length > 0) {
            console.log("📊 Availability changes:", changes.join(", "))
          }

          return { ...newAvailability }
        })
      }
    })

    socket.on("bookingsUpdated", (newBookings) => {
      console.log("📡 Received bookings update:", newBookings?.length || 0, "bookings")
      if (Array.isArray(newBookings)) {
        // Ensure we maintain the booking data integrity
        setBookings((prevBookings) => {
          // Only update if the data is actually different
          if (JSON.stringify(prevBookings) !== JSON.stringify(newBookings)) {
            console.log("📋 Bookings data updated:", {
              previous: prevBookings.length,
              new: newBookings.length,
              completed: newBookings.filter((b) => b.payment_status === "completed").length,
            })
            return [...newBookings]
          }
          return prevBookings
        })
      }
    })

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket connection...")
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true)
        console.log("📥 Fetching initial data...")

        // Fetch availability
        try {
          const availabilityResponse = await axios.get("http://localhost:5000/api/availability")
          console.log("📊 Initial availability:", availabilityResponse.data)
          setAvailability(availabilityResponse.data || { total: 0, available: 0, booked: 0, occupied: 0 })
        } catch (error) {
          console.error("❌ Error fetching availability:", error)
          setAvailability({ total: 0, available: 0, booked: 0, occupied: 0 })
        }

        // Fetch bookings
        try {
          const bookingsResponse = await axios.get("http://localhost:5000/api/bookings")
          console.log("📋 Initial bookings:", bookingsResponse.data?.length || 0, "bookings")
          setBookings(bookingsResponse.data || [])
        } catch (error) {
          console.error("❌ Error fetching bookings:", error)
          setBookings([])
        }

        // Fetch rate
        try {
          const rateResponse = await axios.get("http://localhost:5000/api/rate")
          setCurrentRate(rateResponse.data?.ratePerHour || 50)
        } catch (error) {
          console.error("❌ Error fetching rate:", error)
          setCurrentRate(50)
        }

        setIsLoading(false)
      } catch (error) {
        console.error("❌ Error fetching initial data:", error)
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Calculate parking fee based on time difference
  const calculateParkingFee = (booking) => {
    if (!booking) return 0

    const arrivalTime = new Date(booking.arrival_time)
    const departureTime = new Date()

    // Calculate hours difference (minimum 1 hour)
    const hoursDiff = Math.max(1, Math.ceil((departureTime - arrivalTime) / (1000 * 60 * 60)))

    return currentRate * hoursDiff
  }

  const handleCheckout = (booking) => {
    setSelectedBooking(booking)
    setCheckoutAmount(calculateParkingFee(booking).toString())
    setIsCheckoutModalOpen(true)
  }

  const handleCompleteBooking = async () => {
    try {
      console.log("💰 Completing booking:", selectedBooking.id, "Amount:", checkoutAmount)

      await axios.put(`http://localhost:5000/api/bookings/${selectedBooking.id}/complete`, {
        amount: Number.parseFloat(checkoutAmount),
      })

      console.log("✅ Booking completion request sent")

      setIsCheckoutModalOpen(false)
      setSelectedBooking(null)

      // The real-time updates should handle the refresh automatically
      // But let's also manually refresh after a short delay as backup
      // Remove this entire setTimeout block as well:
      // setTimeout(async () => {
      //   try {
      //     const [availabilityRes, bookingsRes] = await Promise.all([
      //       axios.get("http://localhost:5000/api/availability"),
      //       axios.get("http://localhost:5000/api/bookings"),
      //     ])
      //     setAvailability(availabilityRes.data)
      //     setBookings(bookingsRes.data)
      //     console.log("🔄 Manual refresh completed as backup")
      //   } catch (error) {
      //     console.error("❌ Manual refresh failed:", error)
      //   }
      // }, 1000)
    } catch (error) {
      console.error("❌ Error completing booking:", error)
    }
  }

  const handleEditRate = () => {
    setNewRateValue(currentRate.toString())
    setIsRateModalOpen(true)
  }

  const handleUpdateRate = async () => {
    try {
      await axios.put("http://localhost:5000/api/rate", {
        ratePerHour: Number.parseFloat(newRateValue),
      })

      setIsRateModalOpen(false)
      setCurrentRate(Number.parseFloat(newRateValue))
    } catch (error) {
      console.error("Error updating rate:", error)
    }
  }

  const handleWalkinInputChange = (e) => {
    const { name, value } = e.target
    setWalkinForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleWalkinSubmit = async (e) => {
    e.preventDefault()
    setIsWalkinLoading(true)

    try {
      console.log("🚶 Creating walk-in booking...")

      const response = await axios.post("http://localhost:5000/api/walkin-booking", {
        userName: walkinForm.userName,
        vehicleNumber: walkinForm.vehicleNumber.toUpperCase(),
        phoneNumber: walkinForm.phoneNumber.replace(/\D/g, ""),
      })

      console.log("✅ Walk-in booking created:", response.data)

      setWalkinStatus({
        type: "success",
        message: `Walk-in booking successful! Customer assigned to Slot ${response.data.slotNumber} on Floor ${response.data.floor}. Customer is now parked!`,
      })

      // Reset form
      setWalkinForm({
        userName: "",
        vehicleNumber: "",
        phoneNumber: "",
      })

      // Clear success message after 8 seconds
      setTimeout(() => {
        setWalkinStatus({ type: "", message: "" })
      }, 8000)

      // Manual refresh as backup
      // Remove this entire setTimeout block as it's causing conflicts:
      // setTimeout(async () => {
      //   try {
      //     const [availabilityRes, bookingsRes] = await Promise.all([
      //       axios.get("http://localhost:5000/api/availability"),
      //       axios.get("http://localhost:5000/api/bookings"),
      //     ])
      //     setAvailability(availabilityRes.data)
      //     setBookings(bookingsRes.data)
      //     console.log("🔄 Manual refresh after walk-in booking")
      //   } catch (error) {
      //     console.error("❌ Manual refresh failed:", error)
      //   }
      // }, 1000)
    } catch (error) {
      console.error("❌ Walk-in booking error:", error)
      setWalkinStatus({
        type: "error",
        message: error.response?.data?.error || "Failed to create walk-in booking. Please try again.",
      })

      setTimeout(() => {
        setWalkinStatus({ type: "", message: "" })
      }, 5000)
    } finally {
      setIsWalkinLoading(false)
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

  const handleWalkinPhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setWalkinForm((prev) => ({ ...prev, phoneNumber: formatted }))
  }

  // Test function to manually trigger updates (for debugging)
  const testUpdate = async () => {
    try {
      await axios.post("http://localhost:5000/api/test-update")
      console.log("🧪 Manual update test triggered")
    } catch (error) {
      console.error("❌ Test update failed:", error)
    }
  }

  // Manual trigger for expired bookings update
  const triggerExpiredBookingsUpdate = async () => {
    try {
      await axios.post("http://localhost:5000/api/update-expired-bookings")
      console.log("🕐 Manual expired bookings update triggered")
    } catch (error) {
      console.error("❌ Expired bookings update failed:", error)
    }
  }

  // Filter bookings by search term
  const filteredBookings = bookings.filter(
    (booking) =>
      booking.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.phone_number?.includes(searchTerm),
  )

  // Calculate statistics with better error handling
  const totalRevenue = bookings
    .filter((booking) => booking.payment_status === "completed" && booking.amount)
    .reduce((sum, booking) => {
      const amount = Number(booking.amount) || 0
      return sum + amount
    }, 0)

  const pendingBookings = bookings.filter((booking) => booking.payment_status === "pending").length
  const activeBookings = bookings.filter((booking) => booking.payment_status === "active").length
  const completedBookings = bookings.filter((booking) => booking.payment_status === "completed").length

  return (
    <div className="admin-panel-container">
      <header className="admin-header">
        <h1>Smart Parking Admin</h1>
        <p>Manage bookings and monitor parking operations</p>
        <div className="socket-status">
          <span className={`status-indicator ${socketConnected ? "connected" : "disconnected"}`}></span>
          <span className="status-text">
            {socketConnected ? "Live Updates Connected" : "Live Updates Disconnected"}
          </span>
          <button onClick={testUpdate} className="test-button">
            Test Update
          </button>
          <button onClick={triggerExpiredBookingsUpdate} className="test-button">
            Update Expired
          </button>
        </div>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <h3>Total Slots</h3>
              <div className="stat-value">{availability.total}</div>
            </div>
            <div className="stat-icon">🅿️</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <h3>Available</h3>
              <div className="stat-value available">{availability.available}</div>
            </div>
            <div className="stat-icon">✅</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <h3>Booked</h3>
              <div className="stat-value booked">{availability.booked}</div>
            </div>
            <div className="stat-icon">📅</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <h3>Occupied</h3>
              <div className="stat-value occupied">{availability.occupied}</div>
            </div>
            <div className="stat-icon">🚗</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <h3>Total Revenue</h3>
              <div className="stat-value">₹{(totalRevenue || 0).toFixed(2)}</div>
            </div>
            <div className="stat-icon">💰</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <h3>Active/Pending</h3>
              <div className="stat-value">{pendingBookings + activeBookings}</div>
            </div>
            <div className="stat-icon">⏳</div>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === "bookings" ? "active" : ""} onClick={() => setActiveTab("bookings")}>
          Bookings ({bookings.length})
        </button>
        <button className={activeTab === "walkin" ? "active" : ""} onClick={() => setActiveTab("walkin")}>
          Walk-in Booking
        </button>
        <button className={activeTab === "rates" ? "active" : ""} onClick={() => setActiveTab("rates")}>
          Parking Rate
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner-icon">🔄</div>
          <p>Loading admin data...</p>
        </div>
      ) : (
        <div className="admin-content">
          {activeTab === "bookings" && (
            <div className="bookings-section">
              <div className="section-header">
                <div>
                  <h2>Booking Management</h2>
                  <p>Monitor and manage all parking bookings</p>
                </div>
                <div className="booking-stats">
                  <span className="stat-chip pending">Pending: {pendingBookings}</span>
                  <span className="stat-chip active">Active: {activeBookings}</span>
                  <span className="stat-chip completed">Completed: {completedBookings}</span>
                </div>
              </div>

              <div className="search-bar">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name, vehicle number or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-container">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Slot</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Booking Time</th>
                      <th>Arrival Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="no-data">
                          <div className="no-data-content">
                            <span className="no-data-icon">📭</span>
                            <p>No bookings found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            <span className="booking-id">#{booking.id}</span>
                          </td>
                          <td>
                            <div className="slot-info">
                              <span className="slot-number">{booking.slot_number}</span>
                              <span className="floor-info">Floor {booking.floor_number}</span>
                            </div>
                          </td>
                          <td>
                            <div className="user-info">
                              <span className="user-name">{booking.user_name}</span>
                              <span className="user-phone">{booking.phone_number}</span>
                            </div>
                          </td>
                          <td>
                            <span className="vehicle-number">{booking.vehicle_number}</span>
                          </td>
                          <td>
                            <span className="booking-time">{new Date(booking.booking_time).toLocaleString()}</span>
                          </td>
                          <td>
                            <span className="arrival-time">{new Date(booking.arrival_time).toLocaleString()}</span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${booking.payment_status} ${booking.booking_type || "regular"}`}
                            >
                              {booking.payment_status === "pending" && "Pending"}
                              {booking.payment_status === "active" && "Active"}
                              {booking.payment_status === "completed" && "Completed"}
                              {booking.booking_type === "walkin" && booking.payment_status === "active" && " (Walk-in)"}
                            </span>
                          </td>
                          <td>
                            {booking.payment_status === "pending" || booking.payment_status === "active" ? (
                              <button className="checkout-button" onClick={() => handleCheckout(booking)}>
                                Checkout
                              </button>
                            ) : (
                              <div className="completed-info">
                                <span className="completed-text">Paid</span>
                                <span className="amount">₹{booking.amount}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "walkin" && (
            <div className="walkin-section">
              <div className="section-header">
                <div>
                  <h2>Walk-in Booking</h2>
                  <p>Create instant bookings for customers who arrive without prior reservation</p>
                </div>
              </div>

              {walkinStatus.message && (
                <div className={`walkin-alert ${walkinStatus.type}`}>
                  <div className="alert-content">{walkinStatus.message}</div>
                </div>
              )}

              <div className="walkin-availability">
                <div className="availability-summary">
                  <div className="summary-item">
                    <span className="summary-icon">🅿️</span>
                    <span className="summary-text">Available Slots: {availability.available}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🚗</span>
                    <span className="summary-text">Occupied Slots: {availability.occupied}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">💰</span>
                    <span className="summary-text">Current Rate: ₹{currentRate}/hour</span>
                  </div>
                </div>
              </div>

              <div className="walkin-form-container">
                <form onSubmit={handleWalkinSubmit} className="walkin-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="walkinUserName">
                        <span className="label-icon">👤</span>
                        Customer Name
                      </label>
                      <input
                        type="text"
                        id="walkinUserName"
                        name="userName"
                        value={walkinForm.userName}
                        onChange={handleWalkinInputChange}
                        placeholder="Enter customer's full name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="walkinPhoneNumber">
                        <span className="label-icon">📱</span>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="walkinPhoneNumber"
                        name="phoneNumber"
                        value={walkinForm.phoneNumber}
                        onChange={handleWalkinPhoneChange}
                        placeholder="123-456-7890"
                        maxLength="12"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="walkinVehicleNumber">
                      <span className="label-icon">🚗</span>
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      id="walkinVehicleNumber"
                      name="vehicleNumber"
                      value={walkinForm.vehicleNumber}
                      onChange={handleWalkinInputChange}
                      placeholder="e.g., MH 01 AB 1234"
                      style={{ textTransform: "uppercase" }}
                      required
                    />
                  </div>

                  <div className="walkin-info">
                    <div className="info-item">
                      <span className="info-icon">⚡</span>
                      <span>Customer can park immediately after booking</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">🎯</span>
                      <span>Next available slot will be automatically assigned</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">🚗</span>
                      <span>Slot status will be set to "Occupied" immediately</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`walkin-button ${isWalkinLoading ? "loading" : ""}`}
                    disabled={isWalkinLoading || availability.available === 0}
                  >
                    {isWalkinLoading ? (
                      <>
                        <div className="spinner"></div>
                        <span>Creating Booking...</span>
                      </>
                    ) : availability.available === 0 ? (
                      <>
                        <span>No Slots Available</span>
                      </>
                    ) : (
                      <>
                        <span>Create Instant Walk-in Booking</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "rates" && (
            <div className="rates-section">
              <div className="section-header">
                <div>
                  <h2>Parking Rate Management</h2>
                  <p>Configure hourly parking rates</p>
                </div>
              </div>

              <div className="rate-card">
                <div className="rate-info">
                  <div className="rate-icon">🚗</div>
                  <div className="rate-details">
                    <h3>Four Wheeler Parking</h3>
                    <p>Current rate for all vehicles</p>
                  </div>
                  <div className="rate-value">
                    <span className="currency">₹</span>
                    <span className="amount">{currentRate}</span>
                    <span className="unit">/hour</span>
                  </div>
                  <button className="edit-rate-button" onClick={handleEditRate}>
                    Edit Rate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutModalOpen && selectedBooking && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Complete Booking</h2>
              <button className="close-button" onClick={() => setIsCheckoutModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="booking-details">
              <div className="detail-row">
                <span className="label">Customer:</span>
                <span className="value">{selectedBooking.user_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Vehicle:</span>
                <span className="value">{selectedBooking.vehicle_number}</span>
              </div>
              <div className="detail-row">
                <span className="label">Slot:</span>
                <span className="value">
                  {selectedBooking.slot_number} (Floor {selectedBooking.floor_number})
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Arrival:</span>
                <span className="value">{new Date(selectedBooking.arrival_time).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Current Time:</span>
                <span className="value">{new Date().toLocaleString()}</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount to Collect (₹):</label>
              <input
                type="number"
                id="amount"
                value={checkoutAmount}
                onChange={(e) => setCheckoutAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setIsCheckoutModalOpen(false)}>
                Cancel
              </button>
              <button className="confirm-button" onClick={handleCompleteBooking}>
                Complete & Collect Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Edit Modal */}
      {isRateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Edit Parking Rate</h2>
              <button className="close-button" onClick={() => setIsRateModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="rate-edit-content">
              <div className="current-rate-display">
                <span className="label">Current Rate:</span>
                <span className="current-rate">₹{currentRate}/hour</span>
              </div>

              <div className="form-group">
                <label htmlFor="rateValue">New Rate per Hour (₹):</label>
                <input
                  type="number"
                  id="rateValue"
                  value={newRateValue}
                  onChange={(e) => setNewRateValue(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Enter new rate"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setIsRateModalOpen(false)}>
                Cancel
              </button>
              <button className="confirm-button" onClick={handleUpdateRate}>
                Update Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel
