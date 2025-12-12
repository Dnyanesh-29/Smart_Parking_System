require("dotenv").config()
const mysql = require("mysql2/promise")

async function createCompleteDatabase() {
  let connection = null

  try {
    console.log("🚀 Starting complete database setup...")

    // Create connection without specifying database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: process.env.DB_PORT || 3306,
    })

    const dbName = process.env.DB_NAME || "smart_parking"

    console.log("🔗 Connected to MySQL server")

    // Drop existing database if it exists
    await connection.query(`DROP DATABASE IF EXISTS ${dbName}`)
    console.log(`🗑️ Dropped existing database '${dbName}' if it existed`)

    // Create new database
    await connection.query(`CREATE DATABASE ${dbName}`)
    console.log(`✅ Created database '${dbName}'`)

    // Use the new database
    await connection.query(`USE ${dbName}`)
    console.log(`📂 Using database '${dbName}'`)

    // 1. Create parking_slots table
    console.log("📝 Creating parking_slots table...")
    await connection.query(`
      CREATE TABLE parking_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slot_number VARCHAR(10) NOT NULL UNIQUE,
        floor_number INT NOT NULL,
        status ENUM('available', 'booked', 'occupied') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_floor_number (floor_number),
        INDEX idx_status (status),
        INDEX idx_floor_status (floor_number, status)
      )
    `)
    console.log("✅ parking_slots table created with indexes")

    // 2. Create bookings table
    console.log("📝 Creating bookings table...")
    await connection.query(`
      CREATE TABLE bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slot_id INT NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        vehicle_number VARCHAR(20) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        booking_type ENUM('regular', 'walkin') DEFAULT 'regular',
        booking_time DATETIME NOT NULL,
        arrival_time DATETIME NOT NULL,
        departure_time DATETIME NULL,
        payment_status ENUM('pending', 'active', 'completed') DEFAULT 'pending',
        amount DECIMAL(10,2) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        INDEX idx_slot_id (slot_id),
        INDEX idx_payment_status (payment_status),
        INDEX idx_booking_type (booking_type),
        INDEX idx_booking_time (booking_time),
        INDEX idx_vehicle_number (vehicle_number),
        INDEX idx_phone_number (phone_number)
      )
    `)
    console.log("✅ bookings table created with foreign key and indexes")

    // 3. Create rates table
    console.log("📝 Creating rates table...")
    await connection.query(`
      CREATE TABLE rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_type ENUM('car', 'bike', 'suv', 'all') DEFAULT 'all',
        rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        effective_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vehicle_type (vehicle_type),
        INDEX idx_is_active (is_active)
      )
    `)
    console.log("✅ rates table created with indexes")

    // 4. Insert parking slots (51 slots across 3 floors)
    console.log("🅿️ Inserting parking slots...")

    const floors = [1, 2, 3]
    const slotsPerFloor = 17
    let totalSlots = 0

    for (const floor of floors) {
      console.log(`   📍 Creating slots for Floor ${floor}...`)

      for (let i = 1; i <= slotsPerFloor; i++) {
        const slotNumber = `${floor}${i.toString().padStart(2, "0")}`

        await connection.execute("INSERT INTO parking_slots (slot_number, floor_number) VALUES (?, ?)", [
          slotNumber,
          floor,
        ])
        totalSlots++
      }

      console.log(`   ✅ Floor ${floor}: ${slotsPerFloor} slots created`)
    }

    console.log(`✅ Total parking slots created: ${totalSlots}`)

    // 5. Insert default rates
    console.log("💰 Setting up default parking rates...")

    const defaultRates = [{ vehicle_type: "all", rate_per_hour: 50.0, description: "Standard rate for all vehicles" }]

    for (const rate of defaultRates) {
      await connection.execute("INSERT INTO rates (vehicle_type, rate_per_hour) VALUES (?, ?)", [
        rate.vehicle_type,
        rate.rate_per_hour,
      ])
      console.log(`   ✅ ${rate.vehicle_type}: ₹${rate.rate_per_hour}/hour`)
    }

    // 6. Create some sample bookings for testing
    console.log("📋 Creating sample bookings for testing...")

    const sampleBookings = [
      {
        slot_id: 1,
        user_name: "John Doe",
        vehicle_number: "MH01AB1234",
        phone_number: "9876543210",
        booking_type: "regular",
        payment_status: "pending",
      },
      {
        slot_id: 2,
        user_name: "Jane Smith",
        vehicle_number: "MH02CD5678",
        phone_number: "9876543211",
        booking_type: "walkin",
        payment_status: "active",
      },
      {
        slot_id: 3,
        user_name: "Bob Johnson",
        vehicle_number: "MH03EF9012",
        phone_number: "9876543212",
        booking_type: "regular",
        payment_status: "completed",
        amount: 150.0,
      },
    ]

    for (let i = 0; i < sampleBookings.length; i++) {
      const booking = sampleBookings[i]
      const now = new Date()
      const bookingTime = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000) // Stagger bookings by hours
      const arrivalTime = new Date(bookingTime.getTime() + 30 * 60 * 1000) // 30 min after booking

      let query = `
        INSERT INTO bookings 
        (slot_id, user_name, vehicle_number, phone_number, booking_type, booking_time, arrival_time, payment_status`
      const values = [
        booking.slot_id,
        booking.user_name,
        booking.vehicle_number,
        booking.phone_number,
        booking.booking_type,
        bookingTime,
        arrivalTime,
        booking.payment_status,
      ]

      if (booking.amount) {
        query += `, amount, departure_time`
        values.push(booking.amount, new Date())
      }

      query += `) VALUES (?, ?, ?, ?, ?, ?, ?, ?`

      if (booking.amount) {
        query += `, ?, ?`
      }

      query += `)`

      await connection.execute(query, values)

      // Update slot status based on booking
      let slotStatus = "available"
      if (booking.payment_status === "pending") slotStatus = "booked"
      else if (booking.payment_status === "active") slotStatus = "occupied"

      await connection.execute("UPDATE parking_slots SET status = ? WHERE id = ?", [slotStatus, booking.slot_id])

      console.log(`   ✅ Sample booking ${i + 1}: ${booking.user_name} - ${booking.vehicle_number}`)
    }

    // 7. Verify the setup
    console.log("🔍 Verifying database setup...")

    const [slotCount] = await connection.query("SELECT COUNT(*) as count FROM parking_slots")
    const [bookingCount] = await connection.query("SELECT COUNT(*) as count FROM bookings")
    const [rateCount] = await connection.query("SELECT COUNT(*) as count FROM rates")

    const [availableSlots] = await connection.query(
      "SELECT COUNT(*) as count FROM parking_slots WHERE status = 'available'",
    )
    const [bookedSlots] = await connection.query("SELECT COUNT(*) as count FROM parking_slots WHERE status = 'booked'")
    const [occupiedSlots] = await connection.query(
      "SELECT COUNT(*) as count FROM parking_slots WHERE status = 'occupied'",
    )

    // 8. Display summary
    console.log("\n🎉 DATABASE SETUP COMPLETED SUCCESSFULLY!")
    console.log("=" * 50)
    console.log("📊 SETUP SUMMARY:")
    console.log(`   🏢 Database: ${dbName}`)
    console.log(`   🅿️ Total Parking Slots: ${slotCount[0].count}`)
    console.log(`   📋 Sample Bookings: ${bookingCount[0].count}`)
    console.log(`   💰 Rate Configurations: ${rateCount[0].count}`)
    console.log("\n📈 CURRENT SLOT STATUS:")
    console.log(`   ✅ Available: ${availableSlots[0].count}`)
    console.log(`   📅 Booked: ${bookedSlots[0].count}`)
    console.log(`   🚗 Occupied: ${occupiedSlots[0].count}`)
    console.log("\n🏗️ FLOOR DISTRIBUTION:")

    for (const floor of floors) {
      const [floorSlots] = await connection.query(
        "SELECT COUNT(*) as count FROM parking_slots WHERE floor_number = ?",
        [floor],
      )
      console.log(`   Floor ${floor}: ${floorSlots[0].count} slots`)
    }

    console.log("\n💵 RATE CONFIGURATION:")
    const [rates] = await connection.query("SELECT * FROM rates WHERE is_active = TRUE")
    rates.forEach((rate) => {
      console.log(`   ${rate.vehicle_type}: ₹${rate.rate_per_hour}/hour`)
    })

    console.log("\n🔧 NEXT STEPS:")
    console.log("   1. Update your .env file with the database credentials")
    console.log("   2. Start the server: npm run server")
    console.log("   3. Start the React app: npm start")
    console.log("   4. Access the booking system at http://localhost:3000")
    console.log("   5. Access the admin panel at http://localhost:3000/admin")

    console.log("\n✨ Your parking management system is ready to use!")
  } catch (error) {
    console.error("❌ Database setup failed:", error.message)
    console.error("Stack trace:", error.stack)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log("🔌 Database connection closed")
    }
  }
}

// Run the setup
createCompleteDatabase()
