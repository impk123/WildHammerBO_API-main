const express = require('express');
const path = require('path');

// Create a simple static file server for testing
const app = express();
const PORT = 8080;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic route for testing
app.get('/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Test server is running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Payment System Test Server running on http://localhost:${PORT}`);
    console.log(`📄 Test Interface: http://localhost:${PORT}/test-payment-system.html`);
    console.log(`🔧 Test API: http://localhost:${PORT}/test`);
    console.log('');
    console.log('💡 Instructions:');
    console.log('1. Make sure your main API server is running on port 9000');
    console.log('2. Run the payment system setup script first');
    console.log('3. Open the test interface in your browser');
    console.log('4. Test the payment package functionality');
});
