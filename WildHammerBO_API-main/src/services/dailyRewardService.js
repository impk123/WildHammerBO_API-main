const DailyRewardModel = require('../models/dailyReward');
const DailyRewardClaimModel = require('../models/dailyRewardClaim');
const { decodeGameToken } = require('../utils/jwtGameUtils');

class DailyRewardService {
    /**
     * Get all daily rewards
     */
    static async getAllRewards(filters = {}) {
        try {
            const rewards = await DailyRewardModel.findAll(filters);
            return {
                success: true,
                data: rewards
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getAllRewards:', error);
            return {
                success: false,
                message: 'Failed to get daily rewards'
            };
        }
    }

    /**
     * Get reward by day number
     */
    static async getRewardByDay(dayNumber) {
        try {
            const reward = await DailyRewardModel.findByDayNumber(dayNumber);
            if (!reward) {
                return {
                    success: false,
                    message: 'Reward not found for this day'
                };
            }
            
            return {
                success: true,
                data: reward
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getRewardByDay:', error);
            return {
                success: false,
                message: 'Failed to get daily reward'
            };
        }
    }

    /**
     * Create daily reward
     */
    static async createReward(rewardData) {
        try {
            const rewardId = await DailyRewardModel.create(rewardData);
            return {
                success: true,
                data: {
                    id: rewardId,
                    ...rewardData
                }
            };
        } catch (error) {
            console.error('Error in DailyRewardService.createReward:', error);
            return {
                success: false,
                message: 'Failed to create daily reward'
            };
        }
    }

    /**
     * Update daily reward
     */
    static async updateReward(dayNumber, rewardData) {
        try {
            const updated = await DailyRewardModel.update(dayNumber, rewardData);
            if (!updated) {
                return {
                    success: false,
                    message: 'Reward not found or no changes made'
                };
            }
            
            return {
                success: true,
                message: 'Daily reward updated successfully'
            };
        } catch (error) {
            console.error('Error in DailyRewardService.updateReward:', error);
            return {
                success: false,
                message: 'Failed to update daily reward'
            };
        }
    }

    /**
     * Delete daily reward
     */
    static async deleteReward(dayNumber) {
        try {
            const deleted = await DailyRewardModel.delete(dayNumber);
            if (!deleted) {
                return {
                    success: false,
                    message: 'Reward not found'
                };
            }
            
            return {
                success: true,
                message: 'Daily reward deleted successfully'
            };
        } catch (error) {
            console.error('Error in DailyRewardService.deleteReward:', error);
            return {
                success: false,
                message: 'Failed to delete daily reward'
            };
        }
    }

    /**
     * Toggle reward active status
     */
    static async toggleRewardStatus(dayNumber) {
        try {
            const toggled = await DailyRewardModel.toggleActiveStatus(dayNumber);
            if (!toggled) {
                return {
                    success: false,
                    message: 'Reward not found'
                };
            }
            
            return {
                success: true,
                message: 'Reward status toggled successfully'
            };
        } catch (error) {
            console.error('Error in DailyRewardService.toggleRewardStatus:', error);
            return {
                success: false,
                message: 'Failed to toggle reward status'
            };
        }
    }

    /**
     * Create multiple daily rewards
     */
    static async createMultipleRewards(totalDays, startDate, cycleName = null) {
        try {
            const rewardsData = [];
            
            for (let i = 1; i <= totalDays; i++) {
                rewardsData.push({
                    day_number: i,
                    reward_items: [],
                    reward_equipment: [],
                    reward_tokens: 0.00,
                    is_active: 1
                });
            }
            
            const result = await DailyRewardModel.createMultiple(rewardsData);
            
            // Create cycle information
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + totalDays - 1);
            
            // Create cycle record
            const cycleResult = await DailyRewardModel.createCycle({
                cycle_name: cycleName || `Daily Rewards Cycle ${new Date().toISOString().split('T')[0]}`,
                start_date: startDate,
                end_date: endDate.toISOString().split('T')[0],
                total_days: totalDays,
                is_active: 1
            });
            
            return {
                success: true,
                message: `Created ${totalDays} daily rewards with cycle`,
                data: {
                    total_days: totalDays,
                    start_date: startDate,
                    end_date: endDate.toISOString().split('T')[0],
                    cycle_id: cycleResult
                }
            };
        } catch (error) {
            console.error('Error in DailyRewardService.createMultipleRewards:', error);
            return {
                success: false,
                message: 'Failed to create multiple daily rewards'
            };
        }
    }

    /**
     * Copy rewards from one cycle to another
     */
    static async copyRewards(fromStartDate, fromEndDate, toStartDate) {
        try {
            const fromStart = new Date(fromStartDate);
            const fromEnd = new Date(fromEndDate);
            const toStart = new Date(toStartDate);
            
            const totalDays = Math.ceil((fromEnd - fromStart) / (1000 * 60 * 60 * 24)) + 1;
            
            const result = await DailyRewardModel.copyRewards(
                fromStartDate, 
                fromEndDate, 
                toStartDate, 
                totalDays
            );
            
            return result;
        } catch (error) {
            console.error('Error in DailyRewardService.copyRewards:', error);
            return {
                success: false,
                message: 'Failed to copy rewards'
            };
        }
    }

    /**
     * Get current cycle
     */
    static async getCurrentCycle() {
        try {
            const cycle = await DailyRewardModel.getCurrentCycle();
            return {
                success: true,
                data: cycle
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getCurrentCycle:', error);
            return {
                success: false,
                message: 'Failed to get current cycle'
            };
        }
    }

    /**
     * Get all cycles
     */
    static async getAllCycles() {
        try {
            const cycles = await DailyRewardModel.getAllCycles();
            return {
                success: true,
                data: cycles
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getAllCycles:', error);
            return {
                success: false,
                message: 'Failed to get all cycles'
            };
        }
    }

    /**
     * Get statistics
     */
    static async getStatistics() {
        try {
            const stats = await DailyRewardModel.getStatistics();
            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getStatistics:', error);
            return {
                success: false,
                message: 'Failed to get statistics'
            };
        }
    }

    /**
     * Get user's daily reward progress
     */
    static async getUserProgress(token) {
        try {
            const decoded = decodeGameToken(token);
            if (!decoded || !decoded.id) {
                return {
                    success: false,
                    message: 'Invalid token'
                };
            }
            
            const roleid = decoded.id;
            
            
            if (!roleid) {
                return {
                    success: false,
                    message: 'Invalid roleid from token'
                };
            }
            
            const progress = await DailyRewardClaimModel.getUserProgress(roleid);
            const claims = await DailyRewardClaimModel.getUserClaims(roleid, 7, 0); // Last 7 claims
            
            // Get current cycle information
            const currentCycle = await DailyRewardModel.getCurrentCycle();
            
            // Get all rewards in current cycle
            const allRewards = await DailyRewardModel.findAll({ is_active: 1 });
            
            // Get user's claim status for each day
            const userClaimStatus = {};
            for (const claim of claims) {
                userClaimStatus[claim.day_number] = {
                    claimed: true,
                    claimed_at: claim.claimed_at,
                    rewards: {
                        reward_items: claim.reward_items,
                        reward_equipment: claim.reward_equipment,
                        reward_tokens: claim.reward_tokens
                    }
                };
            }
            
            // Add claim status to each reward
            const rewardsWithStatus = allRewards.map(reward => ({
                ...reward,
                user_claimed: userClaimStatus[reward.day_number] || { claimed: false }
            }));
            
            return {
                success: true,
                data: {
                    roleid: roleid,
                    progress: progress,
                    recent_claims: claims,
                    current_cycle: currentCycle,
                    all_rewards: rewardsWithStatus
                }
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getUserProgress:', error);
            return {
                success: false,
                message: 'Failed to get user progress'
            };
        }
    }

    /**
     * Claim daily reward (auto-calculate day number based on current date)
     */
    static async claimDailyReward(token, claimData = {}) {
        try {
            const decoded = decodeGameToken(token);
            if (!decoded || !decoded.id) {
                return {
                    success: false,
                    message: 'Invalid token'
                };
            }
            
            const roleid = decoded.id;
            const serverid = decoded.serverid || 0;
            
            // Add serverid to claimData
            claimData.serverid = serverid;
            
            // Get current cycle information
            const currentCycle = await DailyRewardModel.getCurrentCycle();
            console.log('Current cycle:', currentCycle);
            
            if (!currentCycle) {
                return {
                    success: false,
                    message: 'No active reward cycle found'
                };
            }
            
            // Calculate current day number based on cycle start date
            // Use Thailand timezone (UTC+7) for date calculation
            const cycleStartDate = new Date(currentCycle.start_date);
            const currentDate = new Date();
            
            // Convert to Thailand timezone (UTC+7)
            const thailandOffset = 7 * 60; // 7 hours in minutes
            const thailandCurrentDate = new Date(currentDate.getTime() + (thailandOffset * 60 * 1000));
            const thailandCycleStartDate = new Date(cycleStartDate.getTime() + (thailandOffset * 60 * 1000));
            
            // Calculate difference using Thailand timezone
            const timeDiff = thailandCurrentDate.getTime() - thailandCycleStartDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1; // +1 because day 1 is the start date
                     
            // Check if current day is within the cycle
            // Allow claiming from day 1 even if current date is before or on start date
            let dayNumber;
            
            if (daysDiff < 1) {
                // If current date is before start date, use day 1
                dayNumber = 1;                
            } else if (daysDiff > currentCycle.total_days) {
                return {
                    success: false,
                    message: `Current date is outside the active reward cycle. Day ${daysDiff} is not within range 1-${currentCycle.total_days}`
                };
            } else {
                dayNumber = daysDiff;
            }
            
            // Check if already claimed
            const existingClaim = await DailyRewardClaimModel.hasClaimed(roleid, dayNumber);
            if (existingClaim) {
                return {
                    success: false,
                    message: `Reward already claimed for day ${dayNumber}`
                };
            }
            
            // Get reward data
            const reward = await DailyRewardModel.findByDayNumber(dayNumber);
            if (!reward) {
                return {
                    success: false,
                    message: `Reward not found for day ${dayNumber}`
                };
            }
            
            if (!reward.is_active) {
                return {
                    success: false,
                    message: `Reward is not active for day ${dayNumber}`
                };
            }
            
            // Claim the reward
            const claimResult = await DailyRewardClaimModel.claimReward(
                roleid, 
                dayNumber, 
                {
                    reward_items: reward.reward_items,
                    reward_equipment: reward.reward_equipment,
                    reward_tokens: reward.reward_tokens
                },
                claimData
            );
            
            // Add day number to response
            if (claimResult.success) {
                claimResult.data.day_number = dayNumber;
                claimResult.data.cycle_info = {
                    cycle_name: currentCycle.cycle_name,
                    start_date: currentCycle.start_date,
                    end_date: currentCycle.end_date,
                    total_days: currentCycle.total_days
                };
            }
            
            return claimResult;
        } catch (error) {
            console.error('Error in DailyRewardService.claimDailyReward:', error);
            return {
                success: false,
                message: 'Failed to claim daily reward'
            };
        }
    }

    /**
     * Get user's claim history
     */
    static async getUserClaimHistory(token, limit = 30, offset = 0) {
        try {
            const decoded = decodeGameToken(token);
            if (!decoded || !decoded.id) {
                return {
                    success: false,
                    message: 'Invalid token'
                };
            }
            
            const roleid = decoded.id;
            const claims = await DailyRewardClaimModel.getUserClaims(roleid, limit, offset);
            
            return {
                success: true,
                data: claims
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getUserClaimHistory:', error);
            return {
                success: false,
                message: 'Failed to get claim history'
            };
        }
    }

    /**
     * Get claim statistics (admin)
     */
    static async getClaimStatistics() {
        try {
            const stats = await DailyRewardClaimModel.getClaimStatistics();
            const topClaimers = await DailyRewardClaimModel.getTopClaimers(10);
            
            return {
                success: true,
                data: {
                    daily_stats: stats,
                    top_claimers: topClaimers
                }
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getClaimStatistics:', error);
            return {
                success: false,
                message: 'Failed to get claim statistics'
            };
        }
    }

    /**
     * Get all claims (admin)
     */
    static async getAllClaims(filters = {}, limit = 50, offset = 0) {
        try {
            const claims = await DailyRewardClaimModel.getAllClaims(filters, limit, offset);
            return {
                success: true,
                data: claims
            };
        } catch (error) {
            console.error('Error in DailyRewardService.getAllClaims:', error);
            return {
                success: false,
                message: 'Failed to get all claims'
            };
        }
    }

    /**
     * Rollback a claim (delete claim record)
     */
    static async rollBackClaim(claimId) {
        try {
            const result = await DailyRewardClaimModel.deleteClaim(claimId);
            return result;
        } catch (error) {
            console.error('Error in DailyRewardService.rollBackClaim:', error);
            return {
                success: false,
                message: 'Failed to rollback claim'
            };
        }
    }
}

module.exports = DailyRewardService;
