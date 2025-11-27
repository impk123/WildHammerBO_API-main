const bcrypt = require('bcryptjs');

async function createDefaultAdmin() {
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    console.log('Default admin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('Hashed Password:', hashedPassword);
    console.log('\nSQL to insert default admin:');
    console.log(`INSERT INTO admins (email, password, role, is_active) VALUES 
('admin@example.com', '${hashedPassword}', 'super_admin', 'active')
ON DUPLICATE KEY UPDATE 
role = 'super_admin',
is_active = 'active';`);
}

createDefaultAdmin().catch(console.error);
