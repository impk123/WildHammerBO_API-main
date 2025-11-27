const express = require('express');
const router = express.Router();
const PaymentHistoryController = require('../controllers/paymentHistory.Controller');
const { authenticateToken } = require('../middlewares/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/payment-history - Get all payment history with filters and pagination
router.get('/', PaymentHistoryController.getAll);

// GET /api/payment-history/statistics - Get payment statistics
router.get('/statistics', PaymentHistoryController.getStatistics);

// GET /api/payment-history/:id - Get payment history by ID
router.get('/:id', PaymentHistoryController.getById);

// GET /api/payment-history/payment/:paymentId - Get payment history by payment ID
router.get('/payment/:paymentId', PaymentHistoryController.getByPaymentId);

// GET /api/payment-history/user/:username - Get payment history by username
router.get('/user/:username', PaymentHistoryController.getByUsername);

// POST /api/payment-history - Create new payment history record
router.post('/', PaymentHistoryController.create);

// PUT /api/payment-history/:id - Update payment history record
router.put('/:id', PaymentHistoryController.update);

// PATCH /api/payment-history/bulk - Bulk update payment history
router.patch('/bulk', PaymentHistoryController.bulkUpdate);

// DELETE /api/payment-history/:id - Delete payment history record
router.delete('/:id', PaymentHistoryController.delete);

module.exports = router;
