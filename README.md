Below is a fully improved, production-quality **README.md** tailored precisely to **your actual Smart Street + Pay-and-Park Parking Management System**, reflecting your complete project architecture:

* **Street Parking + Pay-and-Park (Single package per location)**
* **Real-time IoT sensor integration using ESP32 + Ultrasonic**
* **Website built with React (not Next.js)**
* **Admin panel for Pay-and-Park only**
* **Clickable building near Slot 5 showing 10 indoor slots**
* **Google Map homepage with clickable locations**
* **Database (MySQL/Firebase) integration**
* **Automatic slot updates from sensors**

This version is structured for GitHub and industry-grade documentation.

---

# Smart Street & Pay-and-Park Parking Management System

A full-stack smart parking solution integrating **IoT sensors**, **real-time slot updates**, **Google Maps-based discovery**, and a **dedicated admin panel** for pay-and-park locations. The system supports both **Street Parking** and **Building/Indoor Parking**, with automatic slot state updates via ESP32 devices.

Built with **React**, **Node.js**, and **MySQL/Firebase**, with IoT automation through **ESP32 + Ultrasonic sensors**.

---

## Key Features

### User Features

* **Google Maps Landing Page**
  View nearby parking locations. Clicking a location opens its detailed parking page.

* **Street Parking Visualization**
  View live slot availability on the street. Slots change automatically based on sensor data.

* **Building Parking Support**
  Near Street Slot 5, a **clickable building card** opens an indoor parking page showing **10 building slots**.

* **Unified Package**
  Each location includes both the **street parking section** and a **pay-and-park section**.

* **Responsive UI**
  Built for desktop and mobile.

### IoT Features

* **ESP32 + Ultrasonic Integration**
  Each slot uses a sensor that automatically updates availability in the database.

* **Real-time Sync**
  Sensor → ESP32 → Backend API → Database → Frontend UI.

### Admin Features (Pay-and-Park Only)

* Add/edit/remove **pay-and-park slots** and floors.
* Update slot status manually (if needed).
* Monitor revenue, bookings, usage statistics.
* Manage bookings created by users.
* Indoor building parking management (10-slot layout).

---

## Tech Stack

### Frontend

* React (latest)
* Tailwind CSS
* Axios
* React Router
* Google Maps JavaScript API

### Backend

* Node.js
* Express.js
* CORS
* REST API Architecture

### Database

* MySQL (primary)
* Firebase Realtime/Firestore (optional for live sync)

### IoT Devices

* ESP32 Dev Kit
* HC-SR04 Ultrasonic Sensor
* Wi-Fi Integration
* HTTP API communication

---

## Prerequisites

Install the following before running the project:

* Node.js v14+
* MySQL 5.7+/8.0+
* npm or yarn
* ESP32 board + sensors (for IoT integration)
* Google Maps API Key

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/smart-parking.git
cd smart-parking
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create `.env` in the backend folder:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=smart_parking
DB_PORT=3306
PORT=5000
GOOGLE_MAPS_API_KEY=your_api_key
```

---

## Database Setup

Run the setup script to generate floors, street slots, building slots, and pay-and-park slots:

```bash
npm run setup
```

### Database Includes:

#### Tables:

* `street_slots`
* `building_slots`
* `paypark_slots`
* `bookings`
* `locations`
* `admins`

#### Preloaded Data:

* Street Slots: 1–20
* Building Slots (Slot 5 → building): 10 slots (B01–B10)
* Pay-and-Park Slots: configurable
* Sample parking locations

---

## IoT Sensor Integration (ESP32)

Each ESP32 sends live distance readings to the backend API:

### Example API for ESP32:

```
POST /api/sensor/update
```

**Body:**

```json
{
  "slotId": 5,
  "distance": 12.5
}
```

If distance < threshold → occupied
Else → available

### ESP32 Code Outline

* Connect Wi-Fi
* Measure distance
* Call backend API
* Repeat every 3 seconds

---

## Running the Application

### Start Backend

```bash
npm start
```

Backend:

```
http://localhost:5000
```

### Start Frontend (React)

```bash
npm run dev
```

Frontend:

```
http://localhost:3000
```

---

## Application Structure

```
smart-parking/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── setup-database.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   └── App.js
│   └── public/
└── README.md
```

---

## API Documentation

### Base URL

```
http://localhost:5000/api
```

### Major Endpoints

#### 1. Get Parking Locations

```
GET /api/locations
```

#### 2. Get Street Slots

```
GET /api/street/:locationId
```

#### 3. Get Building Slots

```
GET /api/building/:locationId
```

#### 4. IoT Slot Update

```
POST /api/sensor/update
```

#### 5. Create Pay-and-Park Booking

```
POST /api/bookings
```

#### 6. Admin Stats

```
GET /api/admin/stats
```

---

## Google Maps Integration

* Homepage loads Google Map.
* Shows all parking locations as markers.
* Clicking a marker opens the detailed page for that parking location.
* Building object is shown as a clickable 3D card near Slot 5.

---

## Modifying Parking Layout

Edit `setup-database.js`:

* Update total slots
* Add/remove building slots
* Modify pay-and-park layout

Re-run:

```bash
npm run setup
```

---

## Troubleshooting

### Slot Not Updating

* Check ESP32 Wi-Fi connection
* Check API URL in ESP32 code
* Ensure backend is running

### Location Not Showing on Map

* Verify Google Maps API Key
* Check location table coordinates

### Admin Panel Not Updating

* Restart backend after schema changes
* Clear browser cache

---

## Deployment

### Recommended Setup

* Nginx reverse proxy
* PM2 process manager
* HTTPS using Let’s Encrypt
* MySQL secure configuration
* ESP32 configured with production API URL

### Production Start

```bash
pm2 start server.js --name smart-parking
pm2 save
pm2 startup
```

---

## Roadmap

* Camera-based vehicle number plate recognition
* Central dashboard for multiple cities
* Predictive slot analytics (ML model)
* Wallet-based booking system
* Real-time MQTT or WebSocket updates
* Mobile app (React Native)

---

## License

MIT License.

---

## Contact

For issues or suggestions:

* GitHub Issues
* Email: [support@smartparking.com](mailto:support@smartparking.com)

---

If you'd like, I can also generate:

* `DATABASE_SETUP.md`
* `API_DOCS.md`
* Production folder structure
* UML diagrams
* System architecture diagram
* ESP32 firmware code (final production version)

Just tell me.
