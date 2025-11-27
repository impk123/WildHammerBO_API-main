-- Migration to update game_packets table structure
-- Remove price_coins, price_gems, price_ore columns and add price_token column

-- Step 1: Add the new price_token column and JSON columns
ALTER TABLE `game_packets` ADD COLUMN `price_token` int NOT NULL DEFAULT 0 AFTER `packet_type`;
ALTER TABLE `game_packets` ADD COLUMN `game_items` json DEFAULT NULL AFTER `price_token`;
ALTER TABLE `game_packets` ADD COLUMN `equipment_items` json DEFAULT NULL AFTER `game_items`;

-- Step 2: Migrate existing data (if any) from price_coins to price_token
-- You can adjust this logic based on your needs
UPDATE `game_packets` SET `price_token` = `price_coins` WHERE `price_coins` > 0;
UPDATE `game_packets` SET `price_token` = `price_gems` * 100 WHERE `price_gems` > 0 AND `price_token` = 0;

-- Step 3: Migrate packet_items to JSON format (if exists)
-- This is a manual step - you'll need to convert existing packet_items to JSON format

-- Step 4: Drop the old columns and tables
ALTER TABLE `game_packets` DROP COLUMN IF EXISTS `price_coins`;
ALTER TABLE `game_packets` DROP COLUMN IF EXISTS `price_gems`;
DROP TABLE IF EXISTS `packet_items`;

-- Step 5: Drop old indexes that are no longer needed (if they exist)
-- ALTER TABLE `game_packets` DROP INDEX IF EXISTS `idx_price_coins`;
-- ALTER TABLE `game_packets` DROP INDEX IF EXISTS `idx_price_gems`;

-- Step 6: Update packet_purchases table to use 'token' instead of 'coins'/'gems'
ALTER TABLE `packet_purchases` MODIFY `payment_type` enum('token') NOT NULL;

-- Step 7: Update existing purchase records (optional - adjust based on your data)
-- UPDATE `packet_purchases` SET `payment_type` = 'token' WHERE `payment_type` IN ('coins', 'gems');

-- Step 8: Update the view to reflect new structure
DROP VIEW IF EXISTS `packet_statistics`;

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

-- Step 9: Update sample data to use token pricing and JSON format (based on game_packet.json example)
UPDATE `game_packets` SET 
    `price_token` = CASE 
        WHEN `name` LIKE '%เริ่มต้น%' THEN 1000
        WHEN `name` LIKE '%อุปกรณ์%' THEN 5000
        WHEN `name` LIKE '%อาวุธ%' THEN 10000
        WHEN `name` LIKE '%พิเศษ%' THEN 20000
        WHEN `name` LIKE '%พรีเมียม%' THEN 25000
        ELSE 20000  -- Default price_token like in game_packet.json
    END,
    `game_items` = CASE 
        WHEN `name` LIKE '%เริ่มต้น%' THEN '[{"id":"1001","name":"เหรียญทอง","quantity":500,"rarity":"common"}]'
        WHEN `name` LIKE '%พิเศษ%' THEN '[{"id":"1001","name":"เหรียญทอง","quantity":9999,"rarity":"common"},{"id":"6023","name":"ปีแห่งความเงียบสงัด","quantity":1,"rarity":"common"}]'
        ELSE '[]'
    END,
    `equipment_items` = CASE 
        WHEN `name` LIKE '%อุปกรณ์%' THEN '[{"id":"armor_01","name":"เกราะเหล็ก","quantity":1,"rarity":"uncommon"}]'
        WHEN `name` LIKE '%อาวุธ%' THEN '[{"id":"sword_legendary","name":"ดาบตำนาน","quantity":1,"rarity":"legendary","drop_chance":10}]'
        ELSE '[]'
    END
WHERE id BETWEEN 1 AND 10;

-- Step 10: Verify the changes
SELECT id, name, packet_type, price_token, is_active FROM `game_packets` LIMIT 10;

-- Optional: Add tokens column to users table if it doesn't exist
-- ALTER TABLE `users` ADD COLUMN `tokens` bigint(20) NOT NULL DEFAULT 0 AFTER `gems`;
-- ALTER TABLE `users` ADD INDEX `idx_tokens` (`tokens`);

-- Verify statistics view
SELECT * FROM `packet_statistics` LIMIT 5;