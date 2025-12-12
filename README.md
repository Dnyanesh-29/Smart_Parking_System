
# Smart Street & Pay-and-Park Parking Management System

A full-stack smart parking platform integrating **IoT automation**, **real-time slot availability**, **Google Maps–based location discovery**, and a dedicated **Pay-and-Park Admin Panel**. The system includes both **Street Parking** and **Building/Indoor Parking** with automatic status updates using **ESP32 + Ultrasonic Sensors**.

The project is designed for academic, research, and prototype-level smart-city deployments.

---

## 1. System Overview

This solution provides:

* Real-time parking slot detection using IoT sensors.
* A web application that displays street slots, indoor building slots, and pay-and-park spaces.
* A Google Map–based homepage to navigate between parking locations.
* A pay-and-park module that includes bookings, payments (simulated), and admin controls.
* A backend API to handle sensor updates, user requests, booking management, and admin operations.
* A scalable database structure supporting multiple locations.

---

## 2. Key Features

### 2.1 User-Facing Features

* Google Map homepage showing all available parking locations.
* Clickable markers that open detailed pages for each parking area.
* Street parking layout with live slot availability.
* A clickable building near Street Slot 5 that opens a dedicated indoor parking page with 10 slots.
* Pay-and-Park zone with real-time availability.
* Responsive UI (desktop and mobile).

### 2.2 IoT Features

* ESP32 + Ultrasonic Sensor for each street or building slot.
* Automatic slot status detection based on distance.
* Continuous sensor–to–server updates.
* Backend logic to mark slots as occupied or available based on threshold values.

### 2.3 Admin Features (Pay-and-Park Only)

* Manage pay-and-park slots (add, edit, update status).
* View booking history and active bookings.
* View occupancy analytics.
* Manage indoor building slots.
* Manual overrides for slot status.

---

## 3. Technology Stack

### Frontend

* React
* React Router
* Tailwind CSS
* Axios
* Google Maps JavaScript API

### Backend

* Node.js
* Express.js
* MySQL (primary database)
* WebSockets (for live updates)
* JWT (optional if authentication added)

### IoT Hardware

* ESP32 WiFi Module
* HC-SR04 Ultrasonic Sensor
* REST API communication over WiFi

---

## 4. System Architecture

1. ESP32 continuously measures distance.
2. ESP32 sends data to backend API (`/api/sensor/update`).
3. Backend updates MySQL and notifies connected web clients (WebSocket).
4. React frontend updates the UI immediately.
5. Google Map is used only for location selection/navigation.

---

## 5. Database Schema

### Key Tables

* `locations`
* `street_slots`
* `building_slots`
* `paypark_slots`
* `bookings`
* `admins`

### Preloaded Data

* 20 street slots.
* 10 indoor building slots associated with Slot 5.
* Configurable pay-and-park slots.
* Multiple locations supported.

---

## 6. Installation

### 6.1 Clone the Repository

```bash
git clone https://github.com/yourusername/smart-parking-system.git
cd smart-parking-system
```

### 6.2 Install Dependencies

```bash
npm install
```

### 6.3 Configure Environment Variables

Create `.env` in the backend folder:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=smart_parking
PORT=5000
GOOGLE_MAPS_API_KEY=your_api_key
```

---

## 7. Database Setup

Run the automated setup script:

```bash
npm run create-database.js
```

This creates:

* Street slots
* Building slots
* Pay-and-park slots
* Sample locations

---

## 8. Running the Application

### Start the Backend

```bash
npm start
```

Backend runs at:

```
http://localhost:5000
```

### Start the React Frontend

```bash
npm run dev
```

Frontend runs at:

```
http://localhost:3000
```

---

## 9. API Endpoints (Summary)

### 9.1 Sensor Update

```
POST /api/sensor/update
```

Used by ESP32 to update slot status.

### 9.2 Get Street Slots

```
GET /api/street/:locationId
```

### 9.3 Get Building Slots

```
GET /api/building/:locationId
```

### 9.4 Create Booking

```
POST /api/bookings
```

### 9.5 Admin Stats

```
GET /api/admin/stats
```

A full API reference can be generated upon request.

---

## 10. ESP32 Firmware (Concept)

* Connect to WiFi.
* Measure distance using HC-SR04.
* If `distance < threshold` → mark occupied.
* Send POST request to server with slot ID and distance.
* Repeat every 2–3 seconds.




