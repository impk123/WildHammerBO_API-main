-- Payment Package System Migration
-- File: 04_create_payment_packages_tables.sql

-- Create payment_packages table
CREATE TABLE IF NOT EXISTS `payment_packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `package_id` varchar(50) NOT NULL UNIQUE,
  `name` varchar(100) NOT NULL,
  `description` text,
  `category` enum('starter', 'popular', 'premium', 'mega', 'special', 'limited') NOT NULL DEFAULT 'starter',
  `package_type` enum('coins', 'gems', 'bundle', 'vip', 'subscription') NOT NULL DEFAULT 'coins',
  `price_usd` decimal(10,2) NOT NULL,
  `price_local` decimal(10,2) DEFAULT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `rewards` json NOT NULL COMMENT 'JSON object containing rewards: {coins, gems, items, etc}',
  `bonus_percentage` int(11) DEFAULT 0 COMMENT 'Bonus percentage for this package',
  `is_popular` tinyint(1) DEFAULT 0 COMMENT 'Mark as popular package',
  `is_limited_time` tinyint(1) DEFAULT 0 COMMENT 'Limited time offer',
  `limited_end_date` datetime DEFAULT NULL,
  `max_purchases` int(11) DEFAULT NULL COMMENT 'Max purchases per user (NULL = unlimited)',
  `min_level_required` int(11) DEFAULT 1 COMMENT 'Minimum player level required',
  `platform_availability` json DEFAULT NULL COMMENT 'Available platforms: {ios, android, web}',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_package_id` (`package_id`),
  KEY `idx_category` (`category`),
  KEY `idx_package_type` (`package_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_popular` (`is_popular`),
  KEY `idx_price` (`price_usd`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_created_by` (`created_by`),
  FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` varchar(100) NOT NULL UNIQUE,
  `package_id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `user_email` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'USD',
  `payment_method` enum('credit_card', 'paypal', 'google_pay', 'apple_pay', 'bank_transfer', 'crypto', 'other') NOT NULL,
  `payment_provider` varchar(50) DEFAULT NULL COMMENT 'stripe, paypal, etc',
  `provider_transaction_id` varchar(255) DEFAULT NULL,
  `status` enum('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  `rewards_delivered` tinyint(1) DEFAULT 0,
  `failure_reason` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `platform` enum('ios', 'android', 'web', 'desktop') DEFAULT NULL,
  `country_code` varchar(2) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_package_id` (`package_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_method` (`payment_method`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_status` (`user_id`, `status`),
  FOREIGN KEY (`package_id`) REFERENCES `payment_packages` (`package_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payment_user_purchases table for tracking user purchase history
CREATE TABLE IF NOT EXISTS `payment_user_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `package_id` varchar(50) NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `purchase_count` int(11) DEFAULT 1,
  `total_spent` decimal(10,2) DEFAULT 0.00,
  `first_purchase_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_purchase_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_package` (`user_id`, `package_id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_user_purchases` (`user_id`, `last_purchase_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`package_id`) REFERENCES `payment_packages` (`package_id`) ON DELETE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions` (`transaction_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create payment_analytics table for business insights
CREATE TABLE IF NOT EXISTS `payment_analytics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `package_id` varchar(50) NOT NULL,
  `total_sales` int(11) DEFAULT 0,
  `total_revenue` decimal(12,2) DEFAULT 0.00,
  `unique_buyers` int(11) DEFAULT 0,
  `conversion_rate` decimal(5,2) DEFAULT 0.00,
  `refund_count` int(11) DEFAULT 0,
  `refund_amount` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_date_package` (`date`, `package_id`),
  KEY `idx_date` (`date`),
  KEY `idx_package_analytics` (`package_id`, `date`),
  FOREIGN KEY (`package_id`) REFERENCES `payment_packages` (`package_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample payment packages
INSERT INTO `payment_packages` (
    `package_id`, `name`, `description`, `category`, `package_type`, 
    `price_usd`, `currency`, `rewards`, `bonus_percentage`, 
    `is_popular`, `is_active`, `sort_order`
) VALUES
-- Starter Packages
('coins_100', 'Starter Coins', 'Perfect for new players', 'starter', 'coins', 0.99, 'USD', 
 '{"coins": 1000, "gems": 0}', 0, 0, 1, 1),

('coins_500', 'Coin Pack Small', 'Great value coin package', 'starter', 'coins', 4.99, 'USD', 
 '{"coins": 6000, "gems": 50}', 20, 0, 1, 2),

-- Popular Packages  
('coins_1000', 'Popular Coin Pack', 'Most popular choice!', 'popular', 'coins', 9.99, 'USD', 
 '{"coins": 15000, "gems": 150}', 50, 1, 1, 3),

('gems_100', 'Gem Package', 'Premium currency pack', 'popular', 'gems', 9.99, 'USD', 
 '{"coins": 5000, "gems": 500}', 25, 1, 1, 4),

-- Premium Packages
('coins_2000', 'Premium Coin Pack', 'Excellent value for serious players', 'premium', 'coins', 19.99, 'USD', 
 '{"coins": 35000, "gems": 400, "premium_items": [{"id": 1, "quantity": 5}]}', 75, 0, 1, 5),

('bundle_starter', 'Starter Bundle', 'Everything you need to get started', 'premium', 'bundle', 24.99, 'USD', 
 '{"coins": 25000, "gems": 300, "experience": 1000, "items": [{"id": 1, "quantity": 10}, {"id": 2, "quantity": 5}]}', 100, 0, 1, 6),

-- Mega Packages
('mega_pack', 'Mega Value Pack', 'Best value for money', 'mega', 'bundle', 49.99, 'USD', 
 '{"coins": 100000, "gems": 1500, "premium_currency": 100, "experience": 5000, "vip_days": 7}', 150, 0, 1, 7),

('vip_month', 'VIP Monthly', 'Premium VIP experience', 'mega', 'vip', 29.99, 'USD', 
 '{"coins": 50000, "gems": 800, "vip_days": 30, "daily_bonus_multiplier": 2}', 200, 0, 1, 8),

-- Special Limited Packages
('special_holiday', 'Holiday Special', 'Limited time holiday package', 'special', 'bundle', 19.99, 'USD', 
 '{"coins": 30000, "gems": 500, "holiday_items": [{"id": 99, "quantity": 1}], "experience": 2000}', 300, 0, 1, 9),

('limited_founder', 'Founder Pack', 'Exclusive founder package', 'limited', 'bundle', 99.99, 'USD', 
 '{"coins": 500000, "gems": 5000, "premium_currency": 1000, "founder_badge": true, "vip_days": 90}', 500, 0, 1, 10);

-- Insert sample transaction for testing
INSERT INTO `payment_transactions` (
    `transaction_id`, `package_id`, `user_id`, `user_email`, 
    `amount`, `currency`, `payment_method`, `payment_provider`, 
    `provider_transaction_id`, `status`, `rewards_delivered`, 
    `platform`, `country_code`, `processed_at`, `delivered_at`
) VALUES
('txn_test_001', 'coins_100', 1, 'test@example.com', 0.99, 'USD', 'credit_card', 'stripe', 
 'ch_test_123456', 'completed', 1, 'web', 'US', NOW(), NOW()),

('txn_test_002', 'coins_1000', 1, 'test@example.com', 9.99, 'USD', 'paypal', 'paypal', 
 'pp_test_789012', 'completed', 1, 'android', 'US', NOW(), NOW()),

('txn_test_003', 'mega_pack', 2, 'user2@example.com', 49.99, 'USD', 'google_pay', 'google', 
 'gp_test_345678', 'pending', 0, 'android', 'CA', NOW(), NULL);
