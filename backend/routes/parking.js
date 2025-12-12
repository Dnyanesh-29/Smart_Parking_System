const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all floors with available slots
router.get('/floors', (req, res) => {
    const query = `
        SELECT 
            id, 
            name, 
            total_slots, 
            available_slots 
        FROM parking_floors 
        ORDER BY id
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch floors' });
        }
        res.json(results);
    });
});

// Create new booking
router.post('/bookings', (req, res) => {
    const { floorId, startTime, endTime, durationHours, totalFee, userPhone, userName } = req.body;
    
    // Generate booking ID
    const bookingId = 'PK' + Date.now().toString().slice(-8);
    
    // Check if booking time is at least 30 minutes from now
    const now = new Date();
    const bookingTime = new Date(startTime);
    const timeDiff = (bookingTime.getTime() - now.getTime()) / (1000 * 60);
    
    if (timeDiff < 30) {
        return res.status(400).json({ error: 'Booking must be at least 30 minutes in advance' });
    }
    
    // Find available slot
    const slotQuery = `
        SELECT ps.id FROM parking_slots ps 
        WHERE ps.floor_id = ? AND ps.is_available = TRUE 
        AND ps.id NOT IN (
            SELECT COALESCE(slot_id, 0) FROM bookings 
            WHERE floor_id = ? AND status IN ('pending', 'confirmed') 
            AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?))
        ) LIMIT 1
    `;
    
    db.query(slotQuery, [floorId, floorId, startTime, startTime, endTime, endTime], (err, slots) => {
        if (err || slots.length === 0) {
            return res.status(400).json({ error: 'No available slots for the selected time' });
        }
        
        const slotId = slots[0].id;
        
        // Create booking
        const insertQuery = `
            INSERT INTO bookings (booking_id, floor_id, slot_id, start_time, end_time, duration_hours, total_fee, user_phone, user_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `;
        
        db.query(insertQuery, [bookingId, floorId, slotId, startTime, endTime, durationHours, totalFee, userPhone, userName], (err) => {
            if (err) {
                console.error('Booking error:', err);
                return res.status(500).json({ error: 'Failed to create booking' });
            }
            
            // Update available slots count
            db.query('UPDATE parking_floors SET available_slots = available_slots - 1 WHERE id = ?', [floorId], (err) => {
                if (err) console.error('Failed to update slot count:', err);
            });
            
            res.json({
                success: true,
                bookingId,
                message: 'Booking confirmed successfully'
            });
        });
    });
});

// Get all bookings for admin
router.get('/bookings', (req, res) => {
    const query = `
        SELECT b.*, pf.name as floor_name, ps.slot_number 
        FROM bookings b 
        JOIN parking_floors pf ON b.floor_id = pf.id 
        LEFT JOIN parking_slots ps ON b.slot_id = ps.id 
        ORDER BY b.created_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }
        res.json(results);
    });
});

// Cancel booking
router.delete('/bookings/:id', (req, res) => {
    const bookingId = req.params.id;
    
    // Get booking details first
    db.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId], (err, booking) => {
        if (err || booking.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const bookingData = booking[0];
        
        // Update booking status to cancelled
        db.query('UPDATE bookings SET status = "cancelled" WHERE booking_id = ?', [bookingId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to cancel booking' });
            }
            
            // Update available slots count
            db.query('UPDATE parking_floors SET available_slots = available_slots + 1 WHERE id = ?', [bookingData.floor_id], (err) => {
                if (err) console.error('Failed to update slot count:', err);
            });
            
            res.json({ success: true, message: 'Booking cancelled successfully' });
        });
    });
});

// Update payment status
router.put('/admin/payment', (req, res) => {
    const { bookingId, collected } = req.body;
    
    db.query('UPDATE bookings SET payment_collected = ? WHERE booking_id = ?', [collected, bookingId], (err) => {
        if (err) {
            console.error('Payment update error:', err);
            return res.status(500).json({ error: 'Failed to update payment status' });
        }
        res.json({ success: true });
    });
});

module.exports = router;