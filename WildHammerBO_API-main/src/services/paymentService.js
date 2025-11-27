const PaymentPackage = require('../models/paymentPackage');
const PaymentTransaction = require('../models/paymentTransaction');
const gameService = require('./gameService');
const db_backoffice = require('../models/db_backoffice');

class PaymentService {
    // Initialize payment for a package
    static async initializePayment(paymentData) {
        try {
            const { package_id, user_id } = paymentData;
            
            // Check if package is available for user
            const availability = await PaymentPackage.isAvailableForUser(package_id, user_id);
            if (!availability.available) {
                throw new Error(availability.reason);
            }
            
            const packageData = availability.package;
            
            // Create transaction record
            const transaction = await PaymentTransaction.create({
                package_id,
                user_id,
                user_email: paymentData.user_email,
                amount: packageData.price_usd,
                currency: packageData.currency,
                payment_method: paymentData.payment_method,
                payment_provider: paymentData.payment_provider,
                provider_transaction_id: paymentData.provider_transaction_id,
                ip_address: paymentData.ip_address,
                user_agent: paymentData.user_agent,
                platform: paymentData.platform,
                country_code: paymentData.country_code
            });
            
            // Log the payment initialization
            console.log(`Payment initialized for user ${userId}, package ${packageId}, transaction ${transaction.transaction_id}`);
            
            return {
                success: true,
                transaction_id: transaction.transaction_id,
                amount: packageData.price_usd,
                currency: packageData.currency,
                package_name: packageData.name,
                rewards: packageData.rewards
            };
        } catch (error) {
            console.error('Error initializing payment:', error);
            throw error;
        }
    }
    
    // Process payment completion
    static async processPaymentCompletion(transactionId, providerData = {}) {
        try {
            const transaction = await PaymentTransaction.getById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            
            if (transaction.status !== 'pending') {
                throw new Error(`Transaction already ${transaction.status}`);
            }
            
            // Update transaction status to completed
            const updatedTransaction = await PaymentTransaction.updateStatus(
                transactionId, 
                'completed',
                {
                    provider_transaction_id: providerData.provider_transaction_id || transaction.provider_transaction_id
                }
            );
            
            // Deliver rewards to user
            const rewardResult = await this.deliverRewards(transactionId);
            
            // Update user purchase history
            await PaymentTransaction.updateUserPurchaseHistory(transactionId);
            
            // Notify game service about the purchase
            try {
                await gameService.notifyPurchase({
                    user_id: transaction.user_id,
                    package_id: transaction.package_id,
                    transaction_id: transactionId,
                    rewards: transaction.package_rewards,
                    amount: transaction.amount
                });
            } catch (gameError) {
                console.error('Failed to notify game service:', gameError);
                // Don't fail the payment if game notification fails
            }
            
            console.log(`Payment completed for transaction ${transactionId}`);
            
            return {
                success: true,
                transaction: updatedTransaction,
                rewards_delivered: rewardResult.success,
                rewards: rewardResult.rewards
            };
        } catch (error) {
            console.error('Error processing payment completion:', error);
            throw error;
        }
    }
    
    // Deliver rewards to user
    static async deliverRewards(transactionId) {
        try {
            const transaction = await PaymentTransaction.getById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            
            if (transaction.status !== 'completed') {
                throw new Error('Transaction not completed');
            }
            
            if (transaction.rewards_delivered) {
                return {
                    success: true,
                    message: 'Rewards already delivered',
                    rewards: transaction.package_rewards
                };
            }
            
            // Get package rewards
            const packageData = await PaymentPackage.getById(transaction.package_id);
            if (!packageData) {
                throw new Error('Package not found');
            }
            
            const rewards = packageData.rewards;
            
            // Deliver rewards to game service
            try {
                await gameService.deliverRewards({
                    user_id: transaction.user_id,
                    rewards: rewards,
                    source: 'purchase',
                    reference_id: transactionId
                });
                
                // Mark rewards as delivered
                await PaymentTransaction.markRewardsDelivered(transactionId);
                
                console.log(`Rewards delivered for transaction ${transactionId}:`, rewards);
                
                return {
                    success: true,
                    rewards: rewards,
                    delivered_at: new Date()
                };
            } catch (gameError) {
                console.error('Failed to deliver rewards via game service:', gameError);
                
                // If game service fails, we can implement a retry mechanism
                // For now, we'll mark as failed and return error
                throw new Error('Failed to deliver rewards to game');
            }
        } catch (error) {
            console.error('Error delivering rewards:', error);
            throw error;
        }
    }
    
    // Process payment failure
    static async processPaymentFailure(transactionId, failureReason, providerData = {}) {
        try {
            const updatedTransaction = await PaymentTransaction.updateStatus(
                transactionId,
                'failed',
                {
                    failure_reason: failureReason,
                    provider_transaction_id: providerData.provider_transaction_id
                }
            );
            
            console.log(`Payment failed for transaction ${transactionId}: ${failureReason}`);
            
            return {
                success: true,
                transaction: updatedTransaction,
                failure_reason: failureReason
            };
        } catch (error) {
            console.error('Error processing payment failure:', error);
            throw error;
        }
    }
    
    // Process refund
    static async processRefund(transactionId, refundReason, refundAmount = null) {
        try {
            const transaction = await PaymentTransaction.getById(transactionId);
            if (!transaction) {
                throw new Error('Transaction not found');
            }
            
            if (transaction.status !== 'completed') {
                throw new Error('Can only refund completed transactions');
            }
            
            // Update transaction status
            const updatedTransaction = await PaymentTransaction.updateStatus(
                transactionId,
                'refunded',
                {
                    failure_reason: refundReason
                }
            );
            
            // If rewards were delivered, we should remove them from user's account
            if (transaction.rewards_delivered) {
                try {
                    await gameService.removeRewards({
                        user_id: transaction.user_id,
                        rewards: transaction.package_rewards,
                        source: 'refund',
                        reference_id: transactionId
                    });
                } catch (gameError) {
                    console.error('Failed to remove rewards via game service:', gameError);
                    // Log but don't fail the refund process
                }
            }
            
            console.log(`Payment refunded for transaction ${transactionId}: ${refundReason}`);
            
            return {
                success: true,
                transaction: updatedTransaction,
                refund_amount: refundAmount || transaction.amount,
                refund_reason: refundReason
            };
        } catch (error) {
            console.error('Error processing refund:', error);
            throw error;
        }
    }
    
    // Get user's purchase history
    static async getUserPurchaseHistory(userId, options = {}) {
        try {
            const transactions = await PaymentTransaction.getUserTransactions(userId, options);
            
            // Get user's purchase summary
            
            const [summaryRows] = await db_backoffice.execute(`
                SELECT 
                    COUNT(*) as total_purchases,
                    SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_spent,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_purchases,
                    COUNT(DISTINCT package_id) as unique_packages_purchased
                FROM payment_transactions 
                WHERE user_id = ?
            `, [userId]);
            
            return {
                transactions: transactions,
                summary: summaryRows[0]
            };
        } catch (error) {
            console.error('Error getting user purchase history:', error);
            throw error;
        }
    }
    
    // Validate payment webhook
    static validateWebhook(payload, signature, secret) {
        try {
            // This would implement webhook signature validation
            // depending on the payment provider (Stripe, PayPal, etc.)
            
            // Example for Stripe webhook validation:
            // const crypto = require('crypto');
            // const expectedSignature = crypto
            //     .createHmac('sha256', secret)
            //     .update(payload, 'utf8')
            //     .digest('hex');
            // return signature === expectedSignature;
            
            // For demo purposes, return true
            return true;
        } catch (error) {
            console.error('Error validating webhook:', error);
            return false;
        }
    }
    
    // Process webhook from payment provider
    static async processWebhook(provider, event, payload) {
        try {
            console.log(`Processing ${provider} webhook:`, event);
            
            switch (provider.toLowerCase()) {
                case 'stripe':
                    return await this.processStripeWebhook(event, payload);
                case 'paypal':
                    return await this.processPayPalWebhook(event, payload);
                default:
                    throw new Error(`Unsupported payment provider: ${provider}`);
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
            throw error;
        }
    }
    
    // Process Stripe webhook
    static async processStripeWebhook(event, payload) {
        try {
            switch (event) {
                case 'payment_intent.succeeded':
                    const transactionId = payload.metadata?.transaction_id;
                    if (transactionId) {
                        return await this.processPaymentCompletion(transactionId, {
                            provider_transaction_id: payload.id
                        });
                    }
                    break;
                    
                case 'payment_intent.payment_failed':
                    const failedTransactionId = payload.metadata?.transaction_id;
                    if (failedTransactionId) {
                        return await this.processPaymentFailure(
                            failedTransactionId,
                            payload.last_payment_error?.message || 'Payment failed',
                            { provider_transaction_id: payload.id }
                        );
                    }
                    break;
                    
                default:
                    console.log(`Unhandled Stripe event: ${event}`);
            }
            
            return { success: true, processed: false };
        } catch (error) {
            console.error('Error processing Stripe webhook:', error);
            throw error;
        }
    }
    
    // Process PayPal webhook
    static async processPayPalWebhook(event, payload) {
        try {
            switch (event) {
                case 'PAYMENT.CAPTURE.COMPLETED':
                    const transactionId = payload.custom_id;
                    if (transactionId) {
                        return await this.processPaymentCompletion(transactionId, {
                            provider_transaction_id: payload.id
                        });
                    }
                    break;
                    
                case 'PAYMENT.CAPTURE.DENIED':
                    const failedTransactionId = payload.custom_id;
                    if (failedTransactionId) {
                        return await this.processPaymentFailure(
                            failedTransactionId,
                            'Payment denied by PayPal',
                            { provider_transaction_id: payload.id }
                        );
                    }
                    break;
                    
                default:
                    console.log(`Unhandled PayPal event: ${event}`);
            }
            
            return { success: true, processed: false };
        } catch (error) {
            console.error('Error processing PayPal webhook:', error);
            throw error;
        }
    }
    
    // Get payment analytics
    static async getAnalytics(options = {}) {
        try {
            // Use PaymentHistory instead of PaymentTransaction
            const PaymentHistory = require('../models/paymentHistory');
            const stats = await PaymentHistory.getStatistics(options);
            
            return {
                transaction_stats: stats,
                generated_at: new Date()
            };
        } catch (error) {
            console.error('Error getting payment analytics:', error);
            throw error;
        }
    }
}

module.exports = PaymentService;
