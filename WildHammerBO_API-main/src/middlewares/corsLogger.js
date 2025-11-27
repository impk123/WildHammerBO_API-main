// Middleware to log CORS requests for debugging
const corsLogger = (req, res, next) => {
    const origin = req.get('Origin');
    const userAgent = req.get('User-Agent');
    const method = req.method;
    const url = req.url;
    
    // Log all requests with origin
    if (origin) {
        console.log(`🌐 CORS Request: ${method} ${url} from origin: ${origin}`);
        console.log(`📱 User-Agent: ${userAgent}`);
    } else {
        console.log(`🔧 Request without origin: ${method} ${url} (likely mobile app or server-to-server)`);
    }
    
    next();
};

module.exports = corsLogger;
