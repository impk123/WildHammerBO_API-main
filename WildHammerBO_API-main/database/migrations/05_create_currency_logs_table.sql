-- Create currency_logs table to track all currency changes by admins
-- This table stores audit trail for all currency modifications

CREATE TABLE IF NOT EXISTS `currency_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `currency_type` enum('coins','gems') NOT NULL,
  `action` enum('add','subtract','set') NOT NULL,
  `old_value` bigint(20) NOT NULL DEFAULT 0,
  `new_value` bigint(20) NOT NULL DEFAULT 0,
  `amount` bigint(20) NOT NULL DEFAULT 0,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_currency_type` (`currency_type`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_currency_date` (`user_id`, `currency_type`, `created_at`),
  KEY `idx_admin_activity` (`admin_id`, `created_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
