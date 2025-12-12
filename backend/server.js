require("dotenv").config()
const express = require("express")
const cors = require("cors")
const mysql = require("mysql2/promise")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
app.use(express.json())
app.use(cors())

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.url} from ${req.ip}`)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${timestamp}] Body:`, JSON.stringify(req.body))
  }
  next()
})

// Create MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "parking_system",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Test database connection and setup
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection()
    console.log("✅ Database connected successfully")

    // Check and create street_parking_slots table
    const [streetTables] = await connection.query("SHOW TABLES LIKE 'street_parking_slots'")
    if (streetTables.length === 0) {
      console.log("🔧 Creating street_parking_slots table...")
      await connection.query(`
        CREATE TABLE IF NOT EXISTS street_parking_slots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slot_number VARCHAR(10) NOT NULL UNIQUE,
          status ENUM('available', 'occupied') DEFAULT 'available',
          occupied BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `)

      await connection.query(`
        INSERT INTO street_parking_slots (slot_number, status, occupied) VALUES
        ('A1', 'available', FALSE),
        ('A2', 'available', FALSE),
        ('A3', 'available', FALSE),
        ('B1', 'available', FALSE),
        ('B2', 'available', FALSE),
        ('B3', 'available', FALSE)
      `)
      console.log("✅ Created street_parking_slots table")
    }

    // Check existing tables
    const [allTables] = await connection.query("SHOW TABLES")
    console.log("📊 Available tables:", allTables.map((t) => Object.values(t)[0]).join(", "))

    connection.release()
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    console.log("🔧 Using in-memory storage for street parking")

    global.inMemorySlots = [
      { id: 1, slot_number: "A1", status: "available", occupied: false, last_updated: new Date().toISOString() },
      { id: 2, slot_number: "A2", status: "available", occupied: false, last_updated: new Date().toISOString() },
      { id: 3, slot_number: "A3", status: "available", occupied: false, last_updated: new Date().toISOString() },
      { id: 4, slot_number: "B1", status: "available", occupied: false, last_updated: new Date().toISOString() },
      { id: 5, slot_number: "B2", status: "available", occupied: false, last_updated: new Date().toISOString() },
      { id: 6, slot_number: "B3", status: "available", occupied: false, last_updated: new Date().toISOString() },
    ]
  }
}

// Create HTTP Server
const server = http.createServer(app)

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
})

let connectedClients = 0

io.on("connection", (socket) => {
  connectedClients++
  console.log(`✅ Client connected: ${socket.id} (Total: ${connectedClients})`)

  // Send initial data to newly connected client
  setTimeout(() => {
    emitBuildingUpdates()
    emitStreetUpdates()
  }, 500)

  socket.on("disconnect", () => {
    connectedClients--
    console.log(`❌ Client disconnected: ${socket.id} (Total: ${connectedClients})`)
  })
})

// Helper function to emit building parking updates
const emitBuildingUpdates = async () => {
  try {
    console.log(`📡 Emitting building parking updates to ${connectedClients} connected clients...`)

    // Get fresh availability data for building parking
    const [totalSlots] = await pool.query("SELECT COUNT(*) as total FROM parking_slots")
    const [availableSlots] = await pool.query(
      "SELECT COUNT(*) as available FROM parking_slots WHERE status = 'available'",
    )
    const [bookedSlots] = await pool.query("SELECT COUNT(*) as booked FROM parking_slots WHERE status = 'booked'")
    const [occupiedSlots] = await pool.query("SELECT COUNT(*) as occupied FROM parking_slots WHERE status = 'occupied'")

    const availability = {
      total: totalSlots[0].total,
      available: availableSlots[0].available,
      booked: bookedSlots[0].booked,
      occupied: occupiedSlots[0].occupied,
    }

    // Get fresh bookings data
    const [bookings] = await pool.query(`
      SELECT b.*, p.slot_number, p.floor_number
      FROM bookings b
      JOIN parking_slots p ON b.slot_id = p.id
      ORDER BY b.created_at DESC
    `)

    // Emit to ALL connected clients
    io.emit("availabilityUpdated", availability)
    io.emit("bookingsUpdated", bookings)

    console.log("✅ Building parking updates emitted successfully!")
  } catch (error) {
    console.error("❌ Error emitting building parking updates:", error.message)
  }
}

// Helper function to emit street parking updates
const emitStreetUpdates = async () => {
  try {
    console.log(`📡 Emitting street parking updates to ${connectedClients} connected clients...`)

    let streetSlots

    if (global.inMemorySlots) {
      streetSlots = global.inMemorySlots
    } else {
      const [rows] = await pool.query(`
        SELECT * FROM street_parking_slots 
        ORDER BY slot_number
      `)
      streetSlots = rows
    }

    // Emit to ALL connected clients
    io.emit("slotsUpdated", streetSlots)

    console.log("✅ Street parking updates emitted successfully!")
    return streetSlots
  } catch (error) {
    console.error("❌ Error emitting street parking updates:", error.message)
    return global.inMemorySlots || []
  }
}

// ==================== BUILDING PARKING APIs (Your existing functionality) ====================

// API to get building parking availability summary
app.get("/api/availability", async (req, res) => {
  try {
    const [totalSlots] = await pool.query("SELECT COUNT(*) as total FROM parking_slots")
    const [availableSlots] = await pool.query(
      "SELECT COUNT(*) as available FROM parking_slots WHERE status = 'available'",
    )
    const [bookedSlots] = await pool.query("SELECT COUNT(*) as booked FROM parking_slots WHERE status = 'booked'")
    const [occupiedSlots] = await pool.query("SELECT COUNT(*) as occupied FROM parking_slots WHERE status = 'occupied'")

    res.json({
      total: totalSlots[0].total,
      available: availableSlots[0].available,
      booked: bookedSlots[0].booked,
      occupied: occupiedSlots[0].occupied,
    })
  } catch (err) {
    console.error("❌ Error fetching availability:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// API to book a building parking slot
app.post("/api/book-parking", async (req, res) => {
  const { userName, vehicleNumber, phoneNumber, arrivalTime } = req.body

  console.log("🚗 Regular booking request received:", { userName, vehicleNumber, phoneNumber, arrivalTime })

  try {
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Find first available slot
      const [availableSlots] = await connection.query(
        "SELECT * FROM parking_slots WHERE status = 'available' ORDER BY floor_number, slot_number LIMIT 1",
      )

      if (availableSlots.length === 0) {
        await connection.rollback()
        return res.status(400).json({ error: "No parking slots available" })
      }

      const slot = availableSlots[0]

      // Update slot status
      await connection.query("UPDATE parking_slots SET status = 'booked' WHERE id = ?", [slot.id])

      // Create regular booking
      const [result] = await connection.query(
        `INSERT INTO bookings 
         (slot_id, user_name, vehicle_number, phone_number, booking_type, booking_time, arrival_time, payment_status) 
         VALUES (?, ?, ?, ?, 'regular', NOW(), ?, 'pending')`,
        [slot.id, userName, vehicleNumber, phoneNumber, arrivalTime],
      )

      await connection.commit()

      console.log("✅ Regular booking successful:", {
        bookingId: result.insertId,
        slotNumber: slot.slot_number,
        floor: slot.floor_number,
      })

      // Emit real-time updates
      setTimeout(() => {
        emitBuildingUpdates()
      }, 100)

      res.status(201).json({
        bookingId: result.insertId,
        slotNumber: slot.slot_number,
        floor: slot.floor_number,
        message: "Parking slot booked successfully!",
      })
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
  } catch (err) {
    console.error("❌ Error creating regular booking:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// API for walk-in booking
app.post("/api/walkin-booking", async (req, res) => {
  const { userName, vehicleNumber, phoneNumber } = req.body

  console.log("🚶 Walk-in booking request received:", { userName, vehicleNumber, phoneNumber })

  try {
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Find first available slot
      const [availableSlots] = await connection.query(
        "SELECT * FROM parking_slots WHERE status = 'available' ORDER BY floor_number, slot_number LIMIT 1",
      )

      if (availableSlots.length === 0) {
        await connection.rollback()
        return res.status(400).json({ error: "No parking slots available" })
      }

      const slot = availableSlots[0]

      // Update slot status to occupied
      await connection.query("UPDATE parking_slots SET status = 'occupied' WHERE id = ?", [slot.id])

      // Create walk-in booking
      const currentTime = new Date()
      const [result] = await connection.query(
        `INSERT INTO bookings 
         (slot_id, user_name, vehicle_number, phone_number, booking_type, booking_time, arrival_time, payment_status) 
         VALUES (?, ?, ?, ?, 'walkin', ?, ?, 'active')`,
        [slot.id, userName, vehicleNumber, phoneNumber, currentTime, currentTime],
      )

      await connection.commit()

      console.log("✅ Walk-in booking successful:", {
        bookingId: result.insertId,
        slotNumber: slot.slot_number,
        floor: slot.floor_number,
      })

      // Emit real-time updates
      setTimeout(() => {
        emitBuildingUpdates()
      }, 100)

      res.status(201).json({
        bookingId: result.insertId,
        slotNumber: slot.slot_number,
        floor: slot.floor_number,
        message: "Walk-in booking successful! Customer is now parked and slot is active.",
      })
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
  } catch (err) {
    console.error("❌ Error creating walk-in booking:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// API to get all bookings (for admin)
app.get("/api/bookings", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*, p.slot_number, p.floor_number
      FROM bookings b
      JOIN parking_slots p ON b.slot_id = p.id
      ORDER BY b.created_at DESC
    `)
    res.json(rows)
  } catch (err) {
    console.error("❌ Error fetching bookings:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// API to complete a booking (for admin)
app.put("/api/bookings/:id/complete", async (req, res) => {
  const { id } = req.params
  const { amount } = req.body

  console.log(`💰 Processing payment completion for booking #${id}, amount: ₹${amount}`)

  try {
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Get booking details
      const [bookingRows] = await connection.query("SELECT * FROM bookings WHERE id = ?", [id])

      if (bookingRows.length === 0) {
        await connection.rollback()
        return res.status(404).json({ error: "Booking not found" })
      }

      const booking = bookingRows[0]

      // Update booking
      await connection.query(
        `UPDATE bookings 
         SET departure_time = NOW(), payment_status = 'completed', amount = ? 
         WHERE id = ?`,
        [amount, id],
      )

      // Update slot status to available
      await connection.query("UPDATE parking_slots SET status = 'available' WHERE id = ?", [booking.slot_id])

      await connection.commit()

      console.log("✅ Payment completed successfully:", {
        bookingId: id,
        amount,
        slotId: booking.slot_id,
      })

      // Emit real-time updates
      setTimeout(() => {
        emitBuildingUpdates()
      }, 100)

      res.json({ message: "Booking completed successfully" })
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
  } catch (err) {
    console.error("❌ Error completing booking:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// API to get parking rate
app.get("/api/rate", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT rate_per_hour FROM rates LIMIT 1")
    res.json({ ratePerHour: rows[0]?.rate_per_hour || 50 })
  } catch (err) {
    console.error("❌ Error fetching rate:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// API to update parking rate
app.put("/api/rate", async (req, res) => {
  const { ratePerHour } = req.body

  try {
    await pool.query("UPDATE rates SET rate_per_hour = ? WHERE id = 1", [ratePerHour])
    res.json({ message: "Rate updated successfully" })
  } catch (err) {
    console.error("❌ Error updating rate:", err.message)
    res.status(500).json({ error: "Database error" })
  }
})

// ==================== STREET PARKING APIs (ESP32) ====================

// Health check for ESP32
app.get("/health", (req, res) => {
  const response = {
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Complete Parking System Server Running",
    connectedClients: connectedClients,
    storageMode: global.inMemorySlots ? "in-memory" : "database",
    features: ["building-parking", "street-parking", "admin-panel", "real-time-updates"],
  }

  console.log("🏥 Health check requested")
  res.json(response)
})

// API to get all street parking slots
app.get("/slots", async (req, res) => {
  try {
    let slots

    if (global.inMemorySlots) {
      slots = global.inMemorySlots
    } else {
      const [rows] = await pool.query(`
        SELECT * FROM street_parking_slots 
        ORDER BY slot_number
      `)
      slots = rows
    }

    console.log("📍 ESP32: Fetching street parking slots:", slots.length, "slots found")
    res.json(slots)
  } catch (err) {
    console.error("❌ Error fetching street parking slots:", err.message)

    if (global.inMemorySlots) {
      return res.json(global.inMemorySlots)
    }

    res.status(500).json({ error: "Database error", details: err.message })
  }
})

// API to update street parking slot status (ESP32 endpoint)
app.put("/slots/:slotNumber", async (req, res) => {
  const { slotNumber } = req.params
  const { status } = req.body

  console.log(`🤖 ESP32 UPDATE: Slot ${slotNumber} -> ${status}`)

  // Validate input
  if (!["available", "occupied"].includes(status)) {
    return res.status(400).json({
      error: "Status must be 'available' or 'occupied'",
      received: status,
    })
  }

  try {
    if (global.inMemorySlots) {
      // Update in-memory storage
      const slotIndex = global.inMemorySlots.findIndex((slot) => slot.slot_number === slotNumber)

      if (slotIndex === -1) {
        return res.status(404).json({
          error: "Street parking slot not found",
          slotNumber: slotNumber,
        })
      }

      const occupied = status === "occupied"
      global.inMemorySlots[slotIndex] = {
        ...global.inMemorySlots[slotIndex],
        status,
        occupied,
        last_updated: new Date().toISOString(),
      }

      console.log(`✅ ESP32: Slot ${slotNumber} updated to: ${status} (in-memory)`)

      // Emit real-time updates
      await emitStreetUpdates()

      return res.json({
        success: true,
        message: `Slot ${slotNumber} status updated to ${status}`,
        slotNumber,
        status,
        occupied,
        timestamp: new Date().toISOString(),
        clientsNotified: connectedClients,
      })
    }

    // Database update
    const connection = await pool.getConnection()
    await connection.beginTransaction()

    try {
      // Check if slot exists
      const [existingSlot] = await connection.query("SELECT * FROM street_parking_slots WHERE slot_number = ?", [
        slotNumber,
      ])

      if (existingSlot.length === 0) {
        await connection.rollback()
        return res.status(404).json({
          error: "Street parking slot not found",
          slotNumber: slotNumber,
        })
      }

      // Update slot status
      const occupied = status === "occupied"
      await connection.query("UPDATE street_parking_slots SET status = ?, occupied = ? WHERE slot_number = ?", [
        status,
        occupied,
        slotNumber,
      ])

      await connection.commit()

      console.log(`✅ ESP32: Slot ${slotNumber} updated to: ${status}`)

      // Emit real-time updates
      await emitStreetUpdates()

      res.json({
        success: true,
        message: `Slot ${slotNumber} status updated to ${status}`,
        slotNumber,
        status,
        occupied,
        timestamp: new Date().toISOString(),
        clientsNotified: connectedClients,
      })
    } catch (err) {
      await connection.rollback()
      throw err
    } finally {
      connection.release()
    }
  } catch (err) {
    console.error("❌ Database error:", err.message)
    res.status(500).json({
      error: "Database error",
      details: err.message,
    })
  }
})

// ==================== SHARED/DEBUG APIS ====================

// Debug endpoint
app.get("/debug/slots", async (req, res) => {
  try {
    let slots

    if (global.inMemorySlots) {
      slots = global.inMemorySlots
    } else {
      const [rows] = await pool.query(`SELECT * FROM street_parking_slots ORDER BY slot_number`)
      slots = rows
    }

    res.json({
      totalSlots: slots.length,
      slots: slots,
      timestamp: new Date().toISOString(),
      storageMode: global.inMemorySlots ? "in-memory" : "database",
    })
  } catch (err) {
    console.error("❌ Debug error:", err.message)
    if (global.inMemorySlots) {
      return res.json({
        totalSlots: global.inMemorySlots.length,
        slots: global.inMemorySlots,
        timestamp: new Date().toISOString(),
        storageMode: "in-memory",
      })
    }
    res.status(500).json({ error: "Database error" })
  }
})

// Start the Server
const PORT = process.env.PORT || 5000

server.listen(PORT, "0.0.0.0", async () => {
  console.log("🚀 COMPLETE PARKING SYSTEM SERVER")
  console.log("=====================================")
  console.log(`📡 Server running on port ${PORT}`)
  console.log(`🌐 Server URL: http://localhost:${PORT}`)
  console.log(`🏥 Health check: http://localhost:${PORT}/health`)
  console.log("")
  console.log("🏢 BUILDING PARKING:")
  console.log(`   📱 Booking: http://localhost:${PORT}`)
  console.log(`   👨‍💼 Admin: http://localhost:${PORT}/admin`)
  console.log(`   📊 API: http://localhost:${PORT}/api/availability`)
  console.log("")
  console.log("🛣️ STREET PARKING (ESP32):")
  console.log(`   📍 Slots: http://localhost:${PORT}/slots`)
  console.log(`   🔧 Debug: http://localhost:${PORT}/debug/slots`)
  console.log("=====================================")

  // Test database connection
  await testDatabaseConnection()

  console.log("✅ Complete parking system ready!")
  console.log("   🏢 Building parking: ENABLED")
  console.log("   🛣️ Street parking: ENABLED")
  console.log("   🤖 ESP32 integration: ENABLED")
  console.log("   📡 Real-time updates: ENABLED")
})
