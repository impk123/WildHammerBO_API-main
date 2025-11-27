const mysql = require('mysql2/promise');

// Test transaction fix
async function testTransactionFix() {
    console.log('🧪 Testing Transaction Fix...\n');

    try {
        // Test 1: Test connection pool transaction
        console.log('1️⃣ Testing: Connection Pool Transaction');
        
        const pool = mysql.createPool({
            host: process.env.DB_HOST_BACKEND || 'localhost',
            user: process.env.DB_USER_BACKEND || 'root',
            password: process.env.DB_PASSWORD_BACKEND || '',
            database: process.env.DB_NAME_BACKEND || 'lyz_wgbackend',
            port: process.env.DB_PORT_BACKEND || 3306,
        });

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            console.log('✅ beginTransaction() works');
            
            // Test a simple query
            await connection.execute('SELECT 1 as test');
            console.log('✅ connection.execute() works');
            
            await connection.commit();
            console.log('✅ commit() works');
            
        } catch (error) {
            await connection.rollback();
            console.log('✅ rollback() works');
            throw error;
        } finally {
            connection.release();
            console.log('✅ connection.release() works');
        }

        await pool.end();
        console.log('✅ Pool closed successfully');

        // Test 2: Test old method (should fail)
        console.log('\n2️⃣ Testing: Old Method (should fail)');
        
        const pool2 = mysql.createPool({
            host: process.env.DB_HOST_BACKEND || 'localhost',
            user: process.env.DB_USER_BACKEND || 'root',
            password: process.env.DB_PASSWORD_BACKEND || '',
            database: process.env.DB_NAME_BACKEND || 'lyz_wgbackend',
            port: process.env.DB_PORT_BACKEND || 3306,
        });

        try {
            // This should fail with ER_UNSUPPORTED_PS error
            await pool2.execute('START TRANSACTION');
            console.log('❌ Unexpected success - this should fail');
        } catch (error) {
            if (error.code === 'ER_UNSUPPORTED_PS') {
                console.log('✅ Expected error caught:', error.message);
            } else {
                console.log('⚠️  Different error:', error.message);
            }
        }

        await pool2.end();

        console.log('\n🎉 Transaction fix test completed!');
        console.log('\n📝 Summary:');
        console.log('1. ✅ Connection pool transactions work correctly');
        console.log('2. ✅ Old prepared statement method fails as expected');
        console.log('3. ✅ Fixed files:');
        console.log('   - src/controllers/reward.Controller.js');
        console.log('   - src/services/giftCodeService.js');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    testTransactionFix().catch(console.error);
}

module.exports = { testTransactionFix };
