const axios = require('axios');
const crypto = require('crypto');

const API_BASE = 'http://localhost:9000/api';

// Mock Stripe webhook events
const mockStripeEvents = {
    paymentIntentSucceeded: {
        id: 'evt_test_webhook',
        object: 'event',
        api_version: '2020-08-27',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: 'pi_test_payment_intent',
                object: 'payment_intent',
                amount: 999, // $9.99 in cents
                currency: 'usd',
                status: 'succeeded',
                metadata: {
                    transaction_id: 'txn_test_' + Date.now(),
                    package_id: 'coins_1000',
                    user_email: 'test@example.com'
                }
            }
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
            id: 'req_test_request',
            idempotency_key: null
        },
        type: 'payment_intent.succeeded'
    },

    paymentIntentFailed: {
        id: 'evt_test_webhook_failed',
        object: 'event',
        api_version: '2020-08-27',
        created: Math.floor(Date.now() / 1000),
        data: {
            object: {
                id: 'pi_test_payment_intent_failed',
                object: 'payment_intent',
                amount: 999,
                currency: 'usd',
                status: 'requires_payment_method',
                last_payment_error: {
                    message: 'Your card was declined.'
                },
                metadata: {
                    transaction_id: 'txn_test_failed_' + Date.now(),
                    package_id: 'coins_1000',
                    user_email: 'test@example.com'
                }
            }
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
            id: 'req_test_request_failed',
            idempotency_key: null
        },
        type: 'payment_intent.payment_failed'
    }
};

// Generate mock Stripe signature
function generateStripeSignature(payload, secret = 'whsec_test_secret') {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;
    
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload, 'utf8')
        .digest('hex');
    
    return `t=${timestamp},v1=${signature}`;
}

async function testStripeWebhooks() {
    console.log('🚀 Testing Stripe Webhook Integration\n');
    
    let passedTests = 0;
    let totalTests = 0;

    async function runTest(name, testFn) {
        totalTests++;
        try {
            console.log(`🧪 Testing: ${name}`);
            const result = await testFn();
            if (result.success) {
                console.log(`   ✅ ${name} - PASSED`);
                if (result.data) {
                    console.log(`   📋 Result:`, JSON.stringify(result.data, null, 2));
                }
                passedTests++;
            } else {
                console.log(`   ❌ ${name} - FAILED: ${result.message}`);
            }
        } catch (error) {
            console.log(`   ❌ ${name} - ERROR: ${error.message}`);
        }
        console.log('');
    }

    // Test 1: Create a test transaction first
    let testTransactionId = null;
    await runTest('Create Test Transaction', async () => {
        const paymentData = {
            package_id: 'coins_1000',
            user_id: 1,
            user_email: 'test@example.com',
            payment_method: 'credit_card',
            payment_provider: 'stripe',
            platform: 'web',
            country_code: 'US'
        };

        const response = await axios.post(`${API_BASE}/payments/initialize`, paymentData, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data.success) {
            testTransactionId = response.data.data.transaction.transaction_id;
            
            // Update the mock event with the real transaction ID
            mockStripeEvents.paymentIntentSucceeded.data.object.metadata.transaction_id = testTransactionId;
            mockStripeEvents.paymentIntentFailed.data.object.metadata.transaction_id = testTransactionId;
            
            return {
                success: true,
                data: { transaction_id: testTransactionId }
            };
        }
        
        return { success: false, message: response.data.message };
    });

    // Test 2: Test successful payment webhook
    await runTest('Stripe Payment Success Webhook', async () => {
        const payload = JSON.stringify(mockStripeEvents.paymentIntentSucceeded);
        const signature = generateStripeSignature(mockStripeEvents.paymentIntentSucceeded);
        
        const response = await axios.post(`${API_BASE}/payments/webhook/stripe`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Stripe-Signature': signature
            }
        });

        return response.data;
    });

    // Test 3: Test failed payment webhook
    await runTest('Stripe Payment Failed Webhook', async () => {
        // Create another test transaction for failure test
        const paymentData = {
            package_id: 'coins_500',
            user_id: 2,
            user_email: 'test2@example.com',
            payment_method: 'credit_card',
            payment_provider: 'stripe',
            platform: 'web',
            country_code: 'US'
        };

        const initResponse = await axios.post(`${API_BASE}/payments/initialize`, paymentData);
        const failedTransactionId = initResponse.data.data.transaction.transaction_id;
        
        mockStripeEvents.paymentIntentFailed.data.object.metadata.transaction_id = failedTransactionId;
        
        const payload = JSON.stringify(mockStripeEvents.paymentIntentFailed);
        const signature = generateStripeSignature(mockStripeEvents.paymentIntentFailed);
        
        const response = await axios.post(`${API_BASE}/payments/webhook/stripe`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Stripe-Signature': signature
            }
        });

        return response.data;
    });

    // Test 4: Test invalid signature
    await runTest('Invalid Webhook Signature', async () => {
        const payload = JSON.stringify(mockStripeEvents.paymentIntentSucceeded);
        const invalidSignature = 'invalid_signature';
        
        try {
            const response = await axios.post(`${API_BASE}/payments/webhook/stripe`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Stripe-Signature': invalidSignature
                }
            });
            
            // Should not reach here if security is working
            return { success: false, message: 'Invalid signature was accepted' };
        } catch (error) {
            // Expecting 401 error for invalid signature
            if (error.response && error.response.status === 401) {
                return { success: true, data: { message: 'Invalid signature correctly rejected' } };
            }
            return { success: false, message: `Unexpected error: ${error.message}` };
        }
    });

    // Test 5: Test webhook with missing transaction
    await runTest('Webhook with Missing Transaction', async () => {
        const eventWithMissingTx = {
            ...mockStripeEvents.paymentIntentSucceeded,
            data: {
                object: {
                    ...mockStripeEvents.paymentIntentSucceeded.data.object,
                    metadata: {
                        transaction_id: 'non_existent_transaction',
                        package_id: 'coins_1000',
                        user_email: 'test@example.com'
                    }
                }
            }
        };
        
        const payload = JSON.stringify(eventWithMissingTx);
        const signature = generateStripeSignature(eventWithMissingTx);
        
        try {
            const response = await axios.post(`${API_BASE}/payments/webhook/stripe`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Stripe-Signature': signature
                }
            });
            
            // Should handle gracefully
            return response.data;
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message };
        }
    });

    // Test 6: Check transaction status after webhook
    if (testTransactionId) {
        await runTest('Verify Transaction Status', async () => {
            const response = await axios.get(`${API_BASE}/payments/transactions/${testTransactionId}`);
            
            if (response.data.success) {
                const transaction = response.data.data;
                const expectedStatus = 'completed';
                const expectedRewardsDelivered = 1;
                
                if (transaction.status === expectedStatus && transaction.rewards_delivered === expectedRewardsDelivered) {
                    return {
                        success: true,
                        data: {
                            status: transaction.status,
                            rewards_delivered: transaction.rewards_delivered,
                            processed_at: transaction.processed_at
                        }
                    };
                } else {
                    return {
                        success: false,
                        message: `Status: ${transaction.status}, Rewards: ${transaction.rewards_delivered}`
                    };
                }
            }
            
            return { success: false, message: response.data.message };
        });
    }

    // Summary
    console.log('\n📊 Stripe Webhook Test Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${totalTests - passedTests} ❌`);
    console.log(`   Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All Stripe webhook tests passed! The integration is working correctly.');
        console.log('\n🔧 Setup Instructions:');
        console.log('1. Add your Stripe keys to .env file:');
        console.log('   STRIPE_SECRET_KEY=sk_test_...');
        console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
        console.log('');
        console.log('2. Configure Stripe webhook endpoint:');
        console.log(`   URL: ${API_BASE}/payments/webhook/stripe`);
        console.log('   Events: payment_intent.succeeded, payment_intent.payment_failed');
    } else {
        console.log('\n⚠️  Some webhook tests failed. Check the server logs for details.');
    }
    
    return passedTests === totalTests;
}

// Start testing
if (require.main === module) {
    testStripeWebhooks()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Webhook test runner failed:', error.message);
            process.exit(1);
        });
}

module.exports = testStripeWebhooks;
