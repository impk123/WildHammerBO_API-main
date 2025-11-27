# 🔧 Transaction Fix Documentation

## ปัญหาที่พบ

```
Error: This command is not supported in the prepared statement protocol yet
    at PromisePool.execute (/home/game/backoffice_api/node_modules/mysql2/lib/promise/pool.js:54:22)
    at Database.execute (/home/game/backoffice_api/src/models/db_wgbackend.js:30:28)
    at redeemReward (/home/game/backoffice_api/src/controllers/reward.Controller.js:250:32)
```

**สาเหตุ**: MySQL2 prepared statement protocol ไม่รองรับ transaction commands (`START TRANSACTION`, `COMMIT`, `ROLLBACK`)

## วิธีแก้ไข

### 1. ใช้ Connection Pool แทน Prepared Statement

**เก่า (ผิด)**:
```javascript
// ใช้ prepared statement - ไม่ support transaction
await db_wgbackend.execute('START TRANSACTION');
await db_wgbackend.execute('COMMIT');
await db_wgbackend.execute('ROLLBACK');
```

**ใหม่ (ถูก)**:
```javascript
// ใช้ connection pool - support transaction
const connection = await db_wgbackend.getPool().getConnection();
await connection.beginTransaction();
await connection.commit();
await connection.rollback();
connection.release(); // สำคัญ: ต้อง release connection
```

### 2. ไฟล์ที่แก้ไข

#### `src/controllers/reward.Controller.js`
```javascript
// เก่า
await db_wgbackend.execute('START TRANSACTION');
// ... transaction logic ...
await db_wgbackend.execute('COMMIT');

// ใหม่
const connection = await db_wgbackend.getPool().getConnection();
try {
    await connection.beginTransaction();
    // ... transaction logic ...
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

#### `src/services/giftCodeService.js`
```javascript
// เก่า
await db_backoffice.getPool().execute('START TRANSACTION');
// ... transaction logic ...
await db_backoffice.getPool().execute('COMMIT');

// ใหม่
const connection = await db_backoffice.getPool().getConnection();
try {
    await connection.beginTransaction();
    // ... transaction logic ...
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

## หลักการสำคัญ

### 1. Connection Management
- **ต้อง release connection** หลังจากใช้เสร็จ
- ใช้ `try-catch-finally` เพื่อให้แน่ใจว่า connection ถูก release
- ไม่ควรใช้ connection หลายตัวพร้อมกัน

### 2. Transaction Pattern
```javascript
const connection = await pool.getConnection();
try {
    await connection.beginTransaction();
    
    // ทำ database operations
    await connection.execute('UPDATE ...');
    await connection.execute('INSERT ...');
    
    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

### 3. Error Handling
- **Rollback** เมื่อมี error
- **Release connection** ใน `finally` block เสมอ
- **Throw error** หลังจาก rollback เพื่อให้ caller จัดการต่อ

## การทดสอบ

### 1. Test Transaction Fix
```bash
node tests/test-transaction-fix.js
```

### 2. Test Rewards API
```bash
# เปิด web interface
http://localhost:3500/test-rewards.html

# หรือใช้ test script
node tests/test-rewards-token.js
```

## ผลลัพธ์

✅ **แก้ไขแล้ว**:
- `src/controllers/reward.Controller.js` - redeemReward function
- `src/services/giftCodeService.js` - processRewards function

✅ **Transaction ทำงานได้**:
- ไม่มี `ER_UNSUPPORTED_PS` error
- Connection pool ทำงานถูกต้อง
- Rollback/Commit ทำงานได้

✅ **Performance**:
- Connection reuse
- Pool management
- Memory efficient

## หมายเหตุ

- **Prepared Statement**: ใช้สำหรับ query ปกติ (SELECT, INSERT, UPDATE, DELETE)
- **Connection Pool**: ใช้สำหรับ transaction (BEGIN, COMMIT, ROLLBACK)
- **ไม่ควรผสม** prepared statement กับ transaction ใน connection เดียวกัน
