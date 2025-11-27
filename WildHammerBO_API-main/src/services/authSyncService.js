const syncService = require('./syncService');
const db_backoffice = require('../models/db_backoffice');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthSyncService {
    constructor() {
        this.cachePrefix = 'auth';
        this.cacheTTL = 3600; // 1 hour
    }

    // Login with direct database access
    async login(email, password) {
        try {
            
            // Get admin data directly from database
            const pool = db_backoffice.getPool();
            const [rows] = await pool.execute(
                'SELECT * FROM admins WHERE email = ? AND is_active = 1',
                [email]
            );

            const admin = rows[0];
            //console.log(await bcrypt.hash('admin123456', 10));
            
            if (!admin || !(await bcrypt.compare(password, admin.password))) {
                throw new Error('Invalid credentials');
            }

            if (admin.is_active !== 1) {
                throw new Error('Account is disabled');
            }

            // Generate JWT token
            const token = this.generateToken(admin);

            // Update last login and log activity
            await pool.execute(
                'UPDATE admins SET last_login = NOW() WHERE id = ?',
                [admin.id]
            );

            await pool.execute(
                'INSERT INTO admin_logs (admin_id, action, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())',
                [admin.id, 'login', 'unknown', 'unknown']
            );

            return {
                success: true,
                token,
                admin: this.toSafeObject(admin),
                message: 'Login successful'
            };

        } catch (error) {
            console.error('❌ Login failed:', error.message);
            throw error;
        }
    }

    // Register admin with transaction
    async register(adminData, creatorId) {
        const hashedPassword = await bcrypt.hash(adminData.password, 12);

        const operations = [
            {
                execute: async (connection) => {
                    // Check if email already exists
                    const [existing] = await connection.execute(
                        'SELECT id FROM admins WHERE email = ?',
                        [adminData.email]
                    );

                    if (existing.length > 0) {
                        throw new Error('Email already exists');
                    }

                    // Insert new admin
                    const [result] = await connection.execute(
                        `INSERT INTO admins (username, email, password, role, is_active, created_by, created_at) 
                         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            adminData.username,
                            adminData.email,
                            hashedPassword,
                            adminData.role || 'admin',
                            adminData.is_active || 1,
                            creatorId
                        ]
                    );

                    return { insertId: result.insertId };
                },
                rollbackKeys: [`${this.cachePrefix}:email:${adminData.email}`]
            },
            {
                execute: async (connection) => {
                    await connection.execute(
                        'INSERT INTO admin_logs (admin_id, action, details, created_at) VALUES (?, ?, ?, NOW())',
                        [creatorId, 'admin_created', `Created admin: ${adminData.email}`]
                    );
                    return { logged: true };
                }
            }
        ];

        const syncOperations = [
            {
                type: 'flush_pattern',
                pattern: `${this.cachePrefix}:list:*`
            }
        ];

        try {
            const result = await syncService.executeWithSync(operations, syncOperations);
            
            // Get the new admin data
            const newAdmin = await this.getAdminById(result.results[0].insertId);

            return {
                success: true,
                admin: this.toSafeObject(newAdmin),
                message: 'Admin created successfully'
            };

        } catch (error) {
            console.error('❌ Admin registration failed:', error.message);
            throw error;
        }
    }

    // Get admin by email with caching
    async getAdminByEmail(email) {
        const cacheKey = `${this.cachePrefix}:email:${email}`;
        
        return await syncService.cacheWithRefresh(
            cacheKey,
            async () => {
                const pool = db_backoffice.getPool();
                const [rows] = await pool.execute(
                    'SELECT * FROM admins WHERE email = ? AND is_active = 1',
                    [email]
                );
                return rows[0] || null;
            },
            this.cacheTTL
        );
    }

    // Get admin by ID with caching
    async getAdminById(id) {
        const cacheKey = `${this.cachePrefix}:admin:${id}`;
        
        return await syncService.cacheWithRefresh(
            cacheKey,
            async () => {
                const pool = db_backoffice.getPool();
                const [rows] = await pool.execute(
                    'SELECT * FROM admins WHERE id = ?',
                    [id]
                );
                return rows[0] || null;
            },
            this.cacheTTL
        );
    }

    // Verify token and get admin
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret-key-for-development');
            const admin = await this.getAdminById(decoded.id);
            
            if (!admin || admin.is_active !== 1) {
                throw new Error('Admin not found or inactive');
            }

            return admin;

        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // Check permission with caching
    async checkPermission(adminId, permission) {
        const cacheKey = `${this.cachePrefix}:permission:${adminId}:${permission}`;
        
        return await syncService.cacheWithRefresh(
            cacheKey,
            async () => {
                const admin = await this.getAdminById(adminId);
                
                if (!admin) {
                    return false;
                }

                // Super admin has all permissions
                if (admin.role === 'super_admin') {
                    return true;
                }

                // Define role-based permissions
                const rolePermissions = {
                    admin: [
                        'user_management',
                        'gift_codes',
                        'view_reports',
                        'system_monitoring'
                    ],
                    moderator: [
                        'gift_codes',
                        'view_reports'
                    ],
                    viewer: [
                        'view_reports'
                    ]
                };

                const adminPermissions = rolePermissions[admin.role] || [];
                return adminPermissions.includes(permission);
            },
            1800 // 30 minutes TTL for permissions
        );
    }

    // Update admin profile with transaction
    async updateProfile(adminId, updateData) {
        const operations = [
            {
                execute: async (connection) => {
                    const updates = [];
                    const values = [];

                    if (updateData.username) {
                        updates.push('username = ?');
                        values.push(updateData.username);
                    }

                    if (updateData.email) {
                        updates.push('email = ?');
                        values.push(updateData.email);
                    }

                    if (updateData.password) {
                        const hashedPassword = await bcrypt.hash(updateData.password, 12);
                        updates.push('password = ?');
                        values.push(hashedPassword);
                    }

                    if (updates.length === 0) {
                        throw new Error('No data to update');
                    }

                    updates.push('updated_at = NOW()');
                    values.push(adminId);

                    const [result] = await connection.execute(
                        `UPDATE admins SET ${updates.join(', ')} WHERE id = ?`,
                        values
                    );

                    return { affectedRows: result.affectedRows };
                },
                rollbackKeys: [`${this.cachePrefix}:admin:${adminId}`]
            }
        ];

        const syncOperations = [
            {
                type: 'delete',
                key: `${this.cachePrefix}:admin:${adminId}`
            },
            {
                type: 'flush_pattern',
                pattern: `${this.cachePrefix}:permission:${adminId}:*`
            }
        ];

        if (updateData.email) {
            syncOperations.push({
                type: 'flush_pattern',
                pattern: `${this.cachePrefix}:email:*`
            });
        }

        try {
            await syncService.executeWithSync(operations, syncOperations);
            
            // Return updated admin data
            const updatedAdmin = await this.getAdminById(adminId);
            
            return {
                success: true,
                admin: this.toSafeObject(updatedAdmin),
                message: 'Profile updated successfully'
            };

        } catch (error) {
            console.error('❌ Profile update failed:', error.message);
            throw error;
        }
    }

    // Logout with session cleanup
    async logout(adminId) {
        try {
            // Clear cache entries for this admin
            await syncService.invalidateCache([
                `${this.cachePrefix}:admin:${adminId}`,
                `${this.cachePrefix}:permission:${adminId}:*`
            ]);

            // Log logout activity
            const pool = db_backoffice.getPool();
            await pool.execute(
                'INSERT INTO admin_logs (admin_id, action, created_at) VALUES (?, ?, NOW())',
                [adminId, 'logout']
            );

            return {
                success: true,
                message: 'Logged out successfully'
            };

        } catch (error) {
            console.error('❌ Logout failed:', error.message);
            throw error;
        }
    }

    // Generate JWT token
    generateToken(admin) {
        return jwt.sign(
            {
                id: admin.id,
                email: admin.email,
                role: admin.role
            },
            process.env.JWT_SECRET || 'default-jwt-secret-key-for-development',
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            }
        );
    }

    // Convert admin object to safe object (remove sensitive data)
    toSafeObject(admin) {
        if (!admin) return null;
        
        const { password, ...safeAdmin } = admin;
        return safeAdmin;
    }

    // Log admin activity
    async logActivity(adminId, action, clientInfo = {}) {
        try {
            const pool = db_backoffice.getPool();
            await pool.execute(
                'INSERT INTO admin_logs (admin_id, action, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())',
                [
                    adminId,
                    action,
                    clientInfo.ip_address || 'unknown',
                    clientInfo.user_agent || 'unknown'
                ]
            );

            console.log(`📝 Activity logged: ${action} for admin ${adminId}`);
            return true;

        } catch (error) {
            console.error('❌ Failed to log activity:', error.message);
            // Don't throw error to prevent breaking the main operation
            return false;
        }
    }

    // Get admin statistics
    async getAdminStats() {
        const cacheKey = `${this.cachePrefix}:stats:overview`;
        
        return await syncService.cacheWithRefresh(
            cacheKey,
            async () => {
                const pool = db_backoffice.getPool();
                
                const [totalAdmins] = await pool.execute(
                    'SELECT COUNT(*) as count FROM admins WHERE is_active = 1'
                );
                
                const [roleStats] = await pool.execute(
                    'SELECT role, COUNT(*) as count FROM admins WHERE is_active = 1 GROUP BY role'
                );

                const [recentLogins] = await pool.execute(
                    `SELECT COUNT(*) as count FROM admin_logs 
                     WHERE action = 'login' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
                );

                return {
                    totalAdmins: totalAdmins[0].count,
                    roleDistribution: roleStats,
                    recentLogins: recentLogins[0].count,
                    lastUpdated: new Date().toISOString()
                };
            },
            300 // 5 minutes TTL for stats
        );
    }
}

// Create singleton instance
const authSyncService = new AuthSyncService();

module.exports = authSyncService;