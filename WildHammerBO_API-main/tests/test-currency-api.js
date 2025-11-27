const axios = require('axios');

const BASE_URL = 'http://localhost:9000';
let authToken = null;

// Test login and get token
async function testLogin() {
    try {
        console.log('🔐 Testing admin login...');
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        if (response.data.success) {
            authToken = response.data.token;
            console.log('✅ Login successful!');
            console.log('👤 Admin:', response.data.admin.email);
            console.log('🔑 Token obtained');
            return true;
        } else {
            console.log('❌ Login failed:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Login error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test currency statistics
async function testCurrencyStatistics() {
    try {
        console.log('\n📊 Testing currency statistics...');
        const response = await axios.get(`${BASE_URL}/api/users/currency/statistics`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log('✅ Currency statistics retrieved!');
            console.log('👥 Total users:', response.data.data.summary.total_users);
            console.log('💰 Total coins:', response.data.data.summary.total_coins_in_circulation);
            console.log('💎 Total gems:', response.data.data.summary.total_gems_in_circulation);
            return true;
        } else {
            console.log('❌ Failed to get statistics:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Statistics error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test user search
async function testUserSearch() {
    try {
        console.log('\n🔍 Testing user search...');
        const response = await axios.get(`${BASE_URL}/api/users/search?q=admin&limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log('✅ User search successful!');
            console.log('👥 Found users:', response.data.data.users.length);
            if (response.data.data.users.length > 0) {
                const user = response.data.data.users[0];
                console.log('👤 First user:', user.username || user.email);
                console.log('💰 Coins:', user.currency?.coins || 0);
                console.log('💎 Gems:', user.currency?.gems || 0);
                return user.id; // Return user ID for further testing
            }
            return null;
        } else {
            console.log('❌ Search failed:', response.data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Search error:', error.response?.data?.message || error.message);
        return null;
    }
}

// Test get user currency
async function testGetUserCurrency(userId) {
    try {
        console.log(`\n💱 Testing get user currency for user ${userId}...`);
        const response = await axios.get(`${BASE_URL}/api/users/${userId}/currency`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log('✅ User currency retrieved!');
            console.log('👤 User:', response.data.data.username);
            console.log('💰 Coins:', response.data.data.currency.coins);
            console.log('💎 Gems:', response.data.data.currency.gems);
            return response.data.data.currency;
        } else {
            console.log('❌ Failed to get user currency:', response.data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Get currency error:', error.response?.data?.message || error.message);
        return null;
    }
}

// Test update user currency
async function testUpdateUserCurrency(userId) {
    try {
        console.log(`\n💸 Testing currency update for user ${userId}...`);
        const response = await axios.patch(`${BASE_URL}/api/users/${userId}/currency`, {
            action: 'add',
            amount: 100,
            currency_type: 'coins',
            reason: 'API Test - Adding 100 coins'
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log('✅ Currency updated successfully!');
            console.log('💰 Old value:', response.data.data.old_value);
            console.log('💰 New value:', response.data.data.new_value);
            console.log('📝 Reason:', response.data.data.reason);
            console.log('👤 Updated by:', response.data.data.updated_by);
            return true;
        } else {
            console.log('❌ Failed to update currency:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Update currency error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test currency history
async function testCurrencyHistory(userId) {
    try {
        console.log(`\n📜 Testing currency history for user ${userId}...`);
        const response = await axios.get(`${BASE_URL}/api/users/${userId}/currency/history?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log('✅ Currency history retrieved!');
            console.log('📝 History entries:', response.data.data.history.length);
            if (response.data.data.history.length > 0) {
                const latest = response.data.data.history[0];
                console.log('📅 Latest entry:');
                console.log('  💱 Type:', latest.currency_type);
                console.log('  🔄 Action:', latest.action);
                console.log('  💰 Amount:', latest.amount);
                console.log('  📝 Reason:', latest.reason);
            }
            return true;
        } else {
            console.log('❌ Failed to get currency history:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ History error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Starting Currency API Tests...\n');
    
    // Test login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        console.log('\n❌ Cannot proceed without authentication token');
        return;
    }
    
    // Test statistics
    await testCurrencyStatistics();
    
    // Test user search and get a user ID
    const userId = await testUserSearch();
    
    if (userId) {
        // Test get user currency
        await testGetUserCurrency(userId);
        
        // Test update currency
        await testUpdateUserCurrency(userId);
        
        // Test currency history
        await testCurrencyHistory(userId);
    } else {
        console.log('\n⚠️ No users found for currency testing');
    }
    
    console.log('\n🎉 Currency API Tests Completed!');
}

// Run the tests
runAllTests().catch(console.error);
