# ## 📋 Available Tests

### 🎮 Game Management Tests (NEW)
- **`test-new-api-endpoints.js`** - New API endpoints testing
  - Game rankings (arena and level)
  - Game servers management
  - Backend users management
  - Database connections verification

### 💰 Currency Management Tests (NEW)Test Suite

## 📋 Available Tests

### � Currency Management Tests (NEW)
- **`test-currency-direct.js`** - Direct controller testing
  - Direct function calls without HTTP overhead
  - Mock request/response objects
  - Database operation verification
  - Complete currency workflow testing

- **`test-currency-api.js`** - HTTP API testing  
  - Full authentication flow
  - API endpoint testing with JWT tokens
  - Real HTTP requests and responses
  - End-to-end currency operations

### �🚫 Ban System Tests
- **`test-ban-system.js`** - Complete ban/unban system testing
  - User banning functionality
  - Ban expiration handling
  - Game service integration
  - Database transaction testing

### 🎁 Gift Code Tests
- **`test-gift-code-data.js`** - Database gift code verification
  - Gift code data validation
  - Database connectivity testing
  - Sample data verification

- **`test_giftcode.js`** - Gift code redemption testing
  - Code redemption logic
  - Usage limit validation
  - Reward distribution testing

### 🔧 System Tests
- **`test-without-redis.js`** - Redis-free operation testing
  - System functionality without Redis
  - Cache fallback behavior
  - Performance without caching

- **`simple-test.js`** - Basic system health tests
  - API endpoint availability
  - Database connectivity
  - Authentication testing

- **`quick-ban-test.js`** - Quick ban system verification
  - Fast ban/unban testing
  - API response validation

## 🏃‍♂️ Running Tests

### Individual Tests
```bash
# Game management tests (NEW)
node tests/test-new-api-endpoints.js      # New API endpoints testing

# Currency management tests (NEW)
node tests/test-currency-direct.js    # Direct controller testing
node tests/test-currency-api.js       # HTTP API testing

# Ban system test
node tests/test-ban-system.js

# Gift code data test
node tests/test-gift-code-data.js

# Redis-free operation test
node tests/test-without-redis.js

# Simple health test
node tests/simple-test.js
```

### Prerequisites
1. **Database Setup**: Ensure database is configured and running
2. **Environment**: Copy `.env.example` to `.env` and configure
3. **Dependencies**: Run `npm install`
4. **Server**: Some tests require the server to be running (`npm run dev`)

## 🎯 Test Categories

### � Currency Management Tests (NEW)
- User currency retrieval and display
- Currency modification (add/subtract/set)
- Currency history and audit trails
- Currency statistics and analytics
- User search with currency information

### �🔐 Authentication Tests
- Admin login/logout
- JWT token validation
- Role-based access control

### 👥 User Management Tests
- User creation and management
- Ban/unban functionality
- Permission verification

### 🎁 Gift Code Tests
- Code creation and validation
- Redemption process
- Usage tracking
- Expiration handling

### 🔄 Integration Tests
- Game service communication
- Database transactions
- Cache operations (Redis)

## 📊 Test Data

### Sample Users
Tests use predefined test users and admins for consistent testing.

### Sample Gift Codes
- `WELCOME2024` - Welcome gift
- `TEST123` - Development testing
- `DAILY50` - Daily bonus
- `VIP2024` - VIP rewards

### Test Environment
All tests use development environment settings and test database.

## 🐛 Debugging Tests

### Common Issues
1. **Database Connection**: Check `.env` database settings
2. **Server Not Running**: Start server with `npm run dev`
3. **Redis Issues**: Set `REDIS_DISABLED=true` in `.env`
4. **Port Conflicts**: Ensure port 9000 is available

### Verbose Output
Most tests include detailed console output for debugging.

## ✅ Expected Results

### Successful Test Run
- All API endpoints respond correctly
- Database operations complete successfully
- Authentication works properly
- Gift codes redeem correctly
- Ban system functions as expected

### Test Coverage
- API endpoint functionality
- Database operations
- Authentication and authorization
- Error handling
- Edge cases and validation

## 🔄 Continuous Testing
For continuous development, use:
```bash
# Watch mode for tests
npm run test:watch

# Test with coverage
npm run test:coverage
```

## 📝 Adding New Tests
1. Create test file in `tests/` directory
2. Follow existing test patterns
3. Include proper error handling
4. Add documentation to this README
5. Ensure tests are independent and repeatable
