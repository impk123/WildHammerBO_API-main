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

// Test Game Rankings API
async function testGameRankings() {
    try {
        console.log('\n🏆 Testing Game Rankings API...');
        
        // Test Arena Rankings
        console.log('🥊 Testing Arena Rankings...');
        const arenaResponse = await axios.get(`${BASE_URL}/api/game-rank/arena?page=1&limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Arena Rankings retrieved!');
        console.log('📊 Total arena players:', arenaResponse.data.pagination?.total || 'N/A');
        if (arenaResponse.data.data && arenaResponse.data.data.length > 0) {
            const topPlayer = arenaResponse.data.data[0];
            console.log('🥇 Top arena player:', topPlayer.username, 'Score:', topPlayer.arena_score);
        }
        
        // Test Level Rankings
        console.log('\n⭐ Testing Level Rankings...');
        const levelResponse = await axios.get(`${BASE_URL}/api/game-rank/level?page=1&limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Level Rankings retrieved!');
        console.log('📊 Total level players:', levelResponse.data.pagination?.total || 'N/A');
        if (levelResponse.data.data && levelResponse.data.data.length > 0) {
            const topPlayer = levelResponse.data.data[0];
            console.log('🥇 Top level player:', topPlayer.username, 'Level:', topPlayer.level);
        }
        
        return true;
    } catch (error) {
        console.log('❌ Game Rankings error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test Game Servers API
async function testGameServers() {
    try {
        console.log('\n🖥️ Testing Game Servers API...');
        const response = await axios.get(`${BASE_URL}/api/game-servers?page=1&limit=10`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Game Servers retrieved!');
        console.log('🖥️ Total servers:', response.data.pagination?.total || 'N/A');
        if (response.data.data && response.data.data.length > 0) {
            console.log('📡 First server:', response.data.data[0].server_name || 'N/A');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Game Servers error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test Backend Users API
async function testBackendUsers() {
    try {
        console.log('\n👥 Testing Backend Users API...');
        const response = await axios.get(`${BASE_URL}/api/backend-users?page=1&limit=10`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Backend Users retrieved!');
        console.log('👤 Total backend users:', response.data.pagination?.total || 'N/A');
        if (response.data.data && response.data.data.length > 0) {
            console.log('🔧 First admin:', response.data.data[0].username || 'N/A');
        }
        
        return true;
    } catch (error) {
        console.log('❌ Backend Users error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Test Database Connections
async function testDatabaseConnections() {
    try {
        console.log('\n🗄️ Testing Database Connections...');
        
        // Test through system status which should include DB health
        const response = await axios.get(`${BASE_URL}/api/system/status`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ System status retrieved!');
        console.log('💾 Database status:', response.data.services?.database || 'Unknown');
        
        return true;
    } catch (error) {
        console.log('❌ Database connections error:', error.response?.data?.message || error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🧪 Starting New API Endpoints Tests...\n');
    console.log('Testing endpoints: game-rank, game-servers, backend-users, db connections\n');
    
    // Test login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        console.log('\n❌ Cannot proceed without authentication token');
        return;
    }
    
    // Test all new endpoints
    const results = {
        gameRankings: await testGameRankings(),
        gameServers: await testGameServers(),
        backendUsers: await testBackendUsers(),
        databaseConnections: await testDatabaseConnections()
    };
    
    // Summary
    console.log('\n📋 Test Results Summary:');
    console.log('🏆 Game Rankings API:', results.gameRankings ? '✅ PASS' : '❌ FAIL');
    console.log('🖥️ Game Servers API:', results.gameServers ? '✅ PASS' : '❌ FAIL');
    console.log('👥 Backend Users API:', results.backendUsers ? '✅ PASS' : '❌ FAIL');
    console.log('🗄️ Database Connections:', results.databaseConnections ? '✅ PASS' : '❌ FAIL');
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All new API endpoints are working correctly!');
    } else {
        console.log('⚠️ Some endpoints need attention. Check server logs for details.');
    }
}

// Run the tests
runAllTests().catch(console.error);
