const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:9000/api';

class PaymentSystemTest {
    constructor() {
        this.adminToken = null;
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    // Test helper methods
    log(message) {
        console.log(`🧪 ${message}`);
    }

    async test(description, testFn) {
        this.testResults.total++;
        try {
            this.log(`Testing: ${description}`);
            await testFn();
            this.testResults.passed++;
            console.log(`   ✅ ${description} - PASSED`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push({ description, error: error.message });
            console.log(`   ❌ ${description} - FAILED: ${error.message}`);
        }
    }

    async makeRequest(method, url, data = null, headers = {}) {
        try {
            const config = {
                method,
                url: `${API_BASE}${url}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`${error.response.status}: ${error.response.data.message || error.response.statusText}`);
            } else {
                throw new Error(error.message);
            }
        }
    }

    // Test admin authentication
    async testAdminAuth() {
        await this.test('Admin Authentication', async () => {
            const response = await this.makeRequest('POST', '/auth/login', {
                username: 'admin',
                password: 'admin123'
            });

            if (!response.success) {
                throw new Error('Failed to login as admin');
            }

            this.adminToken = response.data.token;
            this.log(`   Admin token obtained: ${this.adminToken.substring(0, 20)}...`);
        });
    }

    // Test getting payment packages
    async testGetPackages() {
        await this.test('Get Payment Packages', async () => {
            const response = await this.makeRequest('GET', '/payments/packages');

            if (!response.success) {
                throw new Error('Failed to get payment packages');
            }

            if (!Array.isArray(response.data)) {
                throw new Error('Packages data is not an array');
            }

            this.log(`   Found ${response.data.length} payment packages`);
            
            // Test first package structure
            if (response.data.length > 0) {
                const pkg = response.data[0];
                const requiredFields = ['package_id', 'name', 'price_usd', 'rewards', 'category'];
                
                for (const field of requiredFields) {
                    if (!pkg[field]) {
                        throw new Error(`Package missing required field: ${field}`);
                    }
                }
                
                this.log(`   Sample package: ${pkg.package_id} - ${pkg.name} ($${pkg.price_usd})`);
            }
        });
    }

    // Test getting popular packages
    async testGetPopularPackages() {
        await this.test('Get Popular Packages', async () => {
            const response = await this.makeRequest('GET', '/payments/packages/popular');

            if (!response.success) {
                throw new Error('Failed to get popular packages');
            }

            const popularPackages = response.data.filter(pkg => pkg.is_popular);
            this.log(`   Found ${popularPackages.length} popular packages`);
        });
    }

    // Test getting packages by category
    async testGetPackagesByCategory() {
        await this.test('Get Packages by Category', async () => {
            const categories = ['starter', 'popular', 'premium', 'mega'];
            
            for (const category of categories) {
                const response = await this.makeRequest('GET', `/payments/packages/category/${category}`);
                
                if (!response.success) {
                    throw new Error(`Failed to get packages for category: ${category}`);
                }
                
                this.log(`   Category '${category}': ${response.data.length} packages`);
            }
        });
    }

    // Test package availability check
    async testPackageAvailability() {
        await this.test('Check Package Availability', async () => {
            const response = await this.makeRequest('GET', '/payments/packages/coins_100/availability?user_id=1');

            if (!response.success) {
                throw new Error('Failed to check package availability');
            }

            if (typeof response.data.available !== 'boolean') {
                throw new Error('Availability check response invalid');
            }

            this.log(`   Package 'coins_100' available for user 1: ${response.data.available}`);
        });
    }

    // Test payment initialization
    async testPaymentInitialization() {
        await this.test('Initialize Payment', async () => {
            const paymentData = {
                package_id: 'coins_100',
                user_id: 1,
                user_email: 'test@example.com',
                payment_method: 'credit_card',
                payment_provider: 'stripe',
                platform: 'web',
                country_code: 'US'
            };

            const response = await this.makeRequest('POST', '/payments/initialize', paymentData);

            if (!response.success) {
                throw new Error('Failed to initialize payment');
            }

            if (!response.data.transaction_id) {
                throw new Error('No transaction ID returned');
            }

            this.log(`   Payment initialized: ${response.data.transaction_id}`);
            this.testTransactionId = response.data.transaction_id;
        });
    }

    // Test payment completion
    async testPaymentCompletion() {
        if (!this.testTransactionId) {
            this.log('   Skipping payment completion test (no transaction ID)');
            return;
        }

        await this.test('Complete Payment', async () => {
            const response = await this.makeRequest('POST', `/payments/complete/${this.testTransactionId}`, {
                provider_transaction_id: 'test_stripe_' + Date.now()
            });

            if (!response.success) {
                throw new Error('Failed to complete payment');
            }

            this.log(`   Payment completed: ${this.testTransactionId}`);
        });
    }

    // Test transaction retrieval
    async testGetTransaction() {
        if (!this.testTransactionId) {
            this.log('   Skipping transaction retrieval test (no transaction ID)');
            return;
        }

        await this.test('Get Transaction Details', async () => {
            const response = await this.makeRequest('GET', `/payments/transactions/${this.testTransactionId}`);

            if (!response.success) {
                throw new Error('Failed to get transaction details');
            }

            const transaction = response.data;
            if (!transaction.transaction_id || !transaction.package_id) {
                throw new Error('Transaction details incomplete');
            }

            this.log(`   Transaction details: ${transaction.status} - $${transaction.amount}`);
        });
    }

    // Test user purchase history
    async testUserPurchaseHistory() {
        await this.test('Get User Purchase History', async () => {
            const response = await this.makeRequest('GET', '/payments/users/1/purchases');

            if (!response.success) {
                throw new Error('Failed to get user purchase history');
            }

            if (!response.data.transactions || !response.data.summary) {
                throw new Error('Purchase history response incomplete');
            }

            this.log(`   User 1 purchase history: ${response.data.transactions.length} transactions`);
            this.log(`   Total spent: $${response.data.summary.total_spent || 0}`);
        });
    }

    // Test admin package creation
    async testCreatePackage() {
        if (!this.adminToken) {
            this.log('   Skipping package creation test (no admin token)');
            return;
        }

        await this.test('Create Payment Package (Admin)', async () => {
            const packageData = {
                package_id: 'test_package_' + Date.now(),
                name: 'Test Package',
                description: 'A test package created during testing',
                category: 'starter',
                package_type: 'coins',
                price_usd: 1.99,
                currency: 'USD',
                rewards: {
                    coins: 2000,
                    gems: 20
                },
                bonus_percentage: 10,
                is_popular: false,
                is_active: true,
                sort_order: 999
            };

            const response = await this.makeRequest('POST', '/payments/admin/packages', packageData, {
                'Authorization': `Bearer ${this.adminToken}`
            });

            if (!response.success) {
                throw new Error('Failed to create payment package');
            }

            this.log(`   Package created: ${response.data.package_id}`);
            this.testPackageId = response.data.package_id;
        });
    }

    // Test admin analytics
    async testGetAnalytics() {
        if (!this.adminToken) {
            this.log('   Skipping analytics test (no admin token)');
            return;
        }

        await this.test('Get Payment Analytics (Admin)', async () => {
            const response = await this.makeRequest('GET', '/payments/admin/analytics', null, {
                'Authorization': `Bearer ${this.adminToken}`
            });

            if (!response.success) {
                throw new Error('Failed to get payment analytics');
            }

            if (!response.data.transaction_stats || !response.data.package_stats) {
                throw new Error('Analytics response incomplete');
            }

            this.log(`   Analytics: ${response.data.transaction_stats.total_transactions} total transactions`);
            this.log(`   Revenue: $${response.data.transaction_stats.total_revenue || 0}`);
        });
    }

    // Test admin transaction list
    async testGetAllTransactions() {
        if (!this.adminToken) {
            this.log('   Skipping transaction list test (no admin token)');
            return;
        }

        await this.test('Get All Transactions (Admin)', async () => {
            const response = await this.makeRequest('GET', '/payments/admin/transactions', null, {
                'Authorization': `Bearer ${this.adminToken}`
            });

            if (!response.success) {
                throw new Error('Failed to get all transactions');
            }

            if (!Array.isArray(response.data)) {
                throw new Error('Transactions data is not an array');
            }

            this.log(`   Found ${response.data.length} transactions`);
        });
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Payment System Tests\n');

        // Authentication
        await this.testAdminAuth();

        // Public API tests
        await this.testGetPackages();
        await this.testGetPopularPackages();
        await this.testGetPackagesByCategory();
        await this.testPackageAvailability();

        // Payment flow tests
        await this.testPaymentInitialization();
        await this.testPaymentCompletion();
        await this.testGetTransaction();
        await this.testUserPurchaseHistory();

        // Admin API tests
        await this.testCreatePackage();
        await this.testGetAnalytics();
        await this.testGetAllTransactions();

        // Print summary
        console.log('\n📊 Test Results Summary:');
        console.log(`   Total Tests: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed} ✅`);
        console.log(`   Failed: ${this.testResults.failed} ❌`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => {
                console.log(`   • ${error.description}: ${error.error}`);
            });
        }

        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(`\n🎯 Success Rate: ${successRate}%`);

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All payment system tests passed!');
        } else {
            console.log('\n⚠️  Some tests failed. Check the server logs for more details.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new PaymentSystemTest();
    tester.runAllTests()
        .then(() => {
            process.exit(tester.testResults.failed === 0 ? 0 : 1);
        })
        .catch((error) => {
            console.error('\n💥 Test runner crashed:', error.message);
            process.exit(1);
        });
}

module.exports = PaymentSystemTest;
