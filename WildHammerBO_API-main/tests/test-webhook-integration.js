const axios = require('axios');

// Test configuration
const serverUrl = 'http://localhost:9000';
const testUserId = 'test_user_123';

// Helper function to create test payment package
async function createTestPackage() {
    try {
        const packageData = {
            name: 'Test Gold Package',
            description: 'Test package for webhook testing',
            price: 9.99,
            currency: 'USD',
            rewards: {
                currency: 1000,
                gems: 50
            },
            is_active: true
        };

        const response = await axios.post(`${serverUrl}/api/payments/packages`, packageData);
        console.log('✅ Test package created:', response.data.package_id);
        return response.data.package_id;
    } catch (error) {
        console.error('❌ Failed to create test package:', error.response?.data || error.message);
        return null;
    }
}

// Helper function to initialize payment
async function initializeTestPayment(packageId) {
    try {
        const paymentData = {
            package_id: packageId,
            user_id: testUserId,
            provider: 'stripe',
            payment_method: 'card'
        };

        const response = await axios.post(`${serverUrl}/api/payments/initialize`, paymentData);
        console.log('✅ Payment initialized:', response.data.transaction_id);
        return response.data;
    } catch (error) {
        console.error('❌ Failed to initialize payment:', error.response?.data || error.message);
        return null;
    }
}

// Mock webhook event (without Stripe signature for testing)
async function testWebhookWithoutStripe(transactionId, paymentIntentId = 'pi_test_123') {
    try {
        // Mock payment_intent.succeeded event
        const mockEvent = {
            id: 'evt_test_webhook',
            object: 'event',
            api_version: '2020-08-27',
            created: Math.floor(Date.now() / 1000),
            data: {
                object: {
                    id: paymentIntentId,
                    object: 'payment_intent',
                    amount: 999, // $9.99 in cents
                    currency: 'usd',
                    status: 'succeeded',
                    metadata: {
                        transaction_id: transactionId,
                        user_id: testUserId
                    }
                }
            },
            livemode: false,
            pending_webhooks: 1,
            request: {
                id: 'req_test',
                idempotency_key: null
            },
            type: 'payment_intent.succeeded'
        };

        console.log('🔄 Sending mock webhook event...');
        const response = await axios.post(`${serverUrl}/api/payments/webhook/stripe`, mockEvent, {
            headers: {
                'Content-Type': 'application/json',
                'X-Test-Mode': 'true' // Flag to skip signature validation
            }
        });

        console.log('✅ Webhook processed successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Webhook processing failed:', error.response?.data || error.message);
        return null;
    }
}

// Check transaction status
async function checkTransactionStatus(transactionId) {
    try {
        const response = await axios.get(`${serverUrl}/api/payments/transactions/${transactionId}`);
        console.log('📊 Transaction status:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Failed to check transaction status:', error.response?.data || error.message);
        return null;
    }
}

// Main test function
async function runWebhookTest() {
    console.log('🚀 Starting Stripe Webhook Test (without real Stripe)');
    console.log('=' .repeat(50));

    // Step 1: Create test package
    console.log('\n📦 Step 1: Creating test payment package...');
    const packageId = await createTestPackage();
    if (!packageId) return;

    // Step 2: Initialize payment
    console.log('\n💳 Step 2: Initializing test payment...');
    const payment = await initializeTestPayment(packageId);
    if (!payment) return;

    // Step 3: Simulate webhook
    console.log('\n🔔 Step 3: Simulating successful payment webhook...');
    const webhookResult = await testWebhookWithoutStripe(payment.transaction_id);
    if (!webhookResult) return;

    // Step 4: Check final status
    console.log('\n📊 Step 4: Checking final transaction status...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a moment
    const finalStatus = await checkTransactionStatus(payment.transaction_id);

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Webhook Test Summary:');
    console.log(`📦 Package ID: ${packageId}`);
    console.log(`💳 Transaction ID: ${payment.transaction_id}`);
    console.log(`🔔 Webhook Status: ${webhookResult ? 'Success' : 'Failed'}`);
    console.log(`💰 Final Status: ${finalStatus?.status || 'Unknown'}`);
    
    if (finalStatus?.status === 'completed') {
        console.log('✅ Test PASSED - Payment was processed successfully!');
    } else {
        console.log('❌ Test FAILED - Payment was not completed properly');
    }
}

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});

// Run the test
runWebhookTest().catch(console.error);
