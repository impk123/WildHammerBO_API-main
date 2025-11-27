require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { readdirSync } = require('fs');

// Import Redis and Transaction managers
const { redisManager } = require('./src/config/redis');
const banScheduler = require('./src/utils/banScheduler');

const app = express();
const port = process.env.PORT || 3500;

// Redis will connect lazily when first used
// No need to connect on startup

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, Postman, curl)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:9000',
            'http://localhost:9100',
            'http://localhost:3500',
            'http://localhost:7456',
            'https://admin.wildhammer.online',        
            'http://admin.wildhammer.online',     
            'http://web.wildhammer.online',
            'https://web.wildhammer.online',      
            'http://play.wildhammer.online',        
            'https://play.wildhammer.online',
            process.env.CORS_ORIGIN
        ].filter(Boolean);
        
        // Check if origin is in allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('🚫 CORS blocked origin:', origin);
            // For development, you might want to allow all
            // For production, be more restrictive
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ Development mode: allowing origin anyway');
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Forwarded-For', 'X-Real-IP']
};

// Redis connection is now handled lazily

// Middleware
app.use(require('./src/middlewares/corsLogger')); // Log CORS requests
app.use(cors(corsOptions));

// Special middleware for webhook endpoints that need raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Standard JSON middleware for other endpoints
app.use(express.json());
app.use(cookieParser());

// Debug log: log every request (disabled)
// app.use((req, res, next) => {
//     console.log(`➡️  [${req.method}] ${req.originalUrl}`);
//     next();
// });

// System status endpoint
app.get('/api/status', async (req, res) => {
    try {
        // Redis will connect lazily if needed
        const status = await redisManager.get('mykey');
        
        res.json({
            success: true,
            message: 'Idle Game Admin System API is running',
            redis: {
                connected: redisManager.isConnected,
                status: status
            }
        });
    } catch (err) {
        console.error('Error fetching status from Redis:', err);
        res.json({
            success: true,
            message: 'Idle Game Admin System API is running',
            redis: {
                connected: false,
                error: 'Redis not available'
            }
        });
    }
});


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Idle Game Admin System API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Auto load route files
readdirSync('./src/routes').map((routeFile) => {
    const routeName = routeFile.replace(/\.js$/, '');
    app.use(`/api/${routeName}`, require('./src/routes/' + routeFile));
    // console.log(`✅ Route loaded: /api/${routeName}`);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Shutting down server...');
    banScheduler.stop();
    await redisManager.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 Shutting down server...');
    banScheduler.stop();
    await redisManager.close();
    process.exit(0);
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Idle Game Admin System running on port ${port}`);
    console.log(`📱 Health check: http://localhost:${port}/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth`);
    console.log(`👥 User management: http://localhost:${port}/api/users`);
    console.log(`⚙️ System status: http://localhost:${port}/api/system/status`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Start ban scheduler for processing expired bans
    banScheduler.start();
});