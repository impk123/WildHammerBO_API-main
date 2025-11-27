const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupRewards() {
    let connection;
    
    try {
        // Connect to database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'lyz_backoffice',
            charset: 'utf8mb4'
        });

        console.log('🔗 Connected to database');

        // Sample rewards data
        const sampleRewards = [
            {
                name: 'Gaming Mouse RGB',
                image_url: 'https://example.com/images/gaming-mouse.jpg',
                token_cost: 1000,
                description: 'High-quality gaming mouse with RGB lighting',
                stock_quantity: 50
            },
            {
                name: 'Mechanical Keyboard',
                image_url: 'https://example.com/images/mechanical-keyboard.jpg',
                token_cost: 2000,
                description: 'Premium mechanical keyboard with blue switches',
                stock_quantity: 30
            },
            {
                name: 'Gaming Headset',
                image_url: 'https://example.com/images/gaming-headset.jpg',
                token_cost: 1500,
                description: '7.1 Surround sound gaming headset',
                stock_quantity: 40
            },
            {
                name: 'Gaming Chair',
                image_url: 'https://example.com/images/gaming-chair.jpg',
                token_cost: 5000,
                description: 'Ergonomic gaming chair with lumbar support',
                stock_quantity: 10
            },
            {
                name: 'Steam Gift Card $10',
                image_url: 'https://example.com/images/steam-gift-card.jpg',
                token_cost: 800,
                description: '$10 Steam gift card for game purchases',
                stock_quantity: -1 // Unlimited
            },
            {
                name: 'Discord Nitro 1 Month',
                image_url: 'https://example.com/images/discord-nitro.jpg',
                token_cost: 600,
                description: '1 month Discord Nitro subscription',
                stock_quantity: -1 // Unlimited
            }
        ];

        // Insert sample rewards
        for (const reward of sampleRewards) {
            try {
                await connection.execute(
                    `INSERT INTO rewards (name, image_url, token_cost, description, stock_quantity) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [reward.name, reward.image_url, reward.token_cost, reward.description, reward.stock_quantity]
                );
                console.log(`✅ Added reward: ${reward.name}`);
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`⚠️  Reward already exists: ${reward.name}`);
                } else {
                    console.error(`❌ Error adding reward ${reward.name}:`, error.message);
                }
            }
        }

        console.log('🎉 Rewards setup completed!');
        console.log('\n📋 Available API endpoints:');
        console.log('GET  /api/rewards/active - Get active rewards');
        console.log('GET  /api/rewards/:id - Get reward by ID');
        console.log('POST /api/rewards/redeem - Redeem reward');
        console.log('GET  /api/rewards/redemptions/user/:user_id/:server_id - Get user redemptions');
        console.log('\n🔧 Admin endpoints (require authentication):');
        console.log('GET  /api/rewards - Get all rewards');
        console.log('POST /api/rewards - Create new reward');
        console.log('PUT  /api/rewards/:id - Update reward');
        console.log('DELETE /api/rewards/:id - Delete reward');
        console.log('GET  /api/rewards/redemptions/all - Get all redemptions');
        console.log('PUT  /api/rewards/redemptions/:id/status - Update redemption status');
        console.log('GET  /api/rewards/redemptions/statistics - Get redemption statistics');

    } catch (error) {
        console.error('❌ Database setup failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run setup if called directly
if (require.main === module) {
    setupRewards();
}

module.exports = setupRewards;
