  -- Users table for gift code redemption tracking
  -- This is a simplified user table for the gift code system

  CREATE TABLE IF NOT EXISTS `users` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `username` varchar(50) NOT NULL UNIQUE,
    `email` varchar(255) NOT NULL UNIQUE,
    `password` varchar(255) NOT NULL,
    `display_name` varchar(100) DEFAULT NULL,
    `level` int(11) NOT NULL DEFAULT 1,
    `experience` bigint(20) NOT NULL DEFAULT 0,
    `coins` bigint(20) NOT NULL DEFAULT 0,
    `gems` int(11) NOT NULL DEFAULT 0,
    `last_login` timestamp NULL DEFAULT NULL,
    `is_active` tinyint(1) NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_username` (`username`),
    UNIQUE KEY `idx_email` (`email`),
    KEY `idx_is_active` (`is_active`),
    KEY `idx_level` (`level`),
    KEY `idx_last_login` (`last_login`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- Insert sample users for testing
  INSERT INTO `users` (`username`, `email`, `password_hash`, `display_name`, `level`, `experience`, `coins`, `gems`) VALUES
  ('testuser1', 'test1@example.com', '$2b$10$dummy.hash.for.testing.purposes.only', 'Test User 1', 5, 12500, 5000, 250),
  ('testuser2', 'test2@example.com', '$2b$10$dummy.hash.for.testing.purposes.only', 'Test User 2', 3, 7500, 2500, 150),
  ('player123', 'player123@game.com', '$2b$10$dummy.hash.for.testing.purposes.only', 'Pro Player', 10, 50000, 25000, 1000)
  ON DUPLICATE KEY UPDATE `updated_at` = NOW();

  -- Create user_inventory table for storing items from gift codes
  CREATE TABLE IF NOT EXISTS `user_inventory` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `item_type` varchar(50) NOT NULL,
    `item_id` varchar(50) NOT NULL,
    `quantity` int(11) NOT NULL DEFAULT 1,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `idx_user_item` (`user_id`, `item_type`, `item_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_item_type` (`item_type`),
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
