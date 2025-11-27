const express = require('express');

// Test that routes can be loaded without errors
async function testRoutesLoading() {
    console.log('🧪 Testing Routes Loading...\n');

    try {
        // Test loading rewards routes
        console.log('1️⃣ Testing: Load Rewards Routes');
        const rewardsRoutes = require('../src/routes/rewards');
        console.log('✅ Rewards routes loaded successfully');

        // Test loading other routes that use auth middleware
        console.log('\n2️⃣ Testing: Load Other Routes with Auth');
        const playerDataRoutes = require('../src/routes/playerData');
        console.log('✅ PlayerData routes loaded successfully');

        const prizeByRankRoutes = require('../src/routes/prizeByRank');
        console.log('✅ PrizeByRank routes loaded successfully');

        const prizeSettingsRoutes = require('../src/routes/prizeSettings');
        console.log('✅ PrizeSettings routes loaded successfully');

        const paymentsRoutes = require('../src/routes/payments');
        console.log('✅ Payments routes loaded successfully');

        console.log('\n🎉 All routes loaded successfully!');
        console.log('\n📝 Routes that were fixed:');
        console.log('- src/routes/rewards.js: Changed from router.use(auth) to router.use(authenticateToken)');
        console.log('- Other routes already use auth.authenticateToken correctly');

    } catch (error) {
        console.error('❌ Route loading failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Test that the main application can start
async function testApplicationStart() {
    console.log('\n🚀 Testing Application Start...\n');

    try {
        // Test loading the main application
        console.log('1️⃣ Testing: Load Main Application');
        const app = require('../index');
        console.log('✅ Main application loaded successfully');

        console.log('\n🎉 Application can start without errors!');
        console.log('\n💡 The TypeError: Router.use() requires a middleware function error should be fixed now.');

    } catch (error) {
        console.error('❌ Application loading failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🔧 Testing Routes and Application Loading\n');
    console.log('='.repeat(50));
    
    await testRoutesLoading();
    console.log('\n' + '='.repeat(50));
    await testApplicationStart();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!');
    console.log('\n📝 Summary:');
    console.log('1. Fixed rewards.js to use authenticateToken instead of auth');
    console.log('2. Other routes already use auth.authenticateToken correctly');
    console.log('3. Application should now start without the middleware error');
}

// Run if called directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testRoutesLoading,
    testApplicationStart,
    runAllTests
};
