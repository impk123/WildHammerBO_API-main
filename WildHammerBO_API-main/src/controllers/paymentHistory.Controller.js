const PaymentHistory = require('../models/paymentHistory');

class PaymentHistoryController {
    // Get all payment history with filters and pagination
    static async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                username,
                server_id,
                payment_method_types,
                currency,
                start_date,
                end_date,
                is_updated_data
            } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                username,
                server_id: server_id ? parseInt(server_id) : undefined,
                payment_method_types,
                currency,
                start_date,
                end_date,
                is_updated_data: is_updated_data !== undefined ? parseInt(is_updated_data) : undefined
            };

            const result = await PaymentHistory.getAll(options);

            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Error getting payment history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment history',
                error: error.message
            });
        }
    }

    // Get payment history by ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const paymentHistory = await PaymentHistory.getById(id);

            if (!paymentHistory) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment history not found'
                });
            }

            res.json({
                success: true,
                data: paymentHistory
            });
        } catch (error) {
            console.error('Error getting payment history by ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment history',
                error: error.message
            });
        }
    }

    // Get payment history by payment ID
    static async getByPaymentId(req, res) {
        try {
            const { paymentId } = req.params;
            const paymentHistory = await PaymentHistory.getByPaymentId(paymentId);

            if (!paymentHistory) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment history not found'
                });
            }

            res.json({
                success: true,
                data: paymentHistory
            });
        } catch (error) {
            console.error('Error getting payment history by payment ID:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment history',
                error: error.message
            });
        }
    }

    // Get payment history by username
    static async getByUsername(req, res) {
        try {
            const { username } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const options = {
                page: parseInt(page),
                limit: parseInt(limit)
            };

            const result = await PaymentHistory.getByUsername(username, options);

            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        } catch (error) {
            console.error('Error getting payment history by username:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment history',
                error: error.message
            });
        }
    }

    // Create new payment history record
    static async create(req, res) {
        try {
            const {
                create_by,
                payment_id,
                amount,
                currency,
                username,
                server_id,
                receipt_email,
                payment_method_types
            } = req.body;

            // Validate required fields
            if (!payment_id || !amount || !username || !server_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: payment_id, amount, username, server_id'
                });
            }

            const paymentData = {
                create_by: create_by || 'system',
                payment_id,
                amount: parseFloat(amount),
                currency: currency || 'thb',
                username,
                server_id: parseInt(server_id),
                receipt_email: receipt_email || '',
                payment_method_types: payment_method_types || 'unknown'
            };

            const newPaymentHistory = await PaymentHistory.create(paymentData);

            res.status(201).json({
                success: true,
                data: newPaymentHistory,
                message: 'Payment history created successfully'
            });
        } catch (error) {
            console.error('Error creating payment history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create payment history',
                error: error.message
            });
        }
    }

    // Update payment history record
    static async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Remove fields that shouldn't be updated
            delete updateData.id;
            delete updateData.create_at;
            delete updateData.create_by;
            delete updateData.payment_id;

            const updatedPaymentHistory = await PaymentHistory.update(id, updateData);

            res.json({
                success: true,
                data: updatedPaymentHistory,
                message: 'Payment history updated successfully'
            });
        } catch (error) {
            console.error('Error updating payment history:', error);
            
            if (error.message === 'Payment history record not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Payment history not found'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to update payment history',
                error: error.message
            });
        }
    }

    // Delete payment history record
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await PaymentHistory.delete(id);

            res.json({
                success: true,
                message: 'Payment history deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting payment history:', error);
            
            if (error.message === 'Payment history record not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Payment history not found'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Failed to delete payment history',
                error: error.message
            });
        }
    }

    // Get payment statistics
    static async getStatistics(req, res) {
        try {
            const {
                start_date,
                end_date,
                server_id,
                currency
            } = req.query;

            const options = {
                start_date,
                end_date,
                server_id: server_id ? parseInt(server_id) : undefined,
                currency
            };

            const statistics = await PaymentHistory.getStatistics(options);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Error getting payment statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get payment statistics',
                error: error.message
            });
        }
    }

    // Bulk update payment history
    static async bulkUpdate(req, res) {
        try {
            const { ids, updateData } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ids array is required'
                });
            }

            if (!updateData || Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'updateData is required'
                });
            }

            const results = [];
            const errors = [];

            for (const id of ids) {
                try {
                    const updated = await PaymentHistory.update(id, updateData);
                    results.push(updated);
                } catch (error) {
                    errors.push({ id, error: error.message });
                }
            }

            res.json({
                success: true,
                data: {
                    updated: results,
                    errors: errors,
                    summary: {
                        total: ids.length,
                        successful: results.length,
                        failed: errors.length
                    }
                },
                message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`
            });
        } catch (error) {
            console.error('Error in bulk update:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to perform bulk update',
                error: error.message
            });
        }
    }
}

module.exports = PaymentHistoryController;
