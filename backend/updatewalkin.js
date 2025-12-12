require("dotenv").config()
const mysql = require("mysql2/promise")

async function resetDatabase() {
  let connection = null

  try {
    console.log("🔄 Resetting database to initial state...")

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "smart_parking",
      port: process.env.DB_PORT || 3306,
    })

    console.log("✅ Connected to database")

    // Reset all slots to available
    await connection.query("UPDATE parking_slots SET status = 'available'")
    console.log("🅿️ All parking slots reset to 'available'")

    // Clear all bookings
    await connection.query("DELETE FROM bookings")
    console.log("📋 All bookings cleared")

    // Reset auto increment
    await connection.query("ALTER TABLE bookings AUTO_INCREMENT = 1")
    console.log("🔢 Booking ID counter reset")

    // Verify reset
    const [slotCount] = await connection.query("SELECT COUNT(*) as count FROM parking_slots WHERE status = 'available'")
    const [bookingCount] = await connection.query("SELECT COUNT(*) as count FROM bookings")

    console.log("\n📊 Reset verification:")
    console.log(`   ✅ Available slots: ${slotCount[0].count}`)
    console.log(`   📋 Total bookings: ${bookingCount[0].count}`)

    console.log("\n🎉 Database reset completed successfully!")
    console.log("💡 You can now start fresh with your parking system")
  } catch (error) {
    console.error("❌ Database reset failed:", error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Run reset
resetDatabase()
