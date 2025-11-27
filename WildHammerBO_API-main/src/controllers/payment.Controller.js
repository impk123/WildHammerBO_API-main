const PaymentPackage = require('../models/paymentPackage');
const PaymentTransaction = require('../models/paymentTransaction');
const PaymentService = require('../services/paymentService');
const StripeService = require('../services/stripeService');

class PaymentController {
    // Get all payment packages
    static async getPackages(req, res) {
        try {
            const {
                category,
                package_type,
                is_popular,
                min_price,
                max_price,
                limit,
                offset
            } = req.query;
            
            const options = {
                category,
                package_type,
                is_popular: is_popular === 'true',
                min_price: min_price ? parseFloat(min_price) : undefined,
                max_price: max_price ? parseFloat(max_price) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            };
            
            const packages = await PaymentPackage.getAll(options);
            
            res.json({
                success: true,
                data: packages,
                count: packages.length
            });
        } catch (error) {
            console.error('Error getting payment packages:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment packages',
                error: error.message
            });
        }
    }
    
    // Get package by ID
    static async getPackageById(req, res) {
        try {
            const { packageId } = req.params;
            const paymentPackage = await PaymentPackage.getById(packageId);
            
            if (!paymentPackage) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment package not found'
                });
            }
            
            res.json({
                success: true,
                data: paymentPackage
            });
        } catch (error) {
            console.error('Error getting payment package:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment package',
                error: error.message
            });
        }
    }
    
    // Get popular packages
    static async getPopularPackages(req, res) {
        try {
            const { limit } = req.query;
            const packages = await PaymentPackage.getPopular(limit ? parseInt(limit) : 5);
            
            res.json({
                success: true,
                data: packages,
                count: packages.length
            });
        } catch (error) {
            console.error('Error getting popular packages:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get popular packages',
                error: error.message
            });
        }
    }
    
    // Get packages by category
    static async getPackagesByCategory(req, res) {
        try {
            const { category } = req.params;
            const packages = await PaymentPackage.getByCategory(category);
            
            res.json({
                success: true,
                data: packages,
                count: packages.length
            });
        } catch (error) {
            console.error('Error getting packages by category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get packages by category',
                error: error.message
            });
        }
    }
    
    // Check package availability for user
    static async checkPackageAvailability(req, res) {
        try {
            const { packageId } = req.params;
            const { user_id } = req.query;
            
            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }
            
            const availability = await PaymentPackage.isAvailableForUser(packageId, user_id);
            
            res.json({
                success: true,
                data: availability
            });
        } catch (error) {
            console.error('Error checking package availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check package availability',
                error: error.message
            });
        }
    }
    
    // Initialize payment
    static async initializePayment(req, res) {
        try {
            const {
                package_id,
                user_id,
                user_email,
                payment_method = 'credit_card',
                payment_provider = 'stripe',
                platform = 'web',
                country_code = 'US',
                use_checkout = false,
                success_url,
                cancel_url
            } = req.body;
            
            // Validate required fields
            if (!package_id || !user_id || !user_email) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: package_id, user_id, user_email'
                });
            }
            
            const paymentData = {
                package_id,
                user_id,
                user_email,
                payment_method,
                payment_provider,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                platform,
                country_code
            };
            
            const result = await PaymentService.initializePayment(paymentData);
            
            // If using Stripe, create Payment Intent or Checkout Session
            if (payment_provider.toLowerCase() === 'stripe') {
                const transaction = result.transaction;
                
                if (use_checkout === true) {
                    // Create Stripe Checkout Session
                    const defaultSuccessUrl = `${req.protocol}://${req.get('host')}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
                    const defaultCancelUrl = `${req.protocol}://${req.get('host')}/payment/cancel`;
                    
                    const checkoutSession = await StripeService.createCheckoutSession(
                        transaction,
                        success_url || defaultSuccessUrl,
                        cancel_url || defaultCancelUrl
                    );
                    
                    result.stripe_checkout = checkoutSession;
                } else {
                    // Create Payment Intent for custom checkout
                    const paymentIntent = await StripeService.createPaymentIntent(transaction);
                    result.stripe_payment_intent = paymentIntent;
                }
            }
            
            res.status(201).json({
                success: true,
                data: result,
                message: 'Payment initialized successfully'
            });
        } catch (error) {
            console.error('Error initializing payment:', error);
            res.status(400).json({
                success: false,
                message: 'Failed to initialize payment',
                error: error.message
            });
        }
    }
    
    // Complete payment
    static async completePayment(req, res) {
        try {
            const { transactionId } = req.params;
            const { provider_transaction_id } = req.body;
            
            const result = await PaymentService.processPaymentCompletion(transactionId, {
                provider_transaction_id
            });
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error completing payment:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Handle payment failure
    static async failPayment(req, res) {
        try {
            const { transactionId } = req.params;
            const { failure_reason, provider_transaction_id } = req.body;
            
            const result = await PaymentService.processPaymentFailure(
                transactionId,
                failure_reason || 'Payment failed',
                { provider_transaction_id }
            );
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error failing payment:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Process refund
    static async processRefund(req, res) {
        try {
            const { transactionId } = req.params;
            const { refund_reason, refund_amount } = req.body;
            
            const result = await PaymentService.processRefund(
                transactionId,
                refund_reason || 'Admin refund',
                refund_amount
            );
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error processing refund:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Get transaction details
    static async getTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const transaction = await PaymentTransaction.getById(transactionId);
            
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }
            
            res.json({
                success: true,
                data: transaction
            });
        } catch (error) {
            console.error('Error getting transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get transaction',
                error: error.message
            });
        }
    }
    
    // Get user's purchase history
    static async getUserPurchaseHistory(req, res) {
        try {
            const { userId } = req.params;
            const {
                status,
                start_date,
                end_date,
                limit,
                offset
            } = req.query;
            
            const options = {
                status,
                start_date,
                end_date,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            };
            
            const result = await PaymentService.getUserPurchaseHistory(userId, options);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error getting user purchase history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user purchase history',
                error: error.message
            });
        }
    }
    
    // Get all transactions (admin only)
    static async getAllTransactions(req, res) {
        try {
            const {
                status,
                payment_method,
                package_id,
                start_date,
                end_date,
                limit,
                offset
            } = req.query;
            
            const options = {
                status,
                payment_method,
                package_id,
                start_date,
                end_date,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            };
            
            const transactions = await PaymentTransaction.getAll(options);
            
            res.json({
                success: true,
                data: transactions,
                count: transactions.length
            });
        } catch (error) {
            console.error('Error getting all transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get transactions',
                error: error.message
            });
        }
    }
    
    // Create payment package (admin only)
    static async createPackage(req, res) {
        try {
            const packageData = {
                ...req.body,
                created_by: req.admin?.id
            };
            
            const paymentPackage = await PaymentPackage.create(packageData);
            
            res.status(201).json({
                success: true,
                data: paymentPackage,
                message: 'Payment package created successfully'
            });
        } catch (error) {
            console.error('Error creating payment package:', error);
            res.status(400).json({
                success: false,
                message: 'Failed to create payment package',
                error: error.message
            });
        }
    }
    
    // Update payment package (admin only)
    static async updatePackage(req, res) {
        try {
            const { packageId } = req.params;
            const updateData = req.body;
            
            const paymentPackage = await PaymentPackage.update(packageId, updateData);
            
            res.json({
                success: true,
                data: paymentPackage,
                message: 'Payment package updated successfully'
            });
        } catch (error) {
            console.error('Error updating payment package:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    
    // Delete payment package (admin only)
    static async deletePackage(req, res) {
        try {
            const { packageId } = req.params;
            const success = await PaymentPackage.delete(packageId);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment package not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Payment package deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting payment package:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete payment package',
                error: error.message
            });
        }
    }
    
    // Get payment analytics (admin only)
    static async getAnalytics(req, res) {
        try {
            const {
                start_date,
                end_date
            } = req.query;
            
            const options = {
                start_date,
                end_date
            };
            
            const analytics = await PaymentService.getAnalytics(options);
            
            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            console.error('Error getting payment analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment analytics',
                error: error.message
            });
        }
    }
    
    // Webhook handler
    static async handleWebhook(req, res) {
        try {
            const { provider } = req.params;
            const signature = req.get('stripe-signature') || req.get('paypal-signature');
            const payload = req.body; // This will be raw buffer for Stripe
            const isTestMode = req.get('X-Test-Mode') === 'true';
            
            console.log(`📥 Received ${provider} webhook ${isTestMode ? '(TEST MODE)' : ''}`);
            
            let result;
            
            if (provider.toLowerCase() === 'stripe') {
                let event;
                
                if (isTestMode) {
                    // For testing, use the payload directly as the event
                    console.log('🧪 Test mode - skipping signature validation');
                    event = payload;
                } else {
                    // Use new Stripe service for better webhook handling
                    event = StripeService.validateWebhookSignature(payload, signature);
                    
                    if (!event) {
                        return res.status(401).json({
                            success: false,
                            message: 'Invalid webhook signature'
                        });
                    }
                }
                
                result = await StripeService.processWebhookEvent(event);
            } else {
                // Fallback to generic payment service for other providers
                const payloadString = Buffer.isBuffer(payload) ? payload.toString() : JSON.stringify(payload);
                
                const isValid = PaymentService.validateWebhook(
                    payloadString,
                    signature,
                    process.env.WEBHOOK_SECRET
                );
                
                if (!isValid) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid webhook signature'
                    });
                }
                
                const parsedPayload = Buffer.isBuffer(payload) ? JSON.parse(payload.toString()) : payload;
                const eventType = parsedPayload.type || parsedPayload.event_type;
                const eventData = parsedPayload.data?.object || parsedPayload;
                
                result = await PaymentService.processWebhook(provider, eventType, eventData);
            }
            
            res.status(200).json({
                success: true,
                data: result,
                message: 'Webhook processed successfully'
            });
            
        } catch (error) {
            console.error('Error handling webhook:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process webhook',
                error: error.message
            });
        }
    }
}

module.exports = PaymentController;
