-- Create active_servers table
CREATE TABLE IF NOT EXISTS `active_servers` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `server_id_list` varchar(255) NOT NULL DEFAULT '[]' COMMENT 'JSON array of active server IDs like [1,2,3]',
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default record with id=1
INSERT INTO `active_servers` (`id`, `server_id_list`) 
VALUES (1, '[1,2,3]') 
ON DUPLICATE KEY UPDATE `server_id_list` = VALUES(`server_id_list`);
