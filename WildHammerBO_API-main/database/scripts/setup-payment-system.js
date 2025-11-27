const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createTablesIndividually(connection) {
    const tables = [
        {
            name: 'payment_packages',
            sql: `CREATE TABLE IF NOT EXISTS payment_packages (
                id int(11) NOT NULL AUTO_INCREMENT,
                package_id varchar(50) NOT NULL UNIQUE,
                name varchar(100) NOT NULL,
                description text,
                category enum('starter', 'popular', 'premium', 'mega', 'special', 'limited') NOT NULL DEFAULT 'starter',
                package_type enum('coins', 'gems', 'bundle', 'vip', 'subscription') NOT NULL DEFAULT 'coins',
                price_usd decimal(10,2) NOT NULL,
                price_local decimal(10,2) DEFAULT NULL,
                currency varchar(3) NOT NULL DEFAULT 'USD',
                rewards json NOT NULL COMMENT 'JSON object containing rewards: {coins, gems, items, etc}',
                bonus_percentage int(11) DEFAULT 0 COMMENT 'Bonus percentage for this package',
                is_popular tinyint(1) DEFAULT 0 COMMENT 'Mark as popular package',
                is_limited_time tinyint(1) DEFAULT 0 COMMENT 'Limited time offer',
                limited_end_date datetime DEFAULT NULL,
                max_purchases int(11) DEFAULT NULL COMMENT 'Max purchases per user (NULL = unlimited)',
                min_level_required int(11) DEFAULT 1 COMMENT 'Minimum player level required',
                platform_availability json DEFAULT NULL COMMENT 'Available platforms: {ios, android, web}',
                is_active tinyint(1) NOT NULL DEFAULT 1,
                sort_order int(11) DEFAULT 0,
                created_by int(11) DEFAULT NULL,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_package_id (package_id),
                KEY idx_category (category),
                KEY idx_package_type (package_type),
                KEY idx_is_active (is_active),
                KEY idx_is_popular (is_popular),
                KEY idx_price (price_usd),
                KEY idx_sort_order (sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        },
        {
            name: 'payment_transactions',
            sql: `CREATE TABLE IF NOT EXISTS payment_transactions (
                id int(11) NOT NULL AUTO_INCREMENT,
                transaction_id varchar(100) NOT NULL UNIQUE,
                package_id varchar(50) NOT NULL,
                user_id int(11) NOT NULL,
                user_email varchar(255) DEFAULT NULL,
                amount decimal(10,2) NOT NULL,
                currency varchar(3) NOT NULL DEFAULT 'USD',
                payment_method enum('credit_card', 'paypal', 'google_pay', 'apple_pay', 'bank_transfer', 'crypto', 'other') NOT NULL,
                payment_provider varchar(50) DEFAULT NULL COMMENT 'stripe, paypal, etc',
                provider_transaction_id varchar(255) DEFAULT NULL,
                status enum('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
                rewards_delivered tinyint(1) DEFAULT 0,
                failure_reason text DEFAULT NULL,
                ip_address varchar(45) DEFAULT NULL,
                user_agent text DEFAULT NULL,
                platform enum('ios', 'android', 'web', 'desktop') DEFAULT NULL,
                country_code varchar(2) DEFAULT NULL,
                processed_at timestamp NULL DEFAULT NULL,
                delivered_at timestamp NULL DEFAULT NULL,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_transaction_id (transaction_id),
                KEY idx_package_id (package_id),
                KEY idx_user_id (user_id),
                KEY idx_status (status),
                KEY idx_payment_method (payment_method),
                KEY idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        },
        {
            name: 'payment_user_purchases',
            sql: `CREATE TABLE IF NOT EXISTS payment_user_purchases (
                id int(11) NOT NULL AUTO_INCREMENT,
                user_id int(11) NOT NULL,
                package_id varchar(50) NOT NULL,
                transaction_id varchar(100) NOT NULL,
                purchase_count int(11) DEFAULT 1,
                total_spent decimal(10,2) DEFAULT 0.00,
                first_purchase_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_purchase_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_user_package (user_id, package_id),
                KEY idx_transaction_id (transaction_id),
                KEY idx_user_purchases (user_id, last_purchase_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        },
        {
            name: 'payment_analytics',
            sql: `CREATE TABLE IF NOT EXISTS payment_analytics (
                id int(11) NOT NULL AUTO_INCREMENT,
                date date NOT NULL,
                package_id varchar(50) NOT NULL,
                total_sales int(11) DEFAULT 0,
                total_revenue decimal(12,2) DEFAULT 0.00,
                unique_buyers int(11) DEFAULT 0,
                conversion_rate decimal(5,2) DEFAULT 0.00,
                refund_count int(11) DEFAULT 0,
                refund_amount decimal(10,2) DEFAULT 0.00,
                created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY idx_date_package (date, package_id),
                KEY idx_date (date),
                KEY idx_package_analytics (package_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        }
    ];

    for (const table of tables) {
        try {
            await connection.execute(table.sql);
            console.log(`   ✅ Table ${table.name} created`);
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log(`   ⚠️  Table ${table.name} already exists`);
            } else {
                console.error(`   ❌ Failed to create table ${table.name}:`, error.message);
                throw error;
            }
        }
    }

    // Insert sample data
    await insertSampleData(connection);
}

async function insertSampleData(connection) {
    console.log('   🔄 Inserting sample payment packages...');
    
    const samplePackages = [
        ['coins_100', 'Starter Coins', 'Perfect for new players', 'starter', 'coins', 0.99, 'USD', '{"coins": 1000, "gems": 0}', 0, 0, 1, 1],
        ['coins_500', 'Coin Pack Small', 'Great value coin package', 'starter', 'coins', 4.99, 'USD', '{"coins": 6000, "gems": 50}', 20, 0, 1, 2],
        ['coins_1000', 'Popular Coin Pack', 'Most popular choice!', 'popular', 'coins', 9.99, 'USD', '{"coins": 15000, "gems": 150}', 50, 1, 1, 3],
        ['gems_100', 'Gem Package', 'Premium currency pack', 'popular', 'gems', 9.99, 'USD', '{"coins": 5000, "gems": 500}', 25, 1, 1, 4],
        ['mega_pack', 'Mega Value Pack', 'Best value for money', 'mega', 'bundle', 49.99, 'USD', '{"coins": 100000, "gems": 1500, "premium_currency": 100, "experience": 5000, "vip_days": 7}', 150, 0, 1, 7]
    ];

    for (const pkg of samplePackages) {
        try {
            await connection.execute(`
                INSERT INTO payment_packages (
                    package_id, name, description, category, package_type, 
                    price_usd, currency, rewards, bonus_percentage, 
                    is_popular, is_active, sort_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
            `, pkg);
        } catch (error) {
            if (!error.message.includes('Duplicate entry')) {
                console.error(`   ❌ Failed to insert package ${pkg[0]}:`, error.message);
            }
        }
    }

    console.log('   ✅ Sample data inserted');
}

async function setupPaymentSystem() {
    let connection;
    
    try {
        console.log('🔄 Connecting to database...');
        
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'little_idlegame'
        });

        console.log('✅ Connected to database');

        // Read the payment system migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '04_create_payment_packages_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('🔄 Running payment system migration...');

        // Execute the SQL file directly using multipleStatements
        connection.config.multipleStatements = true;
        
        try {
            await connection.query(migrationSQL);
            console.log('   ✅ Migration executed successfully');
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
                console.log('   ⚠️  Some tables already exist - skipping');
            } else {
                // Try to execute in parts if the full migration fails
                console.log('   ⚠️  Full migration failed, trying individual tables...');
                await createTablesIndividually(connection);
            }
        }

        console.log('✅ Payment system migration completed successfully!');

        // Check the results
        const [packages] = await connection.execute('SELECT COUNT(*) as count FROM payment_packages');
        const [transactions] = await connection.execute('SELECT COUNT(*) as count FROM payment_transactions');
        const [userPurchases] = await connection.execute('SELECT COUNT(*) as count FROM payment_user_purchases');
        const [analytics] = await connection.execute('SELECT COUNT(*) as count FROM payment_analytics');

        console.log('\n📊 Payment System Setup Results:');
        console.log(`   • Payment Packages: ${packages[0].count}`);
        console.log(`   • Sample Transactions: ${transactions[0].count}`);
        console.log(`   • User Purchase Records: ${userPurchases[0].count}`);
        console.log(`   • Analytics Table: ${analytics[0].count} records`);

        // Show sample payment packages
        const [samplePackages] = await connection.execute(`
            SELECT package_id, name, category, package_type, price_usd, 
                   JSON_EXTRACT(rewards, '$.coins') as coins,
                   JSON_EXTRACT(rewards, '$.gems') as gems,
                   is_popular, is_active
            FROM payment_packages 
            WHERE is_active = 1 
            ORDER BY sort_order ASC 
            LIMIT 10
        `);

        console.log('\n💳 Sample Payment Packages:');
        samplePackages.forEach(pkg => {
            console.log(`   • ${pkg.package_id} - ${pkg.name} (${pkg.category})`);
            console.log(`     Price: $${pkg.price_usd} | Rewards: ${pkg.coins || 0} coins, ${pkg.gems || 0} gems`);
            console.log(`     Type: ${pkg.package_type} | Popular: ${pkg.is_popular ? 'Yes' : 'No'}`);
        });

        console.log('\n🚀 Payment System ready!');
        console.log('\n📋 Available API Endpoints:');
        console.log('   • GET  /api/payments/packages - List all packages');
        console.log('   • GET  /api/payments/packages/popular - Popular packages');
        console.log('   • POST /api/payments/initialize - Initialize payment');
        console.log('   • POST /api/payments/complete/:transactionId - Complete payment');
        console.log('   • GET  /api/payments/users/:userId/purchases - User purchase history');
        console.log('   • POST /api/payments/admin/packages - Create package (admin)');
        console.log('   • GET  /api/payments/admin/analytics - Payment analytics (admin)');

    } catch (error) {
        console.error('❌ Payment system setup failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setupPaymentSystem()
        .then(() => {
            console.log('\n✅ Payment system setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Payment system setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = setupPaymentSystem;
