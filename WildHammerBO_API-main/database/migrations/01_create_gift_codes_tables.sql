-- Gift Code System Database Schema

-- Create gift_codes table
CREATE TABLE IF NOT EXISTS `gift_codes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL UNIQUE,
  `type` enum('single', 'multi', 'unlimited') NOT NULL DEFAULT 'single',
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `max_usage` int(11) NOT NULL DEFAULT 1,
  `max_usage_per_user` int(11) NOT NULL DEFAULT 1,
  `rewards` json NOT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_code` (`code`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_start_end_date` (`start_date`, `end_date`),
  FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create gift_code_redemptions table
CREATE TABLE IF NOT EXISTS `gift_code_redemptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gift_code_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `redemption_status` enum('success', 'failed') NOT NULL,
  `rewards_given` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_gift_code_id` (`gift_code_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_redemption_status` (`redemption_status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_code` (`user_id`, `gift_code_id`),
  FOREIGN KEY (`gift_code_id`) REFERENCES `gift_codes` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for better performance
CREATE INDEX `idx_gift_codes_active_dates` ON `gift_codes` (`is_active`, `start_date`, `end_date`);
CREATE INDEX `idx_redemptions_user_status` ON `gift_code_redemptions` (`user_id`, `redemption_status`);
CREATE INDEX `idx_redemptions_date_status` ON `gift_code_redemptions` (`created_at`, `redemption_status`);

-- Insert sample gift codes for testing
INSERT INTO `gift_codes` (`code`, `type`, `title`, `description`, `max_usage`, `max_usage_per_user`, `rewards`, `start_date`, `end_date`, `is_active`, `created_by`) VALUES
-- Welcome and New Player Codes
('WELCOME2024', 'unlimited', 'Welcome Gift', 'Welcome gift for new players', 1000, 1, '{"coins": 1000, "gems": 100, "items": {"health_potion": 5}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),
('NEWBIE100', 'unlimited', 'Newbie Starter Pack', 'Starter pack for new players under level 10', 500, 1, '{"coins": 2000, "gems": 200, "experience": 500, "items": {"basic_sword": 1, "health_potion": 10}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),

-- Event and Special Occasion Codes
('LAUNCH100', 'single', 'Launch Special', 'Special launch event gift', 100, 1, '{"coins": 5000, "gems": 500, "items": {"legendary_sword": 1, "armor_set": 1}}', '2024-08-01 00:00:00', '2024-09-30 23:59:59', 1, 1),
('HALLOWEEN2024', 'multi', 'Halloween Event', 'Spooky Halloween rewards', 1000, 1, '{"coins": 3000, "gems": 300, "items": {"pumpkin_helmet": 1, "ghost_cape": 1, "candy": 20}}', '2024-10-25 00:00:00', '2024-11-02 23:59:59', 1, 1),
('XMAS2024', 'multi', 'Christmas Special', 'Christmas event rewards', 2000, 1, '{"coins": 4000, "gems": 400, "items": {"santa_hat": 1, "christmas_tree": 1, "gift_box": 10}}', '2024-12-20 00:00:00', '2025-01-05 23:59:59', 1, 1),
('NEWYEAR2025', 'unlimited', 'New Year Celebration', 'New Year bonus for all players', 5000, 1, '{"coins": 2025, "gems": 202, "experience": 2025}', '2024-12-31 00:00:00', '2025-01-31 23:59:59', 1, 1),

-- Daily and Weekly Codes
('DAILY50', 'multi', 'Daily Bonus', 'Daily bonus for active players', 50, 1, '{"coins": 500, "experience": 1000}', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, 1),
('WEEKLY200', 'multi', 'Weekly Reward', 'Weekly special reward', 200, 1, '{"coins": 2000, "gems": 150, "items": {"energy_potion": 5}}', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 1),
('WEEKEND100', 'multi', 'Weekend Bonus', 'Special weekend bonus', 500, 1, '{"coins": 1500, "gems": 100, "experience": 2000}', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 1, 1),

-- VIP and Premium Codes
('VIP2024', 'multi', 'VIP Member Gift', 'Exclusive gift for VIP members', 100, 1, '{"coins": 10000, "gems": 1000, "items": {"vip_badge": 1, "premium_chest": 3}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),
('PREMIUM500', 'single', 'Premium Pack', 'Premium rewards pack', 500, 1, '{"coins": 7500, "gems": 750, "items": {"rare_weapon": 1, "rare_armor": 1}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),

-- Community and Social Media Codes
('FACEBOOK1K', 'multi', 'Facebook Followers', 'Thanks for following our Facebook page', 1000, 1, '{"coins": 1000, "gems": 100, "items": {"social_badge": 1}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),
('YOUTUBE500', 'multi', 'YouTube Subscribers', 'YouTube subscriber milestone reward', 500, 1, '{"coins": 1500, "gems": 150, "items": {"youtuber_hat": 1}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),
('DISCORD200', 'multi', 'Discord Community', 'Discord server member reward', 2000, 1, '{"coins": 800, "gems": 80, "items": {"discord_badge": 1}}', '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, 1),

-- Testing and Development Codes
('TEST123', 'unlimited', 'Test Code', 'Test code for development purposes', 999999, 999, '{"coins": 1000000, "gems": 100000, "experience": 500000}', '2024-01-01 00:00:00', '2025-12-31 23:59:59', 1, 1),
('ADMIN2024', 'unlimited', 'Admin Test Code', 'Admin testing code with all rewards', 999999, 999, '{"coins": 999999, "gems": 99999, "experience": 999999, "items": {"admin_sword": 1, "admin_armor": 1, "admin_ring": 1}}', '2024-01-01 00:00:00', '2025-12-31 23:59:59', 1, 1),

-- Limited Time Flash Codes
('FLASH24H', 'multi', '24 Hour Flash Sale', 'Limited 24-hour flash sale code', 100, 1, '{"coins": 5000, "gems": 500, "items": {"flash_sword": 1}}', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 1, 1),
('LUCKY777', 'single', 'Lucky Number 777', 'Super lucky jackpot code', 77, 1, '{"coins": 77777, "gems": 7777, "items": {"lucky_charm": 1}}', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 1, 1),

-- Expired Codes (for testing expiration logic)
('EXPIRED2023', 'multi', 'Expired Test Code', 'Code for testing expiration functionality', 100, 1, '{"coins": 1000, "gems": 100}', '2023-01-01 00:00:00', '2023-12-31 23:59:59', 0, 1),
('OLDCODE', 'single', 'Old Inactive Code', 'Old code that should be inactive', 50, 1, '{"coins": 500}', '2023-06-01 00:00:00', '2023-08-31 23:59:59', 0, 1)

ON DUPLICATE KEY UPDATE `updated_at` = NOW();

-- Insert sample redemption data for testing
-- Note: This assumes user IDs 1-10 exist in the users table
INSERT INTO `gift_code_redemptions` (`gift_code_id`, `user_id`, `user_email`, `redemption_status`, `rewards_given`, `ip_address`, `user_agent`, `created_at`) VALUES
-- Successful redemptions
(1, 1, 'user1@example.com', 'success', '{"coins": 1000, "gems": 100, "items": {"health_potion": 5}}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(1, 2, 'user2@example.com', 'success', '{"coins": 1000, "gems": 100, "items": {"health_potion": 5}}', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(2, 1, 'user1@example.com', 'success', '{"coins": 2000, "gems": 200, "experience": 500, "items": {"basic_sword": 1, "health_potion": 10}}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, 3, 'user3@example.com', 'success', '{"coins": 5000, "gems": 500, "items": {"legendary_sword": 1, "armor_set": 1}}', '192.168.1.102', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(7, 1, 'user1@example.com', 'success', '{"coins": 500, "experience": 1000}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, 2, 'user2@example.com', 'success', '{"coins": 500, "experience": 1000}', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(8, 4, 'user4@example.com', 'success', '{"coins": 2000, "gems": 150, "items": {"energy_potion": 5}}', '192.168.1.103', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(9, 5, 'user5@example.com', 'success', '{"coins": 1500, "gems": 100, "experience": 2000}', '192.168.1.104', 'Mozilla/5.0 (Android 11; Mobile; rv:92.0) Gecko/92.0 Firefox/92.0', DATE_SUB(NOW(), INTERVAL 3 HOUR)),

-- Failed redemptions (for testing error scenarios)
(3, 2, 'user2@example.com', 'failed', NULL, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 2, 'user2@example.com', 'failed', NULL, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(18, 6, 'user6@example.com', 'failed', NULL, '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
(19, 7, 'user7@example.com', 'failed', NULL, '192.168.1.106', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', DATE_SUB(NOW(), INTERVAL 2 HOUR))

ON DUPLICATE KEY UPDATE `created_at` = VALUES(`created_at`);

-- Create view for gift code statistics
CREATE OR REPLACE VIEW `gift_code_stats_view` AS
SELECT 
    gc.id,
    gc.code,
    gc.title,
    gc.type,
    gc.max_usage,
    gc.max_usage_per_user,
    gc.is_active,
    COALESCE(stats.total_redemptions, 0) as total_redemptions,
    COALESCE(stats.successful_redemptions, 0) as successful_redemptions,
    COALESCE(stats.failed_redemptions, 0) as failed_redemptions,
    COALESCE(stats.unique_users, 0) as unique_users,
    CASE 
        WHEN gc.max_usage > 0 THEN 
            ROUND((COALESCE(stats.successful_redemptions, 0) / gc.max_usage) * 100, 2)
        ELSE 0 
    END as usage_percentage,
    gc.created_at,
    gc.updated_at
FROM gift_codes gc
LEFT JOIN (
    SELECT 
        gift_code_id,
        COUNT(*) as total_redemptions,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(CASE WHEN redemption_status = 'success' THEN 1 ELSE 0 END) as successful_redemptions,
        SUM(CASE WHEN redemption_status = 'failed' THEN 1 ELSE 0 END) as failed_redemptions
    FROM gift_code_redemptions
    GROUP BY gift_code_id
) stats ON gc.id = stats.gift_code_id;

-- Create stored procedure for gift code cleanup (optional)
DELIMITER //
CREATE PROCEDURE CleanupExpiredGiftCodes()
BEGIN
    -- Deactivate expired gift codes
    UPDATE gift_codes 
    SET is_active = 0, updated_at = NOW()
    WHERE is_active = 1 
    AND end_date IS NOT NULL 
    AND end_date < NOW();
    
    -- Get count of deactivated codes
    SELECT ROW_COUNT() as deactivated_codes;
END //
DELIMITER ;

-- Create event scheduler to run cleanup daily (optional)
-- Note: Make sure event_scheduler is enabled in MySQL
-- SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS `daily_gift_code_cleanup`
ON SCHEDULE EVERY 1 DAY
STARTS '2024-01-01 02:00:00'
DO
  CALL CleanupExpiredGiftCodes();

-- Sample queries for analytics

-- Top performing gift codes by redemption count
-- SELECT * FROM gift_code_stats_view ORDER BY successful_redemptions DESC LIMIT 10;

-- Gift code usage by date
-- SELECT 
--     DATE(created_at) as redemption_date,
--     COUNT(*) as total_redemptions,
--     COUNT(DISTINCT user_id) as unique_users
-- FROM gift_code_redemptions 
-- WHERE redemption_status = 'success'
-- GROUP BY DATE(created_at)
-- ORDER BY redemption_date DESC;

-- User redemption patterns
-- SELECT 
--     user_id,
--     COUNT(*) as total_redemptions,
--     COUNT(DISTINCT gift_code_id) as unique_codes_redeemed,
--     MIN(created_at) as first_redemption,
--     MAX(created_at) as last_redemption
-- FROM gift_code_redemptions 
-- WHERE redemption_status = 'success'
-- GROUP BY user_id
-- ORDER BY total_redemptions DESC;
