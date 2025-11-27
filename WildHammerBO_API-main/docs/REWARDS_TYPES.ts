/**
 * TypeScript Interfaces for Rewards System API
 * สำหรับ dev UI ใช้งาน
 */

// ===== CORE TYPES =====

export interface Reward {
  id: number;
  name: string;
  image_url: string;
  token_cost: number;
  description: string;
  is_active: boolean;
  stock_quantity: number; // -1 = unlimited
  created_at: string;
  updated_at: string;
}

export interface Redemption {
  id: number;
  reward_id: number;
  user_id: string;
  server_id: number;
  token_cost: number;
  real_money_before: number;
  real_money_after: number;
  shipping_address: string;
  email: string;
  status: RedemptionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  reward_name: string;
  reward_image: string;
}

export type RedemptionStatus = 
  | 'pending' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

// ===== API REQUEST TYPES =====

export interface RedeemRequest {
  reward_id: number;
  shipping_address: string;
  email: string;
  token: string;
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ActiveRewardsResponse {
  success: true;
  data: Reward[];
}

export interface RewardResponse {
  success: true;
  data: Reward;
}

export interface RedeemResponse {
  success: true;
  message: string;
  data: {
    redemption_id: number;
    new_balance: number;
    reward_name: string;
    user_id: string;
    server_id: number;
  };
}

export interface UserRedemptionsResponse {
  success: true;
  data: Redemption[];
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

// ===== API CLIENT CLASS =====

export class RewardsApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/rewards') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get active rewards
   */
  async getActiveRewards(): Promise<Reward[]> {
    const response = await fetch(`${this.baseUrl}/active`);
    const data: ActiveRewardsResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to load active rewards');
    }
    
    return data.data;
  }

  /**
   * Get reward by ID
   */
  async getRewardById(id: number): Promise<Reward> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    const data: RewardResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to load reward');
    }
    
    return data.data;
  }

  /**
   * Redeem reward
   */
  async redeemReward(request: RedeemRequest): Promise<RedeemResponse['data']> {
    const response = await fetch(`${this.baseUrl}/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    const data: RedeemResponse | ErrorResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to redeem reward');
    }
    
    return data.data;
  }

  /**
   * Get user redemption history
   */
  async getUserRedemptions(token: string): Promise<Redemption[]> {
    const response = await fetch(`${this.baseUrl}/redemptions/user?token=${encodeURIComponent(token)}`);
    const data: UserRedemptionsResponse = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to load redemption history');
    }
    
    return data.data;
  }
}

// ===== REACT HOOKS =====

import { useState, useEffect, useCallback } from 'react';

export function useRewards(apiClient: RewardsApiClient) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getActiveRewards();
      setRewards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  return {
    rewards,
    loading,
    error,
    refetch: loadRewards,
  };
}

export function useRedemptions(apiClient: RewardsApiClient, token: string) {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRedemptions = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiClient.getUserRedemptions(token);
      setRedemptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, token]);

  useEffect(() => {
    loadRedemptions();
  }, [loadRedemptions]);

  return {
    redemptions,
    loading,
    error,
    refetch: loadRedemptions,
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Check if reward is available for redemption
 */
export function isRewardAvailable(reward: Reward): boolean {
  return reward.is_active && (reward.stock_quantity === -1 || reward.stock_quantity > 0);
}

/**
 * Format token cost for display
 */
export function formatTokenCost(cost: number): string {
  return `${cost.toLocaleString()} tokens`;
}

/**
 * Format stock quantity for display
 */
export function formatStockQuantity(quantity: number): string {
  return quantity === -1 ? 'Unlimited' : quantity.toString();
}

/**
 * Get status color for redemption status
 */
export function getStatusColor(status: RedemptionStatus): string {
  const colors = {
    pending: '#f59e0b',      // amber
    processing: '#3b82f6',   // blue
    shipped: '#8b5cf6',      // purple
    delivered: '#10b981',    // green
    cancelled: '#ef4444',    // red
  };
  
  return colors[status] || '#6b7280';
}

/**
 * Get status text for redemption status
 */
export function getStatusText(status: RedemptionStatus): string {
  const texts = {
    pending: 'รอการตรวจสอบ',
    processing: 'กำลังดำเนินการ',
    shipped: 'จัดส่งแล้ว',
    delivered: 'ได้รับแล้ว',
    cancelled: 'ยกเลิก',
  };
  
  return texts[status] || status;
}

// ===== EXAMPLE USAGE =====

/*
// Initialize API client
const apiClient = new RewardsApiClient();

// React component example
function RewardsPage({ gameToken }: { gameToken: string }) {
  const { rewards, loading, error } = useRewards(apiClient);
  const { redemptions, refetch: refetchRedemptions } = useRedemptions(apiClient, gameToken);

  const handleRedeem = async (rewardId: number, shippingAddress: string, email: string) => {
    try {
      await apiClient.redeemReward({
        reward_id: rewardId,
        shipping_address: shippingAddress,
        email: email,
        token: gameToken,
      });
      
      // Refresh redemptions after successful redemption
      refetchRedemptions();
      alert('Redemption successful!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Available Rewards</h2>
      {rewards.map(reward => (
        <div key={reward.id}>
          <h3>{reward.name}</h3>
          <p>Cost: {formatTokenCost(reward.token_cost)}</p>
          <p>Stock: {formatStockQuantity(reward.stock_quantity)}</p>
          {isRewardAvailable(reward) && (
            <button onClick={() => handleRedeem(reward.id, 'address', 'email@example.com')}>
              Redeem
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
*/
