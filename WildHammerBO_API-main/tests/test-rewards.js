const axios = require('axios');

const API_BASE = 'http://localhost:3500/api';

// Test configuration
const TEST_CONFIG = {
    user_id: 1,
    server_id: 1,
    email: 'test@example.com',
    shipping_address: '123 Test Street, Test City, Test Country'
};

async function testRewardsSystem() {
    console.log('🧪 Testing Rewards System...\n');

    try {
        // Test 1: Get active rewards
        console.log('1️⃣ Testing: Get Active Rewards');
        const activeRewardsResponse = await axios.get(`${API_BASE}/rewards/active`);
        console.log('✅ Active rewards loaded:', activeRewardsResponse.data.data.length, 'rewards');
        
        if (activeRewardsResponse.data.data.length > 0) {
            const firstReward = activeRewardsResponse.data.data[0];
            console.log('   First reward:', firstReward.name, '- Cost:', firstReward.token_cost, 'tokens');
        }

        // Test 2: Get specific reward
        if (activeRewardsResponse.data.data.length > 0) {
            const rewardId = activeRewardsResponse.data.data[0].id;
            console.log('\n2️⃣ Testing: Get Reward by ID');
            const rewardResponse = await axios.get(`${API_BASE}/rewards/${rewardId}`);
            console.log('✅ Reward details loaded:', rewardResponse.data.data.name);
        }

        // Test 3: Test redemption (this will fail without proper token)
        console.log('\n3️⃣ Testing: Redeem Reward (without token - should fail)');
        try {
            await axios.post(`${API_BASE}/rewards/redeem`, {
                reward_id: 1,
                email: TEST_CONFIG.email,
                shipping_address: TEST_CONFIG.shipping_address
            });
            console.log('❌ Unexpected success - token should be required');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Token required as expected');
            } else {
                console.log('⚠️  Different error:', error.response?.data?.message || error.message);
            }
        }

        // Test 4: Test user redemptions (without token - should fail)
        console.log('\n4️⃣ Testing: Get User Redemptions (without token - should fail)');
        try {
            await axios.get(`${API_BASE}/rewards/redemptions/user`);
            console.log('❌ Unexpected success - token should be required');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Token required as expected');
            } else {
                console.log('⚠️  Different error:', error.response?.data?.message || error.message);
            }
        }

        console.log('\n🎉 Basic rewards system tests completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Run database migrations: node database/scripts/setup-rewards.js');
        console.log('2. Test with authentication token');
        console.log('3. Test actual redemption with real user data');
        console.log('4. Use the test interface at: http://localhost:3500/test-rewards.html');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Test database connection and table structure
async function testDatabaseStructure() {
    console.log('🔍 Testing Database Structure...\n');

    try {
        // This would require database connection
        console.log('📊 Database structure test would require:');
        console.log('- Checking if rewards table exists');
        console.log('- Checking if reward_redemptions table exists');
        console.log('- Verifying table schemas');
        console.log('- Testing foreign key relationships');
        
        console.log('\n💡 To test database structure, run:');
        console.log('node database/scripts/setup-rewards.js');
        
    } catch (error) {
        console.error('❌ Database structure test failed:', error.message);
    }
}

// Run tests
async function runAllTests() {
    console.log('🚀 Starting Rewards System Tests\n');
    console.log('='.repeat(50));
    
    await testDatabaseStructure();
    console.log('\n' + '='.repeat(50));
    await testRewardsSystem();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
}

// Run if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testRewardsSystem,
    testDatabaseStructure,
    runAllTests
};
