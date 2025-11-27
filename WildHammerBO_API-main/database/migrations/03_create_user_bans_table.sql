-- Migration: Create user bans tracking table
-- This table tracks all ban/unban activities with complete details

CREATE TABLE IF NOT EXISTS `user_bans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` enum('ban', 'unban') NOT NULL,
  `reason` text NOT NULL,
  `ban_type` enum('temporary', 'permanent') DEFAULT 'permanent',
  `ban_duration_hours` int(11) DEFAULT NULL COMMENT 'For temporary bans, duration in hours',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT 'When temporary ban expires',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `game_notified` tinyint(1) DEFAULT 0 COMMENT 'Whether game service was notified',
  `game_response` json DEFAULT NULL COMMENT 'Response from game service',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_expires_at` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for checking active bans
CREATE INDEX `idx_active_bans` ON `user_bans` (`user_id`, `action`, `expires_at`);

-- Update users table to add more ban-related fields
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `ban_reason` text DEFAULT NULL COMMENT 'Current ban reason',
ADD COLUMN IF NOT EXISTS `banned_at` timestamp NULL DEFAULT NULL COMMENT 'When user was banned',
ADD COLUMN IF NOT EXISTS `banned_by` int(11) DEFAULT NULL COMMENT 'Admin who banned the user',
ADD COLUMN IF NOT EXISTS `ban_expires_at` timestamp NULL DEFAULT NULL COMMENT 'When ban expires for temporary bans';

-- Add foreign key for banned_by
ALTER TABLE `users` 
ADD CONSTRAINT `fk_users_banned_by` FOREIGN KEY (`banned_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

-- Create view for current user status
CREATE OR REPLACE VIEW `user_status_view` AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.is_active,
    u.ban_reason,
    u.banned_at,
    u.banned_by,
    u.ban_expires_at,
    u.created_at,
    u.updated_at,
    a.username as banned_by_admin,
    CASE 
        WHEN u.is_active = 'banned' AND u.ban_expires_at IS NOT NULL AND u.ban_expires_at > NOW() THEN 'temporary_banned'
        WHEN u.is_active = 'banned' AND (u.ban_expires_at IS NULL OR u.ban_expires_at <= NOW()) THEN 'permanently_banned'
        WHEN u.is_active = 'banned' AND u.ban_expires_at <= NOW() THEN 'ban_expired'
        WHEN u.is_active = 'inactive' THEN 'inactive'
        WHEN u.is_active = '1' THEN 'active'
        ELSE 'unknown'
    END as status_description
FROM users u
LEFT JOIN admins a ON u.banned_by = a.id;
