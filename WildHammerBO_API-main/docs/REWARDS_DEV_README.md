# 🎁 Rewards System - Developer Guide

คู่มือสำหรับ Frontend Developer ในการใช้งาน Rewards System API

## 📁 Files สำหรับ Dev UI

### 1. API Documentation
- **`REWARDS_API_GUIDE.md`** - คู่มือ API แบบละเอียด
- **`REWARDS_API_SPEC.json`** - OpenAPI 3.0 specification
- **`REWARDS_TYPES.ts`** - TypeScript interfaces และ utility functions

### 2. Test Files
- **`test-rewards.html`** - Web interface สำหรับทดสอบ API
- **`test-rewards-token.js`** - Test script สำหรับ token-based API

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# ไม่ต้องติดตั้ง dependencies เพิ่มเติม
# ใช้ fetch API ที่มีใน browser แล้ว
```

### 2. Import TypeScript Types
```typescript
import { 
  Reward, 
  Redemption, 
  RedeemRequest, 
  RewardsApiClient,
  useRewards,
  useRedemptions 
} from './docs/REWARDS_TYPES';
```

### 3. Initialize API Client
```typescript
const apiClient = new RewardsApiClient('/api/rewards');
```

## 📖 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/rewards/active` | ดูรางวัลที่เปิดใช้งาน | ❌ |
| GET | `/api/rewards/{id}` | ดูรายละเอียดรางวัล | ❌ |
| POST | `/api/rewards/redeem` | แลกรางวัล | ✅ (JWT Token) |
| GET | `/api/rewards/redemptions/user` | ดูประวัติการแลก | ✅ (JWT Token) |

## 🔑 JWT Token Format

```typescript
interface GameToken {
  id: number;        // role_id
  userid: string;    // user_id
  serverid: number;  // server_id
  exp: number;       // expiration timestamp
}
```

## 💻 Code Examples

### Basic Usage
```typescript
// 1. Load active rewards
const rewards = await apiClient.getActiveRewards();

// 2. Redeem reward
const result = await apiClient.redeemReward({
  reward_id: 1,
  shipping_address: "123 Main St, Bangkok",
  email: "user@example.com",
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
});

// 3. Get user redemptions
const redemptions = await apiClient.getUserRedemptions(gameToken);
```

### React Hook Usage
```typescript
function RewardsPage({ gameToken }: { gameToken: string }) {
  const { rewards, loading, error } = useRewards(apiClient);
  const { redemptions } = useRedemptions(apiClient, gameToken);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {rewards.map(reward => (
        <RewardCard key={reward.id} reward={reward} />
      ))}
    </div>
  );
}
```

## 🎨 UI Components

### Reward Card Component
```typescript
interface RewardCardProps {
  reward: Reward;
  onRedeem: (rewardId: number) => void;
  userBalance: number;
}

function RewardCard({ reward, onRedeem, userBalance }: RewardCardProps) {
  const canRedeem = isRewardAvailable(reward) && userBalance >= reward.token_cost;
  
  return (
    <div className="reward-card">
      <img src={reward.image_url} alt={reward.name} />
      <h3>{reward.name}</h3>
      <p>{reward.description}</p>
      <p>Cost: {formatTokenCost(reward.token_cost)}</p>
      <p>Stock: {formatStockQuantity(reward.stock_quantity)}</p>
      
      {canRedeem ? (
        <button onClick={() => onRedeem(reward.id)}>
          Redeem
        </button>
      ) : (
        <button disabled>
          {userBalance < reward.token_cost ? 'Insufficient Balance' : 'Not Available'}
        </button>
      )}
    </div>
  );
}
```

### Redemption History Component
```typescript
function RedemptionHistory({ redemptions }: { redemptions: Redemption[] }) {
  return (
    <div className="redemption-history">
      <h3>Redemption History</h3>
      {redemptions.map(redemption => (
        <div key={redemption.id} className="redemption-item">
          <h4>{redemption.reward_name}</h4>
          <p>Status: <span style={{ color: getStatusColor(redemption.status) }}>
            {getStatusText(redemption.status)}
          </span></p>
          <p>Cost: {formatTokenCost(redemption.token_cost)}</p>
          <p>Date: {new Date(redemption.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Error Handling

### Common Error Scenarios
```typescript
try {
  const result = await apiClient.redeemReward(request);
  // Success
} catch (error) {
  if (error.message.includes('Insufficient')) {
    // Show insufficient balance message
  } else if (error.message.includes('Token expired')) {
    // Redirect to login
  } else if (error.message.includes('not available')) {
    // Show reward not available message
  } else {
    // Show generic error
  }
}
```

### Error Messages (Thai)
```typescript
const ERROR_MESSAGES = {
  'Insufficient realMoney balance': 'ยอดเงินไม่เพียงพอ',
  'Token expired': 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่',
  'Reward is not available': 'รางวัลไม่พร้อมใช้งาน',
  'Invalid token': 'Token ไม่ถูกต้อง',
  'All fields are required': 'กรุณากรอกข้อมูลให้ครบถ้วน',
};
```

## 🎯 Best Practices

### 1. Token Management
```typescript
// ตรวจสอบ token ก่อนใช้งาน
function isValidToken(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// Refresh token if needed
if (!isValidToken(gameToken)) {
  // Redirect to login or refresh token
}
```

### 2. Loading States
```typescript
const [redeeming, setRedeeming] = useState(false);

const handleRedeem = async (rewardId: number) => {
  setRedeeming(true);
  try {
    await apiClient.redeemReward({ ... });
  } finally {
    setRedeeming(false);
  }
};
```

### 3. Optimistic Updates
```typescript
const handleRedeem = async (rewardId: number) => {
  // Update UI immediately
  setUserBalance(prev => prev - reward.token_cost);
  
  try {
    await apiClient.redeemReward({ ... });
    // Refresh data to confirm
    refetchRedemptions();
  } catch (error) {
    // Revert UI changes
    setUserBalance(prev => prev + reward.token_cost);
    throw error;
  }
};
```

## 🧪 Testing

### Test with Web Interface
1. เปิด `http://localhost:3500/test-rewards.html`
2. ใส่ JWT token ที่ได้จากเกม
3. ทดสอบการแลกรางวัลและดูประวัติ

### Test with Code
```typescript
// Test API client
const apiClient = new RewardsApiClient();

// Test loading rewards
const rewards = await apiClient.getActiveRewards();
console.log('Loaded rewards:', rewards.length);

// Test redemption (with real token)
try {
  const result = await apiClient.redeemReward({
    reward_id: 1,
    shipping_address: 'Test Address',
    email: 'test@example.com',
    token: 'your_jwt_token_here'
  });
  console.log('Redemption successful:', result);
} catch (error) {
  console.error('Redemption failed:', error.message);
}
```

## 📞 Support

### Common Issues
1. **Token expired**: ตรวจสอบ JWT token ว่ายังไม่หมดอายุ
2. **CORS error**: ตรวจสอบ CORS settings ใน backend
3. **Network error**: ตรวจสอบ API endpoint และ network connection

### Debug Tips
```typescript
// Enable debug logging
const apiClient = new RewardsApiClient();
apiClient.debug = true; // If debug mode is available

// Check token payload
const tokenPayload = JSON.parse(atob(gameToken.split('.')[1]));
console.log('Token payload:', tokenPayload);
```

### Contact
- **Backend Team**: backend@wildhammer.online
- **API Documentation**: `/docs/REWARDS_API_GUIDE.md`
- **Test Interface**: `http://localhost:3500/test-rewards.html`
