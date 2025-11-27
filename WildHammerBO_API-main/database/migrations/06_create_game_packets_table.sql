-- Create game_packets table for managing in-game item packets
-- This table stores different types of packet bundles that players can purchase with tokens

CREATE TABLE IF NOT EXISTS `game_packets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `packet_type` enum('starter','equipment','weapon','special','premium') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'starter',
  `price_token` int NOT NULL DEFAULT '0',
  `game_items` json DEFAULT NULL,
  `equipment_items` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `max_purchases_per_user` int DEFAULT NULL,
  `daily_purchase_limit` int DEFAULT NULL,
  `level_requirement` int NOT NULL DEFAULT '1',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_packet_type` (`packet_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_featured` (`is_featured`),
  KEY `idx_level_requirement` (`level_requirement`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_game_packets_active_featured` (`is_active`,`is_featured`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: packet_items table is no longer needed as items are stored as JSON in game_packets table

-- Create packet_purchases table to track user purchases
CREATE TABLE IF NOT EXISTS `packet_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `packet_id` int(11) NOT NULL,
  `payment_type` enum('token') NOT NULL,
  `amount_paid` int NOT NULL,
  `items_received` json DEFAULT NULL,
  `purchase_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_packet_id` (`packet_id`),
  KEY `idx_payment_type` (`payment_type`),
  KEY `idx_purchase_date` (`purchase_date`),
  KEY `idx_user_packet` (`user_id`, `packet_id`),
  KEY `idx_user_date` (`user_id`, `purchase_date`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`packet_id`) REFERENCES `game_packets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample game packets with JSON data
INSERT INTO `game_packets` (`name`, `description`, `packet_type`, `price_token`, `game_items`, `equipment_items`, `is_active`, `is_featured`, `level_requirement`, `sort_order`) VALUES
('แพคเริ่มต้น', 'แพคสำหรับผู้เล่นใหม่ ประกอบด้วยของใช้พื้นฐานและไอเทมช่วยเหลือ', 'starter', 1000, 
'[{"id":"1001","name":"เหรียญทอง","quantity":500,"rarity":"common"},{"id":"1005","name":"ตั๋วเร่งความเร็ว","quantity":5,"rarity":"common"}]', 
'[]', 1, 1, 1, 1),
('แพคอุปกรณ์สุดคุ้ม', 'แพคอุปกรณ์หลากหลายชิ้นสำหรับเพิ่มพลัง', 'equipment', 5000, 
'[]',
'[{"id":"armor_01","name":"เกราะเหล็ก","quantity":1,"rarity":"uncommon"},{"id":"helmet_01","name":"หมวกเหล็ก","quantity":1,"rarity":"uncommon"}]', 1, 1, 5, 2),
('แพคอาวุธสูงสุด', 'แพคอาวุธคุณภาพสูงสำหรับการต่อสู้', 'weapon', 10000,
'[]',
'[{"id":"sword_legendary","name":"ดาบตำนาน","quantity":1,"rarity":"legendary","drop_chance":10}]', 1, 1, 10, 3),
('แพคพิเศษประจำวัน', 'แพคพิเศษที่เปลี่ยนไอเทมทุกวัน', 'special', 20000,
'[{"id":"1001","name":"เหรียญทอง","quantity":9999,"rarity":"common"},{"id":"6023","name":"ปีแห่งความเงียบสงัด","quantity":1,"rarity":"common"}]',
'[]', 1, 0, 3, 4),
('แพคพรีเมียม', 'แพคสุดพิเศษสำหรับผู้เล่นระดับสูง', 'premium', 25000,
'[{"id":"1001","name":"เหรียญทอง","quantity":10000,"rarity":"common"}]',
'[{"id":"premium_set","name":"ชุดพรีเมียม","quantity":1,"rarity":"epic"}]', 1, 1, 20, 5)
ON DUPLICATE KEY UPDATE `updated_at` = NOW();

-- Note: Sample items are now stored as JSON in the game_packets table above

-- Create indexes for better performance
CREATE INDEX `idx_packet_purchases_user_date_range` ON `packet_purchases` (`user_id`, `purchase_date`);

-- Create view for packet statistics
CREATE OR REPLACE VIEW `packet_statistics` AS
SELECT 
    gp.id as packet_id,
    gp.name as packet_name,
    gp.packet_type,
    gp.price_token,
    COUNT(pp.id) as total_purchases,
    COUNT(DISTINCT pp.user_id) as unique_buyers,
    SUM(pp.amount_paid) as total_tokens_earned,
    MIN(pp.purchase_date) as first_purchase,
    MAX(pp.purchase_date) as latest_purchase
FROM game_packets gp
LEFT JOIN packet_purchases pp ON gp.id = pp.packet_id
GROUP BY gp.id, gp.name, gp.packet_type, gp.price_token;