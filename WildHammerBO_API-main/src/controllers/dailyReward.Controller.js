const DailyRewardService = require('../services/dailyRewardService');
const backendUserService = require('../services/backendUserSevice');
const jwtGameUtils = require('../utils/jwtGameUtils');
const sendEmailService = require('../services/sendEmailService');

class DailyRewardController {
    /**
     * Get all daily rewards (Admin)
     */
    static async getAllRewards(req, res) {
        try {
            const filters = {
                is_active: req.query.is_active !== undefined ? parseInt(req.query.is_active) : undefined,
                day_number: req.query.day_number ? parseInt(req.query.day_number) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit) : undefined,
                offset: req.query.offset ? parseInt(req.query.offset) : undefined
            };

            const result = await DailyRewardService.getAllRewards(filters);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'Daily rewards retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getAllRewards:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get reward by day number (Admin)
     */
    static async getRewardByDay(req, res) {
        try {
            const { dayNumber } = req.params;
            const result = await DailyRewardService.getRewardByDay(parseInt(dayNumber));
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'Daily reward retrieved successfully'
                });
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getRewardByDay:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Create daily reward (Admin)
     */
    static async createReward(req, res) {
        try {
            const rewardData = req.body;
            const result = await DailyRewardService.createReward(rewardData);
            
            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: result.data,
                    message: 'Daily reward created successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.createReward:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Update daily reward (Admin)
     */
    static async updateReward(req, res) {
        try {
            const { dayNumber } = req.params;
            const rewardData = req.body;
            const result = await DailyRewardService.updateReward(parseInt(dayNumber), rewardData);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.updateReward:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Delete daily reward (Admin)
     */
    static async deleteReward(req, res) {
        try {
            const { dayNumber } = req.params;
            const result = await DailyRewardService.deleteReward(parseInt(dayNumber));
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.deleteReward:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Toggle reward active status (Admin)
     */
    static async toggleRewardStatus(req, res) {
        try {
            const { dayNumber } = req.params;
            const result = await DailyRewardService.toggleRewardStatus(parseInt(dayNumber));
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.toggleRewardStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Create multiple daily rewards (Admin)
     */
    static async createMultipleRewards(req, res) {
        try {
            const { totalDays, startDate, cycleName } = req.body;
            
            if (!totalDays || !startDate) {
                return res.status(400).json({
                    success: false,
                    message: 'totalDays and startDate are required'
                });
            }
            
            const result = await DailyRewardService.createMultipleRewards(totalDays, startDate, cycleName);
            
            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: result.data,
                    message: result.message
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.createMultipleRewards:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Copy rewards from one cycle to another (Admin)
     */
    static async copyRewards(req, res) {
        try {
            const { fromStartDate, fromEndDate, toStartDate } = req.body;
            
            if (!fromStartDate || !fromEndDate || !toStartDate) {
                return res.status(400).json({
                    success: false,
                    message: 'fromStartDate, fromEndDate, and toStartDate are required'
                });
            }
            
            const result = await DailyRewardService.copyRewards(fromStartDate, fromEndDate, toStartDate);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result,
                    message: result.message
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.copyRewards:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get current cycle (Admin)
     */
    static async getCurrentCycle(req, res) {
        try {
            const result = await DailyRewardService.getCurrentCycle();
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'Current cycle retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getCurrentCycle:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get all cycles (Admin)
     */
    static async getAllCycles(req, res) {
        try {
            const result = await DailyRewardService.getAllCycles();
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'All cycles retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getAllCycles:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get statistics (Admin)
     */
    static async getStatistics(req, res) {
        try {
            const result = await DailyRewardService.getStatistics();
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'Statistics retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getStatistics:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get user's daily reward progress (Client)
     */
    static async getUserProgress(req, res) {
        try {
            const token = req.body.token;
            
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
            }
            
            const result = await DailyRewardService.getUserProgress(token);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'User progress retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getUserProgress:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Claim daily reward (Client)
     */
    static async claimDailyReward(req, res) {
        try {
            const { token } = req.body;
            
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
            }
            
            const claimData = {
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            };
            
            const result = await DailyRewardService.claimDailyReward(token, claimData);

            if (result.success) {

                //Send mail 
                const decoded = jwtGameUtils.decodeGameToken(token);
                const roleId = decoded.id;
                const userid = decoded.userid || '';
                const serverid = decoded.serverid || 0;
                
                if(userid=='' || serverid==0){
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid username, userid, or serverid'
                    });
                }

                //update Realmoney by token
                const updateRealmoney = await backendUserService.increaseRealmoney(userid, result.data.rewards.reward_items.realmoney, 'Daily Reward');

                let gameItemsFormat = sendEmailService.convertPacketItemsToGameFormat(result.data.rewards.reward_items);
                const gameEquipmentFormat = sendEmailService.convertPacketEquipmentToGameFormat(result.data.rewards.reward_equipment);
                gameItemsFormat = gameItemsFormat.concat(gameEquipmentFormat);

                const sendEmail = await sendEmailService.sendBuyPacketEmail("รางวัลประจำวัน",`คุณได้รับรางวัลประจำวันที่ ${result.data.day_number}`,serverid,roleId, gameItemsFormat);
                if(sendEmail.success==false){            
                    //roll back claim
                    await DailyRewardService.rollBackClaim(result.data.id);
                    await backendUserService.refundRealmoney(serverid,userid, result.data.rewards.reward_items.realmoney);
                    return res.status(400).json({
                        success: false,
                        message: 'Failed to send mail'
                    });
                }

                res.json({
                    success: true,
                    data: result.data,
                    gameItemsFormat: gameItemsFormat,
                    message: 'Daily reward claimed successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.claimDailyReward:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get user's claim history (Client)
     */
    static async getUserClaimHistory(req, res) {
        try {
            const token = req.body.token;
            const limit = req.query.limit ? parseInt(req.query.limit) : 30;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token is required'
                });
            }
            
            const result = await DailyRewardService.getUserClaimHistory(token, limit, offset);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'Claim history retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getUserClaimHistory:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get claim statistics (Admin)
     */
    static async getClaimStatistics(req, res) {
        try {
            const result = await DailyRewardService.getClaimStatistics();
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'Claim statistics retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getClaimStatistics:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Get all claims (Admin)
     */
    static async getAllClaims(req, res) {
        try {
            const filters = {
                roleid: req.query.roleid,
                day_number: req.query.day_number ? parseInt(req.query.day_number) : undefined,
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };
            
            const limit = req.query.limit ? parseInt(req.query.limit) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset) : 0;
            
            const result = await DailyRewardService.getAllClaims(filters, limit, offset);
            
            if (result.success) {
                res.json({
                    success: true,
                    data: result.data,
                    message: 'All claims retrieved successfully'
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.getAllClaims:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Debug current cycle and date calculation
     */
    static async debugCycle(req, res) {
        try {
            const currentCycle = await DailyRewardModel.getCurrentCycle();
            
            if (!currentCycle) {
                return res.json({
                    success: false,
                    message: 'No active cycle found',
                    data: null
                });
            }
            
            const cycleStartDate = new Date(currentCycle.start_date);
            const currentDate = new Date();
            
            // Convert to Thailand timezone (UTC+7)
            const thailandOffset = 7 * 60; // 7 hours in minutes
            const thailandCurrentDate = new Date(currentDate.getTime() + (thailandOffset * 60 * 1000));
            const thailandCycleStartDate = new Date(cycleStartDate.getTime() + (thailandOffset * 60 * 1000));
            
            // Calculate difference using Thailand timezone
            const timeDiff = thailandCurrentDate.getTime() - thailandCycleStartDate.getTime();
            const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
            
            const debugInfo = {
                current_cycle: currentCycle,
                server_current_date: currentDate.toISOString().split('T')[0],
                thailand_current_date: thailandCurrentDate.toISOString().split('T')[0],
                cycle_start_date: currentCycle.start_date,
                thailand_cycle_start_date: thailandCycleStartDate.toISOString().split('T')[0],
                cycle_end_date: currentCycle.end_date,
                time_diff_ms: timeDiff,
                calculated_day: daysDiff,
                total_days: currentCycle.total_days,
                is_within_cycle: daysDiff >= 1 && daysDiff <= currentCycle.total_days,
                server_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                thailand_timezone: 'Asia/Bangkok (UTC+7)'
            };
            
            res.json({
                success: true,
                message: 'Debug information retrieved',
                data: debugInfo
            });
        } catch (error) {
            console.error('Error in DailyRewardController.debugCycle:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Rollback a claim (Admin only)
     */
    static async rollBackClaim(req, res) {
        try {
            const { claimId } = req.params;
            
            if (!claimId) {
                return res.status(400).json({
                    success: false,
                    message: 'Claim ID is required'
                });
            }
            
            const result = await DailyRewardService.rollBackClaim(claimId);
            
            if (result.success) {
                res.json({
                    success: true,
                    message: 'Claim rolled back successfully',
                    data: result.data
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Error in DailyRewardController.rollBackClaim:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

module.exports = DailyRewardController;
