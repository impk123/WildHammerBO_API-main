const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.Controller');
const auth = require('../middlewares/auth');

// Public routes (for game clients and users)

// Get all payment packages
router.get('/packages', PaymentController.getPackages);

// Get popular packages
router.get('/packages/popular', PaymentController.getPopularPackages);

// Get packages by category
router.get('/packages/category/:category', PaymentController.getPackagesByCategory);

// Get specific package
router.get('/packages/:packageId', PaymentController.getPackageById);

// Check package availability for user
router.get('/packages/:packageId/availability', PaymentController.checkPackageAvailability);

// Initialize payment
router.post('/initialize', PaymentController.initializePayment);

// Complete payment
router.post('/complete/:transactionId', PaymentController.completePayment);

// Handle payment failure
router.post('/fail/:transactionId', PaymentController.failPayment);

// Get transaction details
router.get('/transactions/:transactionId', PaymentController.getTransaction);

// Get user's purchase history
router.get('/users/:userId/purchases', PaymentController.getUserPurchaseHistory);

// Webhook endpoints (no auth required)
router.post('/webhook/:provider', PaymentController.handleWebhook);

// Protected routes (require authentication)

// Admin routes (require admin authentication)
router.use(auth.authenticateToken);
//router.use(auth.requireRole(['super_admin', 'admin']));

// Get all transactions (admin only)
router.get('/admin/transactions', PaymentController.getAllTransactions);

// Create payment package (admin only)
router.post('/admin/packages', PaymentController.createPackage);

// Update payment package (admin only)
router.put('/admin/packages/:packageId', PaymentController.updatePackage);

// Delete payment package (admin only)
router.delete('/admin/packages/:packageId', PaymentController.deletePackage);

// Process refund (admin only)
router.post('/admin/refund/:transactionId', PaymentController.processRefund);

// Get payment analytics (admin only)
router.get('/admin/analytics', PaymentController.getAnalytics);

module.exports = router;
