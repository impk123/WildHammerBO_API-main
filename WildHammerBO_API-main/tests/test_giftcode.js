console.log('Testing gift code model...');

try {
    const GiftCodeModel = require('../../src/models/giftCode');
    console.log('✅ GiftCodeModel loaded successfully');
    
    // Test database connection
    const db = require('../../src/models/db_backoffice');
    console.log('✅ Database module loaded successfully');
    
    // Test finding a gift code
    GiftCodeModel.findByCode('WELCOME2024')
        .then(giftCode => {
            console.log('✅ Gift code found:', giftCode ? giftCode.code : 'null');
        })
        .catch(error => {
            console.error('❌ Error finding gift code:', error.message);
        });
        
} catch (error) {
    console.error('❌ Error loading modules:', error.message);
    console.error(error.stack);
}
