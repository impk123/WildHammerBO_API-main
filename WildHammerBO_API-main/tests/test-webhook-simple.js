const axios = require('axios');

// Test configuration
const serverUrl = 'http://localhost:9000';
const testUserId = 'test_user_123';

async function runWebhookTest() {
    console.log('🚀 Starting Webhook Integration Test');
    console.log('=' .repeat(50));

    try {
        // First test server connectivity
        console.log('🔍 Testing server connectivity...');
        const healthCheck = await axios.get(`${serverUrl}/health`);
        console.log('✅ Server is running:', healthCheck.data);

        // Step 1: Check available packages (public endpoint)
        console.log('\n📦 Step 1: Checking available payment packages...');
        const packagesResponse = await axios.get(`${serverUrl}/api/payments/packages`);
        console.log('✅ Available packages:', packagesResponse.data.packages?.length || 0);
        
        // For testing, we'll simulate a transaction ID instead of creating a real one
        // In a real scenario, this would come from initializing a payment
        const testTransactionId = 'test_txn_' + Date.now();
        console.log('✅ Using test transaction ID:', testTransactionId);

        // Step 2: Simulate successful payment webhook
        console.log('\n🔔 Step 2: Simulating successful payment webhook...');
        const mockEvent = {
            id: 'evt_test_webhook',
            object: 'event',
            api_version: '2020-08-27',
            created: Math.floor(Date.now() / 1000),
            data: {
                object: {
                    id: 'pi_test_123',
                    object: 'payment_intent',
                    amount: 999, // $9.99 in cents
                    currency: 'usd',
                    status: 'succeeded',
                    metadata: {
                        transaction_id: testTransactionId,
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

        const webhookResponse = await axios.post(`${serverUrl}/api/payments/webhook/stripe`, mockEvent, {
            headers: {
                'Content-Type': 'application/json',
                'X-Test-Mode': 'true' // Flag to skip signature validation
            }
        });

        console.log('✅ Webhook processed:', webhookResponse.data);

        // Step 3: Test webhook response and integration
        console.log('\n📊 Step 3: Analyzing webhook processing...');
        
        // Since we're using a mock transaction ID, we'll check the webhook response
        if (webhookResponse.data.success) {
            console.log('✅ Webhook endpoint is working correctly');
        } else {
            console.log('❌ Webhook processing had issues:', webhookResponse.data);
        }

        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('🎉 Webhook Test Summary:');
        console.log(`📦 Available Packages: ${packagesResponse.data.packages?.length || 0}`);
        console.log(`💳 Test Transaction ID: ${testTransactionId}`);
        console.log(`🔔 Webhook Status: ${webhookResponse.data.success ? 'Success' : 'Failed'}`);
        console.log(`💰 Response: ${JSON.stringify(webhookResponse.data)}`);
        
        if (webhookResponse.data.success) {
            console.log('✅ Test PASSED - Webhook system is working correctly!');
        } else {
            console.log('❌ Test FAILED - Webhook had issues');
        }

    } catch (error) {
        console.error('❌ Test failed with error:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
runWebhookTest().catch(console.error);
