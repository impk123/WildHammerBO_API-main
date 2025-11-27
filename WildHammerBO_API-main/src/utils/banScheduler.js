const userBanService = require('../services/userBanService');

class BanScheduler {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.checkInterval = parseInt(process.env.BAN_CHECK_INTERVAL) || 300000; // 5 minutes default
    }

    // Start the scheduler
    start() {
        if (this.isRunning) {
            console.log('⚠️ Ban scheduler is already running');
            return;
        }

        console.log(`🕐 Starting ban scheduler (checking every ${this.checkInterval / 1000} seconds)`);
        
        this.isRunning = true;
        
        
    }

    // Stop the scheduler
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Ban scheduler is not running');
            return;
        }

        console.log('🛑 Stopping ban scheduler');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
    }

    

    // Get scheduler status
    getStatus() {
        return {
            running: this.isRunning,
            checkInterval: this.checkInterval,
            nextCheck: this.isRunning ? new Date(Date.now() + this.checkInterval).toISOString() : null
        };
    }

    // Manual trigger
    async triggerCheck() {
        
    }
}

// Create singleton instance
const banScheduler = new BanScheduler();

module.exports = banScheduler;
