# 🎁 Rewards System Documentation

ระบบแลกรางวัลสำหรับผู้เล่นที่ใช้ token (realMoney) ในการแลกรางวัลจริง

## 📋 Overview

ระบบนี้ประกอบด้วย:
- **Rewards Table**: เก็บข้อมูลรางวัล (ชื่อ, รูปภาพ, ราคา token, สต็อก)
- **Reward Redemptions Table**: เก็บประวัติการแลกรางวัล
- **API Endpoints**: สำหรับจัดการและแลกรางวัล
- **Authentication**: ระบบยืนยันตัวตนสำหรับ admin functions

## 🗄️ Database Schema

### Rewards Table
```sql
CREATE TABLE rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    token_cost INT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INT DEFAULT -1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Reward Redemptions Table
```sql
CREATE TABLE reward_redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reward_id INT NOT NULL,
    user_id INT NOT NULL,
    server_id INT NOT NULL,
    token_cost INT NOT NULL,
    real_money_before INT NOT NULL,
    real_money_after INT NOT NULL,
    shipping_address TEXT NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
);
```

## 🚀 API Endpoints

### Public Endpoints (No Authentication Required)

#### Get Active Rewards
```http
GET /api/rewards/active
```
Response:
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "Gaming Mouse RGB",
            "image_url": "https://example.com/images/gaming-mouse.jpg",
            "token_cost": 1000,
            "description": "High-quality gaming mouse with RGB lighting",
            "is_active": true,
            "stock_quantity": 50,
            "created_at": "2024-01-01T00:00:00.000Z",
            "updated_at": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

#### Get Reward by ID
```http
GET /api/rewards/:id
```

### Protected Endpoints (Authentication Required)

#### Get All Rewards (Admin)
```http
GET /api/rewards
Authorization: Bearer <token>
```

#### Create New Reward (Admin)
```http
POST /api/rewards
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "New Reward",
    "image_url": "https://example.com/image.jpg",
    "token_cost": 1500,
    "description": "Reward description",
    "stock_quantity": 100
}
```

#### Update Reward (Admin)
```http
PUT /api/rewards/:id
Authorization: Bearer <token>
Content-Type: application/json

{
    "name": "Updated Reward Name",
    "is_active": false
}
```

#### Delete Reward (Admin)
```http
DELETE /api/rewards/:id
Authorization: Bearer <token>
```

### Redemption Endpoints

#### Redeem Reward
```http
POST /api/rewards/redeem
Content-Type: application/json

{
    "reward_id": 1,
    "shipping_address": "123 Main St, City, Country",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Get User Redemption History
```http
GET /api/rewards/redemptions/user?token=<game_token>
```

#### Get All Redemptions (Admin)
```http
GET /api/rewards/redemptions/all?limit=50&offset=0
Authorization: Bearer <token>
```

#### Update Redemption Status (Admin)
```http
PUT /api/rewards/redemptions/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
    "status": "shipped",
    "notes": "Tracking number: ABC123"
}
```

#### Get Redemption Statistics (Admin)
```http
GET /api/rewards/redemptions/statistics
Authorization: Bearer <token>
```

## 🔧 Setup Instructions

### 1. Run Database Migrations
```bash
# Run the migration files in order
mysql -u username -p database_name < database/migrations/09_create_rewards_table.sql
mysql -u username -p database_name < database/migrations/10_create_reward_redemptions_table.sql
```

### 2. Setup Sample Data
```bash
node database/scripts/setup-rewards.js
```

### 3. Test the System
```bash
# Run tests
node tests/test-rewards.js

# Or use the web interface
# Open: http://localhost:3500/test-rewards.html
```

## 💡 Usage Examples

### Frontend Integration
```javascript
// Get active rewards for display
const response = await fetch('/api/rewards/active');
const { data: rewards } = await response.json();

// Display rewards in UI
rewards.forEach(reward => {
    console.log(`${reward.name} - ${reward.token_cost} tokens`);
});

// Redeem reward
const redeemResponse = await fetch('/api/rewards/redeem', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        reward_id: selectedRewardId,
        shipping_address: userAddress,
        email: userEmail,
        token: gameToken
    })
});
```

### Admin Management
```javascript
// Create new reward
const createResponse = await fetch('/api/rewards', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
    },
    body: JSON.stringify({
        name: 'New Gaming Gear',
        image_url: 'https://example.com/gear.jpg',
        token_cost: 2500,
        description: 'Premium gaming equipment',
        stock_quantity: 25
    })
});

// Update redemption status
const updateResponse = await fetch('/api/rewards/redemptions/123/status', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
    },
    body: JSON.stringify({
        status: 'shipped',
        notes: 'Shipped via DHL - Tracking: 1234567890'
    })
});
```

## 🔒 Security Features

1. **Authentication Required**: Admin functions require valid JWT token
2. **Balance Validation**: Checks user's realMoney balance before redemption
3. **Transaction Safety**: Uses database transactions for atomic operations
4. **Stock Management**: Prevents overselling with stock quantity tracking
5. **Input Validation**: Validates all required fields and data types

## 📊 Monitoring & Analytics

- **Redemption Statistics**: Track total redemptions, tokens used, status distribution
- **User History**: Complete redemption history per user
- **Admin Dashboard**: Manage rewards and track fulfillment status
- **Audit Trail**: Full transaction history with timestamps

## 🚨 Error Handling

Common error responses:
- `400 Bad Request`: Missing required fields or invalid data
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Reward or user not found
- `400 Insufficient Balance`: Not enough realMoney for redemption
- `500 Internal Server Error`: Database or server errors

## 🔄 Workflow

1. **Admin creates rewards** with token costs and stock
2. **Users view active rewards** on frontend
3. **User initiates redemption** with shipping details
4. **System validates balance** and processes transaction
5. **Admin manages fulfillment** and updates status
6. **User tracks redemption** through their history

## 📝 Notes

- Stock quantity of -1 means unlimited stock
- All timestamps are in UTC
- Email addresses are validated for shipping notifications
- Shipping addresses are stored as plain text (consider encryption for production)
- Status updates should include notes for tracking purposes
