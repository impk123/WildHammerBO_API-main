-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'ชื่อรางวัล',
    image_url VARCHAR(500) NOT NULL COMMENT 'URL รูปภาพรางวัล',
    token_cost INT NOT NULL COMMENT 'จำนวน token ที่ใช้แลก',
    description TEXT COMMENT 'รายละเอียดรางวัล',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'สถานะรางวัล (เปิด/ปิด)',
    stock_quantity INT DEFAULT -1 COMMENT 'จำนวนสต็อก (-1 = ไม่จำกัด)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
