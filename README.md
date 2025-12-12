# Smart Parking Management System

A modern, full-stack parking management system with real-time slot availability, booking management, and admin dashboard. Built with Node.js, Express, MySQL, and React.

## Features

- **Real-time Availability**: Live parking slot availability across multiple floors
- **Quick Booking**: Simple booking process with 30-minute advance booking window
- **Admin Dashboard**: Comprehensive admin panel with statistics and booking management
- **Payment Tracking**: Track payment collection status for each booking
- **Responsive Design**: Modern UI that works on desktop and mobile devices
- **Database Persistence**: MySQL backend for reliable data storage

## Tech Stack

**Backend:**
- Node.js
- Express.js
- MySQL 2 (with Promise support)
- CORS enabled

**Frontend:**
- React 18
- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui components
- date-fns for date manipulation

**Database:**
- MySQL 5.7+ / 8.0+

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14.0.0 or higher)
- **MySQL** (v5.7 or higher)
- **npm** or **yarn** package manager
- **Git** (for cloning the repository)

## Installation

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/smart-parking-system.git
cd smart-parking-system
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

This will install all required packages including:
- express
- mysql2
- cors
- nodemon (dev dependency)

### 3. Configure Environment Variables

Create a `.env` file in the root directory (optional, defaults are provided):

\`\`\`env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smart_parking
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development
\`\`\`

**Note:** If you don't create a `.env` file, the system will use these default values:
- Host: `localhost`
- User: `root`
- Password: `Dnyanesh2006` (change this in `server.js` and `setup-database.js`)
- Database: `smart_parking`
- Port: `3306`

## Database Setup

### Option 1: Using NPM Scripts (Recommended)

#### Basic Setup (Database + Tables)
\`\`\`bash
npm run setup
\`\`\`

This will:
- Create the `smart_parking` database
- Create all required tables (parking_floors, parking_slots, bookings)
- Insert initial floor data (Ground, First, Second, Third floors)
- Generate parking slots (G01-G50, F01-F40, S01-S35, T01-T30)

#### Setup with Sample Data
\`\`\`bash
npm run setup-with-sample
\`\`\`

This includes everything from basic setup plus:
- 2 sample bookings for testing
- Pre-filled payment status examples

### Option 2: Using Node Directly

\`\`\`bash
# Basic setup
node setup-database.js

# With sample data
node setup-database.js --sample-data
\`\`\`

### Option 3: Using Bash Script

\`\`\`bash
chmod +x setup.sh
./setup.sh
\`\`\`

### Database Structure

The setup script creates three main tables:

#### 1. `parking_floors`
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(50) | Floor name (Ground, First, etc.) |
| total_slots | INT | Total slots on the floor |
| available_slots | INT | Currently available slots |
| created_at | TIMESTAMP | Record creation time |

#### 2. `parking_slots`
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| floor_id | INT | Foreign key to parking_floors |
| slot_number | VARCHAR(10) | Slot identifier (G01, F01, etc.) |
| is_available | BOOLEAN | Slot availability status |
| created_at | TIMESTAMP | Record creation time |

#### 3. `bookings`
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| booking_id | VARCHAR(20) | Unique booking identifier |
| floor_id | INT | Foreign key to parking_floors |
| slot_id | INT | Foreign key to parking_slots |
| start_time | DATETIME | Booking start time |
| end_time | DATETIME | Booking end time |
| duration_hours | DECIMAL(3,1) | Booking duration |
| total_fee | DECIMAL(10,2) | Total parking fee |
| status | ENUM | pending/confirmed/cancelled/completed |
| user_phone | VARCHAR(15) | User contact number |
| user_name | VARCHAR(100) | User full name |
| payment_collected | BOOLEAN | Payment status |
| created_at | TIMESTAMP | Record creation time |

### Initial Data

After running the setup, your database will contain:

- **4 Floors**: Ground (50 slots), First (40 slots), Second (35 slots), Third (30 slots)
- **155 Total Parking Slots**: Automatically numbered (G01-G50, F01-F40, S01-S35, T01-T30)
- **Sample Bookings** (if `--sample-data` flag used): 2 test bookings with different statuses

## Running the Application

### Start the Server

\`\`\`bash
npm start
\`\`\`

Or for development with auto-restart:

\`\`\`bash
npm run dev
\`\`\`

The server will start on `http://localhost:5000`

### Verify Installation

Once the server is running, you should see:

\`\`\`
✅ Database connected successfully
🚀 Smart Parking Server running on port 5000
🏠 Home Page: http://localhost:5000
📊 Admin Panel: http://localhost:5000/admin.html
🅿️ Booking App: http://localhost:5000/booking.html
🔍 Health Check: http://localhost:5000/health
🧪 DB Test: http://localhost:5000/api/test-db
📡 API Base: http://localhost:5000/api
\`\`\`

## Application URLs

| Page | URL | Description |
|------|-----|-------------|
| Home | `http://localhost:5000` | Landing page with navigation |
| Booking Interface | `http://localhost:5000/booking.html` | User booking interface |
| Admin Dashboard | `http://localhost:5000/admin.html` | Admin panel with stats |
| Health Check | `http://localhost:5000/health` | Server health status |
| Database Test | `http://localhost:5000/api/test-db` | Test database connection |

## API Documentation

### Base URL
\`\`\`
http://localhost:5000/api
\`\`\`

### Endpoints

#### 1. Get All Floors
\`\`\`http
GET /api/parking/floors
\`\`\`

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "name": "Ground",
    "total_slots": 50,
    "available_slots": 45,
    "occupied_slots": 5
  }
]
\`\`\`

#### 2. Create Booking
\`\`\`http
POST /api/parking/bookings
\`\`\`

**Request Body:**
\`\`\`json
{
  "floorId": 1,
  "startTime": "2024-01-15T10:30:00.000Z",
  "endTime": "2024-01-15T11:30:00.000Z",
  "durationHours": 1,
  "totalFee": 150,
  "userPhone": "9876543210",
  "userName": "John Doe"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "bookingId": "PK12345678",
  "slotNumber": "G01",
  "message": "Booking confirmed successfully"
}
\`\`\`

#### 3. Get All Bookings
\`\`\`http
GET /api/parking/bookings
\`\`\`

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "booking_id": "PK12345678",
    "floor_id": 1,
    "slot_id": 1,
    "floor_name": "Ground",
    "slot_number": "G01",
    "start_time": "2024-01-15T10:30:00",
    "end_time": "2024-01-15T11:30:00",
    "duration_hours": 1,
    "total_fee": 150,
    "status": "confirmed",
    "user_phone": "9876543210",
    "user_name": "John Doe",
    "payment_collected": false,
    "created_at": "2024-01-15T09:00:00"
  }
]
\`\`\`

#### 4. Cancel Booking
\`\`\`http
DELETE /api/parking/bookings/:bookingId
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
\`\`\`

#### 5. Update Payment Status (Admin)
\`\`\`http
PUT /api/admin/payment
\`\`\`

**Request Body:**
\`\`\`json
{
  "bookingId": "PK12345678",
  "collected": true
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

#### 6. Get Admin Statistics
\`\`\`http
GET /api/admin/stats
\`\`\`

**Response:**
\`\`\`json
{
  "totalBookings": 50,
  "activeBookings": 5,
  "confirmedBookings": 45,
  "cancelledBookings": 5,
  "collectedRevenue": 6750,
  "pendingRevenue": 750,
  "totalRevenue": 7500,
  "totalSlots": 155,
  "availableSlots": 150,
  "occupiedSlots": 5,
  "occupancyRate": 3.23
}
\`\`\`

## Project Structure

\`\`\`
smart-parking-system/
├── app/                      # Next.js app directory
│   ├── api/                  # API route handlers
│   │   ├── bookings/         # Booking endpoints
│   │   ├── floors/           # Floor data endpoints
│   │   └── admin/            # Admin endpoints
│   ├── page.tsx              # Main booking interface
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/               # React components
│   └── ui/                   # shadcn/ui components
├── lib/                      # Utility libraries
│   ├── utils.ts              # Helper functions
│   └── database.ts           # Database utilities
├── public/                   # Static files
│   ├── index.html            # Home page
│   ├── booking.html          # Booking interface
│   └── admin.html            # Admin dashboard
├── scripts/                  # Database scripts
│   └── *.sql                 # SQL migration files
├── server.js                 # Express server
├── setup-database.js         # Database setup script
├── setup.sh                  # Bash setup script
├── package.json              # Dependencies
├── DATABASE_SETUP.md         # Database documentation
└── README.md                 # This file
\`\`\`

## Configuration

### Booking Rules

The system enforces these booking rules:

- **Advance Booking Window**: 30 minutes to 8 hours in advance
- **Fixed Duration**: 1 hour per booking
- **Fixed Fee**: ₹150 per booking
- **Slot Allocation**: Automatic slot assignment based on availability

To modify these rules, edit the following files:
- Frontend: `app/page.tsx` (constants at top)
- Backend: `server.js` (validation logic)

### Changing Parking Layout

To modify floors or slot counts:

1. Edit `setup-database.js`
2. Modify the INSERT statements for `parking_floors`
3. Adjust the slot generation loops
4. Re-run: `npm run setup`

## Troubleshooting

### Database Connection Issues

**Error: Access denied for user**
\`\`\`bash
# Check MySQL credentials
mysql -u root -p

# Update credentials in:
# - .env file
# - server.js (default values)
# - setup-database.js (default values)
\`\`\`

**Error: Database does not exist**
\`\`\`bash
# Run setup script
npm run setup
\`\`\`

**Error: Connection refused**
\`\`\`bash
# Check if MySQL is running
sudo service mysql status

# Start MySQL
sudo service mysql start
\`\`\`

### Port Already in Use

\`\`\`bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3000
\`\`\`

### Missing Dependencies

\`\`\`bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
\`\`\`

### Socket.IO 404 Errors

These errors are expected and handled. The system does not use Socket.IO for real-time updates. The server gracefully handles and ignores these requests.

### Booking Time Validation Errors

If you see "Invalid time slot" errors:

1. Check system clock synchronization
2. Verify timezone settings match between client and server
3. Ensure dates are in ISO 8601 format
4. Check that booking is within 30-minute advance window

## Development

### Adding New Features

1. **Backend Changes**: Modify `server.js`
2. **Frontend Changes**: Modify `app/page.tsx`
3. **Database Changes**: Create new SQL script in `scripts/`
4. **API Changes**: Update API documentation in this README

### Running Tests

\`\`\`bash
# Test database connection
npm run test-db

# Or visit in browser
http://localhost:5000/api/test-db

# Check server health
http://localhost:5000/health
\`\`\`

### Database Migrations

To add new columns or tables:

1. Create a new SQL script: `scripts/migration-v2.sql`
2. Run manually or add to setup script
3. Document changes in `DATABASE_SETUP.md`

## Deployment

### Local Deployment

1. Ensure MySQL is running
2. Run database setup: `npm run setup`
3. Start server: `npm start`
4. Access at `http://localhost:5000`

### Production Deployment

1. **Update credentials** in production `.env` file
2. **Set environment** to production: `NODE_ENV=production`
3. **Use process manager** like PM2:
   \`\`\`bash
   npm install -g pm2
   pm2 start server.js --name smart-parking
   pm2 save
   pm2 startup
   \`\`\`

4. **Configure reverse proxy** (Nginx example):
   \`\`\`nginx
   server {
       listen 80;
       server_name parking.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   \`\`\`

5. **Enable HTTPS** with Let's Encrypt
6. **Secure MySQL** with strong passwords
7. **Enable firewall** rules
8. **Set up monitoring** and logging

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

### Code Style

- Use 2 spaces for indentation
- Follow existing naming conventions
- Add comments for complex logic
- Update documentation for new features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions:

- **GitHub Issues**: [Report a bug](https://github.com/yourusername/smart-parking-system/issues)
- **Email**: support@smartparking.com
- **Documentation**: See `DATABASE_SETUP.md` for detailed database info

## Roadmap

Planned features for future releases:

- [ ] QR code generation for bookings
- [ ] SMS notifications
- [ ] Payment gateway integration (Stripe/PayPal)
- [ ] User authentication and profiles
- [ ] Mobile app (React Native)
- [ ] Vehicle number plate recognition
- [ ] Multi-location support
- [ ] Analytics dashboard
- [ ] Export reports (PDF/CSV)
- [ ] Email confirmations

## Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Date handling with [date-fns](https://date-fns.org/)

## Version History

- **v1.0.0** (Current)
  - Initial release
  - Basic booking functionality
  - Admin dashboard
  - Real-time availability tracking
  - Payment status management

---

**Made with ❤️ by the Smart Parking Team**

For more information, visit [https://github.com/yourusername/smart-parking-system](https://github.com/yourusername/smart-parking-system)
