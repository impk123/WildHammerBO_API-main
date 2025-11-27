const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
const PaymentTransaction = require('../models/paymentTransaction');
const PaymentPackage = require('../models/paymentPackage');
const PaymentService = require('./paymentService');

class StripeService {
    constructor() {
        this.endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
        this.isConfigured = !!stripeSecretKey;
        
        if (!this.isConfigured) {
            //console.warn('⚠️ Stripe not configured - add STRIPE_SECRET_KEY to enable Stripe integration');
        }
    }

    // Check if Stripe is properly configured
    checkConfiguration() {
        if (!this.isConfigured) {
            throw new Error('Stripe not configured. Please add STRIPE_SECRET_KEY to your environment variables.');
        }
        if (!stripe) {
            throw new Error('Stripe SDK not initialized');
        }
    }

    // Create Payment Intent for Stripe
    async createPaymentIntent(transactionData) {
        try {
            this.checkConfiguration();
            
            const { transaction_id, amount, currency, user_email, package_id } = transactionData;
            
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    transaction_id,
                    package_id,
                    user_email
                },
                receipt_email: user_email
            });

            return {
                client_secret: paymentIntent.client_secret,
                payment_intent_id: paymentIntent.id
            };
        } catch (error) {
            console.error('Error creating Stripe Payment Intent:', error);
            throw new Error(`Stripe payment creation failed: ${error.message}`);
        }
    }

    // Validate Stripe webhook signature
    validateWebhookSignature(payload, signature) {
        try {
            this.checkConfiguration();
            
            if (!this.endpointSecret) {
                console.warn('Stripe webhook secret not configured, skipping validation');
                return true; // Allow in development
            }

            const event = stripe.webhooks.constructEvent(payload, signature, this.endpointSecret);
            return event;
        } catch (error) {
            console.error('Stripe webhook signature validation failed:', error.message);
            return false;
        }
    }

    // Process Stripe webhook events
    async processWebhookEvent(event) {
        try {
            console.log(`📥 Processing Stripe webhook: ${event.type}`);
            
            switch (event.type) {
                case 'payment_intent.succeeded':
                    return await this.handlePaymentSuccess(event.data.object);
                
                case 'payment_intent.payment_failed':
                    return await this.handlePaymentFailed(event.data.object);
                
                case 'payment_intent.canceled':
                    return await this.handlePaymentCanceled(event.data.object);
                
                case 'charge.dispute.created':
                    return await this.handleChargeback(event.data.object);
                
                case 'invoice.payment_succeeded':
                    return await this.handleSubscriptionPayment(event.data.object);
                
                default:
                    console.log(`🔍 Unhandled Stripe event type: ${event.type}`);
                    return { success: true, message: 'Event acknowledged' };
            }
        } catch (error) {
            console.error('Error processing Stripe webhook event:', error);
            throw error;
        }
    }

    // Handle successful payment
    async handlePaymentSuccess(paymentIntent) {
        try {
            const transactionId = paymentIntent.metadata?.transaction_id;
            
            if (!transactionId) {
                console.error('No transaction_id found in payment intent metadata');
                return { success: false, message: 'Transaction ID missing' };
            }

            console.log(`💰 Payment succeeded for transaction: ${transactionId}`);
            
            // Get transaction details
            const transaction = await PaymentTransaction.getById(transactionId);
            if (!transaction) {
                throw new Error(`Transaction not found: ${transactionId}`);
            }

            // Update transaction status
            await PaymentTransaction.updateStatus(transactionId, 'completed', {
                provider_transaction_id: paymentIntent.id,
                processed_at: new Date()
            });

            // Get package details for rewards
            const packageData = await PaymentPackage.getById(transaction.package_id);
            if (!packageData) {
                throw new Error(`Package not found: ${transaction.package_id}`);
            }

            // Award currency and rewards
            const rewardResult = await this.awardCurrency(transaction, packageData);
            
            // Mark rewards as delivered
            await PaymentTransaction.updateStatus(transactionId, 'completed', {
                rewards_delivered: 1,
                delivered_at: new Date()
            });

            // Log the completion
            console.log(`✅ Payment completed and rewards delivered for transaction: ${transactionId}`);
            
            // Send notification to game service
            await this.notifyGameService(transaction, packageData, rewardResult);

            return {
                success: true,
                transaction_id: transactionId,
                rewards: rewardResult,
                message: 'Payment processed and rewards delivered'
            };

        } catch (error) {
            console.error('Error handling payment success:', error);
            
            // Mark transaction as failed with reason
            if (transactionId) {
                await PaymentTransaction.updateStatus(transactionId, 'failed', {
                    failure_reason: `Reward delivery failed: ${error.message}`
                });
            }
            
            throw error;
        }
    }

    // Handle failed payment
    async handlePaymentFailed(paymentIntent) {
        try {
            const transactionId = paymentIntent.metadata?.transaction_id;
            
            if (!transactionId) {
                console.error('No transaction_id found in failed payment intent');
                return { success: false, message: 'Transaction ID missing' };
            }

            console.log(`❌ Payment failed for transaction: ${transactionId}`);
            
            // Update transaction status
            await PaymentTransaction.updateStatus(transactionId, 'failed', {
                provider_transaction_id: paymentIntent.id,
                failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
                processed_at: new Date()
            });

            return {
                success: true,
                transaction_id: transactionId,
                message: 'Payment failure recorded'
            };

        } catch (error) {
            console.error('Error handling payment failure:', error);
            throw error;
        }
    }

    // Handle canceled payment
    async handlePaymentCanceled(paymentIntent) {
        try {
            const transactionId = paymentIntent.metadata?.transaction_id;
            
            if (!transactionId) {
                return { success: false, message: 'Transaction ID missing' };
            }

            console.log(`🚫 Payment canceled for transaction: ${transactionId}`);
            
            await PaymentTransaction.updateStatus(transactionId, 'cancelled', {
                provider_transaction_id: paymentIntent.id,
                failure_reason: 'Payment canceled by user',
                processed_at: new Date()
            });

            return {
                success: true,
                transaction_id: transactionId,
                message: 'Payment cancellation recorded'
            };

        } catch (error) {
            console.error('Error handling payment cancellation:', error);
            throw error;
        }
    }

    // Handle chargeback/dispute
    async handleChargeback(charge) {
        try {
            console.log(`⚠️ Chargeback created for charge: ${charge.id}`);
            
            // You might want to implement chargeback handling logic here
            // such as reversing rewards, notifying admins, etc.
            
            return {
                success: true,
                charge_id: charge.id,
                message: 'Chargeback recorded'
            };

        } catch (error) {
            console.error('Error handling chargeback:', error);
            throw error;
        }
    }

    // Handle subscription payment
    async handleSubscriptionPayment(invoice) {
        try {
            console.log(`🔄 Subscription payment for invoice: ${invoice.id}`);
            
            // Handle recurring subscription payments
            // This would be used for VIP subscriptions, etc.
            
            return {
                success: true,
                invoice_id: invoice.id,
                message: 'Subscription payment processed'
            };

        } catch (error) {
            console.error('Error handling subscription payment:', error);
            throw error;
        }
    }

    // Award currency and rewards to player
    async awardCurrency(transaction, packageData) {
        try {
            console.log(`🎁 Awarding rewards for package: ${packageData.package_id}`);
            
            const rewards = packageData.rewards || {};
            const bonusPercentage = packageData.bonus_percentage || 0;
            
            // Calculate final rewards with bonus
            const finalRewards = { ...rewards };
            
            // Apply bonus percentage if applicable
            if (bonusPercentage > 0) {
                Object.keys(finalRewards).forEach(key => {
                    if (typeof finalRewards[key] === 'number') {
                        const bonus = Math.floor(finalRewards[key] * (bonusPercentage / 100));
                        finalRewards[key] += bonus;
                    }
                });
            }

            // Award each type of currency/reward
            const awardResults = {};
            
            for (const [rewardType, amount] of Object.entries(finalRewards)) {
                try {
                    const result = await this.awardSpecificReward(transaction.user_id, rewardType, amount, transaction.transaction_id);
                    awardResults[rewardType] = result;
                    console.log(`   ✅ Awarded ${amount} ${rewardType} to user ${transaction.user_id}`);
                } catch (error) {
                    console.error(`   ❌ Failed to award ${rewardType}:`, error.message);
                    awardResults[rewardType] = { success: false, error: error.message };
                }
            }

            return {
                package_id: packageData.package_id,
                base_rewards: rewards,
                bonus_percentage: bonusPercentage,
                final_rewards: finalRewards,
                award_results: awardResults,
                total_awards: Object.keys(awardResults).length
            };

        } catch (error) {
            console.error('Error awarding currency:', error);
            throw error;
        }
    }

    // Award specific reward type
    async awardSpecificReward(userId, rewardType, amount, transactionId) {
        try {
            // This would integrate with your game's currency system
            // For now, we'll simulate the award process
            
            console.log(`💎 Awarding ${amount} ${rewardType} to user ${userId} for transaction ${transactionId}`);
            
            // Example API call to game service
            const gameServiceUrl = process.env.GAME_SERVICE_URL || 'http://localhost:3001';
            
            try {
                if (process.env.NODE_ENV !== 'development') {
                    // In production, make actual API call to game service
                    const axios = require('axios');
                    const response = await axios.post(`${gameServiceUrl}/api/rewards/award`, {
                        user_id: userId,
                        reward_type: rewardType,
                        amount: amount,
                        transaction_id: transactionId,
                        source: 'payment'
                    }, {
                        timeout: 10000,
                        headers: {
                            'Authorization': `Bearer ${process.env.GAME_SERVICE_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    return response.data;
                } else {
                    // Development simulation
                    return {
                        success: true,
                        user_id: userId,
                        reward_type: rewardType,
                        amount: amount,
                        new_balance: amount * 10, // Simulated balance
                        transaction_id: transactionId
                    };
                }
            } catch (apiError) {
                console.error(`Game service API error for ${rewardType}:`, apiError.message);
                throw new Error(`Failed to award ${rewardType}: ${apiError.message}`);
            }

        } catch (error) {
            console.error(`Error awarding ${rewardType}:`, error);
            throw error;
        }
    }

    // Notify game service about payment completion
    async notifyGameService(transaction, packageData, rewardResult) {
        try {
            const gameServiceUrl = process.env.GAME_SERVICE_URL || 'http://localhost:3001';
            
            if (process.env.NODE_ENV !== 'development') {
                const axios = require('axios');
                await axios.post(`${gameServiceUrl}/api/payments/notification`, {
                    transaction_id: transaction.transaction_id,
                    user_id: transaction.user_id,
                    package_id: packageData.package_id,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    rewards: rewardResult,
                    completed_at: new Date().toISOString()
                }, {
                    timeout: 5000,
                    headers: {
                        'Authorization': `Bearer ${process.env.GAME_SERVICE_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log(`📢 Game service notified about transaction: ${transaction.transaction_id}`);
            } else {
                console.log(`📢 [DEV] Would notify game service about transaction: ${transaction.transaction_id}`);
            }

        } catch (error) {
            console.error('Error notifying game service:', error);
            // Don't throw error - notification failure shouldn't fail the payment
        }
    }

    // Create checkout session for Stripe Checkout
    async createCheckoutSession(transactionData, successUrl, cancelUrl) {
        try {
            this.checkConfiguration();
            
            const { transaction_id, amount, currency, user_email, package_id } = transactionData;
            
            // Get package details for display
            const packageData = await PaymentPackage.getById(package_id);
            
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: packageData.name,
                            description: packageData.description || `${packageData.name} - Game Currency Package`,
                            images: packageData.image_url ? [packageData.image_url] : undefined
                        },
                        unit_amount: Math.round(amount * 100)
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: successUrl,
                cancel_url: cancelUrl,
                customer_email: user_email,
                metadata: {
                    transaction_id,
                    package_id,
                    user_email
                }
            });

            return {
                checkout_url: session.url,
                session_id: session.id
            };

        } catch (error) {
            console.error('Error creating Stripe checkout session:', error);
            throw new Error(`Stripe checkout creation failed: ${error.message}`);
        }
    }
}

module.exports = new StripeService();
