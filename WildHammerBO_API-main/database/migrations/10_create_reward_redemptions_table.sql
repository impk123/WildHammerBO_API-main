-- Create reward_redemptions table
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reward_id INT NOT NULL COMMENT 'ID ของรางวัล',
    user_id INT NOT NULL COMMENT 'ID ของผู้ใช้',
    server_id INT NOT NULL COMMENT 'ID ของเซิร์ฟเวอร์',
    token_cost INT NOT NULL COMMENT 'จำนวน token ที่ใช้แลก',
    real_money_before INT NOT NULL COMMENT 'ยอด realMoney ก่อนแลก',
    real_money_after INT NOT NULL COMMENT 'ยอด realMoney หลังแลก',
    shipping_address TEXT NOT NULL COMMENT 'ที่อยู่จัดส่ง',
    email VARCHAR(255) NOT NULL COMMENT 'อีเมลล์',
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending' COMMENT 'สถานะการจัดส่ง',
    notes TEXT COMMENT 'หมายเหตุเพิ่มเติม',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_server_id (server_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
