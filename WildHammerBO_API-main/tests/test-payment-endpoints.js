const fetch = require('node-fetch');

const API_BASE = 'http://localhost:9000/api';

async function testPaymentEndpoints() {
    console.log('🚀 Testing Payment System Endpoints\n');
    
    let passedTests = 0;
    let totalTests = 0;
    const results = [];

    async function runTest(name, testFn) {
        totalTests++;
        try {
            console.log(`🧪 Testing: ${name}`);
            const result = await testFn();
            if (result.success) {
                console.log(`   ✅ ${name} - PASSED`);
                passedTests++;
                results.push({ name, status: 'PASSED', result });
            } else {
                console.log(`   ❌ ${name} - FAILED: ${result.message}`);
                results.push({ name, status: 'FAILED', error: result.message });
            }
        } catch (error) {
            console.log(`   ❌ ${name} - ERROR: ${error.message}`);
            results.push({ name, status: 'ERROR', error: error.message });
        }
        console.log('');
    }

    // Test 1: Get all payment packages
    await runTest('Get Payment Packages', async () => {
        const response = await fetch(`${API_BASE}/payments/packages`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        if (!Array.isArray(data.data) || data.data.length === 0) {
            return { success: false, message: 'No packages returned' };
        }
        
        console.log(`   📦 Found ${data.data.length} packages`);
        return { success: true, data: data.data };
    });

    // Test 2: Get popular packages
    await runTest('Get Popular Packages', async () => {
        const response = await fetch(`${API_BASE}/payments/packages/popular`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        console.log(`   🌟 Found ${data.data.length} popular packages`);
        return { success: true, data: data.data };
    });

    // Test 3: Get packages by category
    await runTest('Get Packages by Category', async () => {
        const response = await fetch(`${API_BASE}/payments/packages?category=starter`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        console.log(`   📂 Found ${data.data.length} starter packages`);
        return { success: true, data: data.data };
    });

    // Test 4: Initialize payment
    await runTest('Initialize Payment', async () => {
        const paymentData = {
            package_id: 'coins_100',
            user_id: 1,
            user_email: 'test@example.com',
            payment_method: 'credit_card',
            payment_provider: 'stripe',
            platform: 'web',
            country_code: 'US'
        };

        const response = await fetch(`${API_BASE}/payments/initialize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        console.log(`   💳 Payment initialized: ${data.data.transaction_id}`);
        return { success: true, transactionId: data.data.transaction_id };
    });

    // Test 5: Get user purchase history
    await runTest('Get User Purchase History', async () => {
        const response = await fetch(`${API_BASE}/payments/users/1/purchases`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        console.log(`   📋 Found ${data.data.transactions.length} transaction(s)`);
        console.log(`   💰 Total spent: $${data.data.summary.total_spent || 0}`);
        return { success: true, data: data.data };
    });

    // Test 6: Check package availability
    await runTest('Check Package Availability', async () => {
        const response = await fetch(`${API_BASE}/payments/packages/coins_100/availability?user_id=1`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        console.log(`   ✅ Package available: ${data.data.available}`);
        return { success: true, data: data.data };
    });

    // Test 7: Get specific package
    await runTest('Get Specific Package', async () => {
        const response = await fetch(`${API_BASE}/payments/packages/coins_1000`);
        const data = await response.json();
        
        if (!response.ok) {
            return { success: false, message: `HTTP ${response.status}: ${data.message}` };
        }
        
        if (!data.success) {
            return { success: false, message: data.message };
        }
        
        console.log(`   📦 Package: ${data.data.name} - $${data.data.price_usd}`);
        return { success: true, data: data.data };
    });

    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${totalTests - passedTests} ❌`);
    console.log(`   Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! Payment system is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the results above.');
        console.log('\n❌ Failed Tests:');
        results.filter(r => r.status !== 'PASSED').forEach(r => {
            console.log(`   • ${r.name}: ${r.error}`);
        });
    }
    
    return passedTests === totalTests;
}

// Start testing
if (require.main === module) {
    testPaymentEndpoints()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Test runner failed:', error.message);
            process.exit(1);
        });
}

module.exports = testPaymentEndpoints;
