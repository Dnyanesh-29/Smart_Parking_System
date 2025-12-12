require("dotenv").config()
const mysql = require("mysql2/promise")

async function setupDatabase() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "Dnyanesh2006",
      port: process.env.DB_PORT || 3306,
    })

    const dbName = process.env.DB_NAME || "smart_parking"

    // Drop existing database if it exists
    await connection.query(`DROP DATABASE IF EXISTS ${dbName}`)
    console.log(`🗑️ Dropped existing database ${dbName} if it existed`)

    // Create database
    await connection.query(`CREATE DATABASE ${dbName}`)
    console.log(`✅ Database ${dbName} created successfully`)

    // Use the database
    await connection.query(`USE ${dbName}`)

    // Create parking_slots table (cars only)
    await connection.query(`
      CREATE TABLE parking_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slot_number VARCHAR(10) NOT NULL,
        floor_number INT NOT NULL,
        status ENUM('available', 'booked', 'occupied') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ parking_slots table created")

    // Create bookings table
    await connection.query(`
      CREATE TABLE bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slot_id INT NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        vehicle_number VARCHAR(20) NOT NULL,
        phone_number VARCHAR(15) NOT NULL,
        booking_time DATETIME NOT NULL,
        arrival_time DATETIME NOT NULL,
        departure_time DATETIME,
        payment_status ENUM('pending', 'completed') DEFAULT 'pending',
        amount DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES parking_slots(id)
      )
    `)
    console.log("✅ bookings table created")

    // Create rates table (cars only)
    await connection.query(`
      CREATE TABLE rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rate_per_hour DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ rates table created")

    // Insert car parking slots (50 slots across 3 floors)
    console.log("📝 Inserting car parking slots...")
    const floors = [1, 2, 3]
    const slotsPerFloor = 17 // Total 51 slots

    for (const floor of floors) {
      for (let i = 1; i <= slotsPerFloor; i++) {
        const slotNumber = `${floor}${i.toString().padStart(2, "0")}`
        await connection.execute("INSERT INTO parking_slots (slot_number, floor_number) VALUES (?, ?)", [
          slotNumber,
          floor,
        ])
      }
    }
    console.log("✅ Car parking slots inserted (51 slots total)")

    // Insert default rate for cars
    await connection.execute("INSERT INTO rates (rate_per_hour) VALUES (?)", [50.0])
    console.log("✅ Default parking rate set (₹50/hour)")

    // Verify the setup
    const [slotCount] = await connection.query("SELECT COUNT(*) as count FROM parking_slots")
    const [rateCount] = await connection.query("SELECT COUNT(*) as count FROM rates")

    console.log("🎉 Database setup completed successfully!")
    console.log("📊 Summary:")
    console.log(`   - ${slotCount[0].count} car parking slots created`)
    console.log(`   - ${floors.length} floors with ${slotsPerFloor} slots each`)
    console.log("   - Default rate: ₹50/hour for all vehicles")
    console.log("   - All tables created with proper relationships")

    await connection.end()
  } catch (error) {
    console.error("❌ Database setup failed:", error.message)
    process.exit(1)
  }
}

setupDatabase()
