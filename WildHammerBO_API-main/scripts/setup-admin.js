const bcrypt = require('bcryptjs');
const AdminModel = require('../src/models/admin');

async function createDefaultAdmin() {
    try {
        console.log('Creating default admin...');
        
        // Check if admin already exists
        const existingAdmin = await AdminModel.findOne({ email: 'admin@example.com' });
        if (existingAdmin) {
            console.log('Admin already exists:', existingAdmin.email);
            return;
        }

        // Create new admin
        const adminData = {
            email: 'admin@example.com',
            password: 'admin123', // This will be hashed automatically by AdminModel.create
            role: 'super_admin'
        };

        const admin = await AdminModel.create(adminData);
        console.log('Default admin created successfully:');
        console.log('Email:', admin.email);
        console.log('Role:', admin.role);
        console.log('Password: admin123');
        
    } catch (error) {
        console.error('Error creating default admin:', error.message);
        
        // If it's a database connection error, show more helpful info
        if (error.code === 'ECONNREFUSED') {
            console.log('\n❌ Database connection failed!');
            console.log('Please make sure:');
            console.log('1. MySQL is running on port 3301');
            console.log('2. Database "little_idlegame" exists');
            console.log('3. The "admins" table has been created');
            console.log('\nRun the SQL script in database.sql first!');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log('\n❌ Table "admins" does not exist!');
            console.log('Please run the SQL script in database.sql first!');
        }
    }
}

createDefaultAdmin().catch(console.error);
