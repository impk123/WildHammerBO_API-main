const axios = require('axios');

async function simpleTest() {
    try {
        // Wait a moment for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Testing login with logActivity...');
        
        const response = await axios.post('http://localhost:9000/api/auth/login', {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        if (response.data.success) {
            console.log('✅ SUCCESS: Login worked! No more logActivity error.');
            console.log('✅ Token received:', response.data.token ? 'Yes' : 'No');
            console.log('✅ Admin data:', response.data.admin ? 'Yes' : 'No');
        } else {
            console.log('❌ Login failed:', response.data.message);
        }
        
    } catch (error) {
        if (error.response) {
            console.log('❌ FAILED:', error.response.data);
        } else {
            console.log('❌ CONNECTION ERROR:', error.message);
        }
    }
}

simpleTest();
