# 🎁 Rewards System API Guide

คู่มือ API สำหรับระบบแลกรางวัล (Rewards System) ที่ใช้ JWT Token Authentication

## 📋 Overview

ระบบนี้ใช้ JWT Token จากเกมเพื่อยืนยันตัวตนผู้ใช้ แทนการส่ง user_id และ server_id โดยตรง

## 🔑 Authentication

### JWT Token Format
```json
{
  "id": 1,           // role_id
  "userid": "123",   // user_id (string)
  "serverid": 1,     // server_id (number)
  "exp": 1234567890  // expiration timestamp
}
```

## 🚀 API Endpoints

### Base URL
```
http://localhost:3500/api/rewards
```

---

## 📖 Public Endpoints (ไม่ต้อง Authentication)

### 1. Get Active Rewards
**GET** `/api/rewards/active`

ดูรายการรางวัลที่เปิดใช้งาน

**Response:**
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

### 2. Get Reward by ID
**GET** `/api/rewards/{id}`

ดูรายละเอียดรางวัล

**Parameters:**
- `id` (number): ID ของรางวัล

**Response:**
```json
{
  "success": true,
  "data": {
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
}
```

---

## 🛒 Redemption Endpoints (ต้องใช้ JWT Token)

### 3. Redeem Reward
**POST** `/api/rewards/redeem`

แลกรางวัลด้วย token

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "reward_id": 1,
  "shipping_address": "123 Main Street, Bangkok, Thailand 10110",
  "email": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Parameters:**
- `reward_id` (number): ID ของรางวัลที่ต้องการแลก
- `shipping_address` (string): ที่อยู่จัดส่ง
- `email` (string): อีเมลล์สำหรับติดต่อ
- `token` (string): JWT Token จากเกม

**Success Response (200):**
```json
{
  "success": true,
  "message": "Reward redeemed successfully",
  "data": {
    "redemption_id": 123,
    "new_balance": 500,
    "reward_name": "Gaming Mouse RGB",
    "user_id": "123",
    "server_id": 1
  }
}
```

**Error Responses:**
```json
// 400 - Missing fields
{
  "success": false,
  "message": "All fields are required (reward_id, shipping_address, email, token)"
}

// 400 - Invalid token
{
  "success": false,
  "message": "Invalid token - missing userid or serverid"
}

// 400 - Token expired
{
  "success": false,
  "message": "Token expired"
}

// 404 - Reward not found
{
  "success": false,
  "message": "Reward not found"
}

// 400 - Insufficient balance
{
  "success": false,
  "message": "Insufficient realMoney balance",
  "current_balance": 500,
  "required_tokens": 1000
}

// 400 - Reward not available
{
  "success": false,
  "message": "Reward is not available"
}
```

### 4. Get User Redemption History
**GET** `/api/rewards/redemptions/user`

ดูประวัติการแลกรางวัลของผู้ใช้

**Query Parameters:**
- `token` (string): JWT Token จากเกม

**Example:**
```
GET /api/rewards/redemptions/user?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "reward_id": 1,
      "user_id": "123",
      "server_id": 1,
      "token_cost": 1000,
      "real_money_before": 1500,
      "real_money_after": 500,
      "shipping_address": "123 Main Street, Bangkok, Thailand 10110",
      "email": "user@example.com",
      "status": "pending",
      "notes": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "reward_name": "Gaming Mouse RGB",
      "reward_image": "https://example.com/images/gaming-mouse.jpg"
    }
  ]
}
```

**Error Responses:**
```json
// 400 - Missing token
{
  "success": false,
  "message": "Token is required"
}

// 400 - Invalid token
{
  "success": false,
  "message": "Invalid token - missing userid or serverid"
}

// 400 - Token expired
{
  "success": false,
  "message": "Token expired"
}
```

---

## 🔧 Frontend Integration Examples

### JavaScript/TypeScript Example

```javascript
// 1. Get active rewards for display
async function getActiveRewards() {
  try {
    const response = await fetch('/api/rewards/active');
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of rewards
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error loading rewards:', error);
    throw error;
  }
}

// 2. Redeem reward
async function redeemReward(rewardId, shippingAddress, email, gameToken) {
  try {
    const response = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reward_id: rewardId,
        shipping_address: shippingAddress,
        email: email,
        token: gameToken
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        redemptionId: data.data.redemption_id,
        newBalance: data.data.new_balance,
        rewardName: data.data.reward_name
      };
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error redeeming reward:', error);
    throw error;
  }
}

// 3. Get user redemption history
async function getUserRedemptions(gameToken) {
  try {
    const response = await fetch(`/api/rewards/redemptions/user?token=${encodeURIComponent(gameToken)}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data; // Array of redemptions
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error loading redemption history:', error);
    throw error;
  }
}
```

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function RewardsPage({ gameToken }) {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load active rewards
  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const response = await fetch('/api/rewards/active');
      const data = await response.json();
      
      if (data.success) {
        setRewards(data.data);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const handleRedeem = async (rewardId, shippingAddress, email) => {
    setLoading(true);
    try {
      const result = await redeemReward(rewardId, shippingAddress, email, gameToken);
      alert(`Redemption successful! New balance: ${result.newBalance}`);
      loadRedemptions(); // Reload history
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRedemptions = async () => {
    try {
      const response = await fetch(`/api/rewards/redemptions/user?token=${encodeURIComponent(gameToken)}`);
      const data = await response.json();
      
      if (data.success) {
        setRedemptions(data.data);
      }
    } catch (error) {
      console.error('Error loading redemptions:', error);
    }
  };

  return (
    <div>
      <h2>Available Rewards</h2>
      {rewards.map(reward => (
        <div key={reward.id} className="reward-card">
          <img src={reward.image_url} alt={reward.name} />
          <h3>{reward.name}</h3>
          <p>Cost: {reward.token_cost} tokens</p>
          <p>Stock: {reward.stock_quantity === -1 ? 'Unlimited' : reward.stock_quantity}</p>
          <button 
            onClick={() => handleRedeem(reward.id, 'address', 'email@example.com')}
            disabled={loading}
          >
            Redeem
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 Error Handling

### Common Error Codes

| Status Code | Description | Solution |
|-------------|-------------|----------|
| 400 | Bad Request | ตรวจสอบ request body และ parameters |
| 401 | Unauthorized | ตรวจสอบ JWT token |
| 404 | Not Found | ตรวจสอบ reward_id หรือ user data |
| 500 | Internal Server Error | ติดต่อ backend team |

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

---

## 🔒 Security Notes

1. **JWT Token**: ต้องเป็น token ที่ถูกต้องและยังไม่หมดอายุ
2. **HTTPS**: ใช้ HTTPS ใน production
3. **Input Validation**: ตรวจสอบข้อมูลที่ส่งเข้ามา
4. **Rate Limiting**: จำกัดจำนวน request ต่อ user

---

## 🧪 Testing

### Test Endpoints
```bash
# Test active rewards
curl http://localhost:3500/api/rewards/active

# Test redemption (with real token)
curl -X POST http://localhost:3500/api/rewards/redeem \
  -H "Content-Type: application/json" \
  -d '{
    "reward_id": 1,
    "shipping_address": "Test Address",
    "email": "test@example.com",
    "token": "your_jwt_token_here"
  }'

# Test user redemptions
curl "http://localhost:3500/api/rewards/redemptions/user?token=your_jwt_token_here"
```

### Web Interface
เปิด: `http://localhost:3500/test-rewards.html`

---

## 📞 Support

หากมีปัญหาการใช้งาน API:
1. ตรวจสอบ JWT token ว่าถูกต้องและยังไม่หมดอายุ
2. ตรวจสอบ request format ตาม documentation
3. ดู error message ใน response
4. ติดต่อ backend team สำหรับ technical issues
