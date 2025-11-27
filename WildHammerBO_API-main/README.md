# 🎮 Idle Game Admin System - Backend

## 📋 Overview
Complete backend system for managing an idle game with admin panel, user management, gift codes, and ban system.

## 🏗️ Architecture
- **Framework**: Node.js + Express.js
- **Database**: MySQL/MariaDB
- **Cache**: Redis (optional)
- **Authentication**: JWT with role-based permissions
- **Game Integration**: HTTP API integration

## 📁 Directory Structure
```
backend/
├── src/                       # 💻 Source Code
│   ├── controllers/          # API request handlers
│   ├── services/             # Business logic layer
│   ├── routes/               # API route definitions
│   ├── models/               # Database models
│   ├── middlewares/          # Express middleware
│   ├── config/               # Configuration files
│   └── utils/                # Utility functions
├── database/                  # 💾 Database Management
│   ├── migrations/           # Database schema files
│   ├── scripts/              # Database utility scripts
│   ├── seeds/                # Sample data
│   └── backups/              # Database backups
├── tests/                     # 🧪 Test Files
├── public/                    # 🌐 Static Web Files
├── scripts/                   # 🔧 Admin Scripts
├── .env.example              # Environment template
├── package.json              # Dependencies
└── index.js                  # Application entry point
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MySQL/MariaDB
- Redis (optional)

### Installation
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, etc.

# Setup database
npm run setup:db

# Start development server
npm run dev
```

## 🔧 Scripts
```bash
npm run start         # Start production server
npm run dev           # Start development server with nodemon
npm run dev:no-redis  # Start without Redis cache
npm run setup:db      # Setup database tables
npm run test          # Run tests
```

## 🎯 Features

### � Currency Management System (NEW)
- Admin currency control (add/subtract/set coins and gems)
- Comprehensive audit trail with admin attribution
- User search functionality for currency management
- Currency statistics and distribution analytics
- Complete currency modification history tracking

### �👥 User Management
- User registration and authentication
- Role-based permissions (super_admin, admin, moderator)
- Ban/Unban system with expiration
- User activity logging

### 🎁 Gift Code System
- Create and manage gift codes
- Redemption tracking
- Usage limits and expiration
- Multiple reward types

### 🔐 Authentication & Security
- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Activity logging

### 🎮 Game Integration
- HTTP API for game service communication
- Real-time ban status synchronization
- Automatic ban expiration processing

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout

### Currency Management (NEW)
- `GET /api/users/:userId/currency` - Get user currency information
- `PATCH /api/users/:userId/currency` - Update user currency (admin only)
- `GET /api/users/:userId/currency/history` - Get currency modification history
- `GET /api/users/search` - Search users for currency management
- `GET /api/users/currency/statistics` - Get currency statistics and analytics

### Game Management (NEW)
- `GET /api/game-rank/arena` - Get arena rankings
- `GET /api/game-rank/level` - Get level rankings
- `GET /api/game-servers` - Get game server status
- `GET /api/backend-users` - Get backend/admin users

### User Management
- `GET /api/users` - List users
- `POST /api/users/ban` - Ban user
- `POST /api/users/unban` - Unban user
- `GET /api/users/:id/status` - Get user status

### Gift Codes
- `GET /api/gift-codes/all` - List all gift codes
- `POST /api/gift-codes/create` - Create gift code
- `POST /api/gift-codes/redeem` - Redeem gift code
- `GET /api/gift-codes/:code/validate` - Validate gift code

### System
- `GET /api/system/status` - System health check
- `GET /health` - Health endpoint

## 🧪 Testing

### Test Files Location: `./tests/`
- `test-currency-direct.js` - Currency controller direct testing (NEW)
- `test-currency-api.js` - Currency API HTTP testing (NEW)
- `test-ban-system.js` - Ban system functionality
- `test-without-redis.js` - Redis-free operation
- `test-gift-code-data.js` - Gift code database tests
- `test_giftcode.js` - Gift code redemption tests

### Web Test Interface
Open `./public/test-gift-codes.html` in browser to test gift code system with UI.

### Sample Test Codes
- `WELCOME2024` - Welcome gift (1,000 coins, 50 gems)
- `TEST123` - Development testing
- `DAILY50` - Daily bonus
- `VIP2024` - VIP member gift

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=little_idlegame

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DISABLED=true

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# Game Service Integration
GAME_API_BASE_URL=http://localhost:8080
GAME_API_KEY=your_game_api_key

# Server Configuration
PORT=9000
NODE_ENV=development
```

## 🔄 Database Management

### Migrations
```bash
# Run all migrations
node database/scripts/setup_database.js

# Add sample gift code data
node database/scripts/add-gift-code-data.js

# Check database tables
node database/scripts/check_tables.js
```

### Backups
```bash
# Create database backup
node database/scripts/backup.js
```

## 🐛 Troubleshooting

### Redis Connection Issues
If Redis is not available, set `REDIS_DISABLED=true` in .env file.

### Database Connection
Ensure MySQL/MariaDB is running and credentials in .env are correct.

### Port Conflicts
Change PORT in .env if port 9000 is occupied.

## 📊 Monitoring

### Health Checks
- `GET /health` - Basic health check
- `GET /api/system/status` - Detailed system status

### Logging
- Activity logs stored in database
- Console output for development
- Automatic ban expiration processing every 5 minutes

## 🤝 Contributing
1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## 📄 License
This project is for educational/development purposes.
