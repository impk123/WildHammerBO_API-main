const db_backoffice = require('./src/models/db_backoffice');

async function createTestUser() {
    try {
        console.log('Creating test user...');
        
        // Insert a test user
        const insertQuery = `
            INSERT INTO users (username, email, display_name, level, experience, coins, gems, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            coins = VALUES(coins),
            gems = VALUES(gems)
        `;
        
        const [result] = await db_backoffice.execute(insertQuery, [
            'testuser123',
            'testuser@example.com', 
            'Test User',
            5,
            1250,
            500,
            50,
            1
        ]);
        
        console.log('✅ Test user created/updated successfully');
        console.log('User ID:', result.insertId || 'existing user updated');
        
        // Get the user to confirm
        const selectQuery = 'SELECT id, username, coins, gems FROM users WHERE email = ?';
        const [users] = await db_backoffice.execute(selectQuery, ['testuser@example.com']);
        
        if (users.length > 0) {
            const user = users[0];
            console.log('👤 User details:');
            console.log('  ID:', user.id);
            console.log('  Username:', user.username);
            console.log('  Coins:', user.coins);
            console.log('  Gems:', user.gems);
            return user.id;
        }
        
    } catch (error) {
        console.error('❌ Error creating test user:', error.message);
        return null;
    }
}

async function testCurrencyController() {
    console.log('🧪 Testing Currency Controller Functions...\n');
    
    const userId = await createTestUser();
    if (!userId) {
        console.log('Cannot proceed without test user');
        return;
    }
    
    // Mock admin and request objects for testing
    const mockAdmin = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com'
    };
    
    const mockReq = {
        params: { userId: userId.toString() },
        admin: mockAdmin,
        body: {},
        query: {}
    };
    
    const mockRes = {
        data: null,
        statusCode: 200,
        json: function(data) {
            this.data = data;
            console.log('Response:', JSON.stringify(data, null, 2));
        },
        status: function(code) {
            this.statusCode = code;
            return this;
        }
    };
    
    // Import currency controller functions
    const {
        getUserCurrency,
        updateUserCurrency,
        getCurrencyHistory,
        searchUsers,
        getCurrencyStatistics
    } = require('./src/controllers/currency.Controller');
    
    console.log('💱 Testing getUserCurrency...');
    await getUserCurrency(mockReq, mockRes);
    
    console.log('\n📊 Testing getCurrencyStatistics...');
    await getCurrencyStatistics({ admin: mockAdmin, query: {} }, mockRes);
    
    console.log('\n🔍 Testing searchUsers...');
    await searchUsers({ admin: mockAdmin, query: { q: 'test', limit: 5 } }, mockRes);
    
    console.log('\n💸 Testing updateUserCurrency...');
    mockReq.body = {
        action: 'add',
        amount: 100,
        currency_type: 'coins',
        reason: 'Direct controller test'
    };
    await updateUserCurrency(mockReq, mockRes);
    
    console.log('\n📜 Testing getCurrencyHistory...');
    mockReq.query = { limit: 5 };
    await getCurrencyHistory(mockReq, mockRes);
    
    console.log('\n🎉 Currency Controller Tests Completed!');
    process.exit(0);
}

testCurrencyController().catch(console.error);
