const axios = require('axios');

const API_BASE = 'http://localhost:3500/api';

// Test configuration
const TEST_CONFIG = {
    // Mock JWT token for testing (you'll need to generate a real one)
    mockToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcmlkIjoiMTIzIiwic2VydmVyaWQiOjEsImV4cCI6OTk5OTk5OTk5OX0.mock_signature',
    email: 'test@example.com',
    shipping_address: '123 Test Street, Test City, Test Country'
};

async function testRewardsWithToken() {
    console.log('🧪 Testing Rewards System with Token Authentication...\n');

    try {
        // Test 1: Get active rewards
        console.log('1️⃣ Testing: Get Active Rewards');
        const activeRewardsResponse = await axios.get(`${API_BASE}/rewards/active`);
        console.log('✅ Active rewards loaded:', activeRewardsResponse.data.data.length, 'rewards');
        
        if (activeRewardsResponse.data.data.length > 0) {
            const firstReward = activeRewardsResponse.data.data[0];
            console.log('   First reward:', firstReward.name, '- Cost:', firstReward.token_cost, 'tokens');
        }

        // Test 2: Test redemption with mock token (will fail due to invalid token)
        console.log('\n2️⃣ Testing: Redeem Reward with Mock Token');
        try {
            await axios.post(`${API_BASE}/rewards/redeem`, {
                reward_id: 1,
                shipping_address: TEST_CONFIG.shipping_address,
                email: TEST_CONFIG.email,
                token: TEST_CONFIG.mockToken
            });
            console.log('❌ Unexpected success - mock token should be invalid');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Mock token rejected as expected:', error.response.data.message);
            } else {
                console.log('⚠️  Different error:', error.response?.data?.message || error.message);
            }
        }

        // Test 3: Test user redemptions with mock token (will fail due to invalid token)
        console.log('\n3️⃣ Testing: Get User Redemptions with Mock Token');
        try {
            await axios.get(`${API_BASE}/rewards/redemptions/user?token=${encodeURIComponent(TEST_CONFIG.mockToken)}`);
            console.log('❌ Unexpected success - mock token should be invalid');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Mock token rejected as expected:', error.response.data.message);
            } else {
                console.log('⚠️  Different error:', error.response?.data?.message || error.message);
            }
        }

        // Test 4: Test redemption without token
        console.log('\n4️⃣ Testing: Redeem Reward without Token');
        try {
            await axios.post(`${API_BASE}/rewards/redeem`, {
                reward_id: 1,
                shipping_address: TEST_CONFIG.shipping_address,
                email: TEST_CONFIG.email
            });
            console.log('❌ Unexpected success - token should be required');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Token required as expected:', error.response.data.message);
            } else {
                console.log('⚠️  Different error:', error.response?.data?.message || error.message);
            }
        }

        // Test 5: Test user redemptions without token
        console.log('\n5️⃣ Testing: Get User Redemptions without Token');
        try {
            await axios.get(`${API_BASE}/rewards/redemptions/user`);
            console.log('❌ Unexpected success - token should be required');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Token required as expected:', error.response.data.message);
            } else {
                console.log('⚠️  Different error:', error.response?.data?.message || error.message);
            }
        }

        console.log('\n🎉 Token-based rewards system tests completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Generate a real JWT token from your game system');
        console.log('2. Test with real token to verify full functionality');
        console.log('3. Use the test interface at: http://localhost:3500/test-rewards.html');
        console.log('\n💡 To generate a real token, you need to:');
        console.log('- Login to your game system');
        console.log('- Get the JWT token from the game client');
        console.log('- Use that token in the test interface');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Test with real token (if provided)
async function testWithRealToken(realToken) {
    console.log('🔑 Testing with Real Token...\n');
    
    try {
        // Test redemption with real token
        console.log('1️⃣ Testing: Redeem Reward with Real Token');
        const redeemResponse = await axios.post(`${API_BASE}/rewards/redeem`, {
            reward_id: 1,
            shipping_address: TEST_CONFIG.shipping_address,
            email: TEST_CONFIG.email,
            token: realToken
        });
        
        if (redeemResponse.data.success) {
            console.log('✅ Redemption successful:', redeemResponse.data.data);
        } else {
            console.log('⚠️  Redemption failed:', redeemResponse.data.message);
        }

        // Test user redemptions with real token
        console.log('\n2️⃣ Testing: Get User Redemptions with Real Token');
        const historyResponse = await axios.get(`${API_BASE}/rewards/redemptions/user?token=${encodeURIComponent(realToken)}`);
        
        if (historyResponse.data.success) {
            console.log('✅ History loaded:', historyResponse.data.data.length, 'redemptions');
        } else {
            console.log('⚠️  History failed:', historyResponse.data.message);
        }

    } catch (error) {
        console.error('❌ Real token test failed:', error.response?.data || error.message);
    }
}

// Run tests
async function runAllTests() {
    console.log('🚀 Starting Rewards System Token Tests\n');
    console.log('='.repeat(50));
    
    await testRewardsWithToken();
    
    // Check if real token is provided as command line argument
    const realToken = process.argv[2];
    if (realToken) {
        console.log('\n' + '='.repeat(50));
        await testWithRealToken(realToken);
    } else {
        console.log('\n💡 To test with a real token, run:');
        console.log('node tests/test-rewards-token.js <your_jwt_token>');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
}

// Run if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testRewardsWithToken,
    testWithRealToken,
    runAllTests
};
