const db_backoffice = require('./db_backoffice');
const bcrypt = require('bcryptjs');

class AdminModel {
  // Find one admin by criteria (supports { email, id })
  static async findOne(conditions = {}) {
    const pool = db_backoffice.getPool();
    let query = 'SELECT * FROM admins WHERE ';
    let params = [];

    if (conditions.email) {
      query += 'email = ? AND is_active = "1" LIMIT 1';
      params.push(conditions.email);
    } else if (conditions.id) {
      query += 'id = ? AND is_active = "1" LIMIT 1';
      params.push(conditions.id);
    } else {
      return null;
    }

    try {
      const [rows] = await pool.execute(query, params);
      const row = rows[0];
      if (!row) return null;
      // attach helper methods to the returned object
      return AdminModel._attachInstanceMethods(row);
    } catch (error) {
      console.error('Error finding admin:', error);
      throw error;
    }
  }

  // Create new admin
  static async create(adminData) {
    const pool = db_backoffice.getPool();
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    const query = `
      INSERT INTO admins (email, password, role, is_active, created_at, updated_at) 
      VALUES (?, ?, ? , "active", NOW(), NOW())
    `;
    
    try {
      const [result] = await pool.execute(query, [
        adminData.email,
        hashedPassword,
        adminData.role || 'admin'
      ]);
      
      return await AdminModel.findOne({ id: result.insertId });
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  static _attachInstanceMethods(row) {
    // Role-based permissions mapping
    const rolePermissions = {
      'super_admin': ['*'], // Super admin has all permissions
      'admin': ['user_management', 'game_management', 'reports', 'admin_management'],
      'moderator': ['user_management', 'reports'],
      'viewer': ['reports']
    };

    // Provide an object with properties from the row and instance methods
    return {
      id: row.id,
      email: row.email,
      password: row.password, // Keep original property name for compatibility
      passwordHash: row.password,
      role: row.role || 'admin',
      status: row.is_active, // Map is_active to status for compatibility
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,

      // compare provided password with stored hash
      comparePassword: async function (plain) {
        return bcrypt.compare(plain, this.passwordHash);
      },

      // Check if admin has specific role
      hasRole: function(role) {
        return this.role === role;
      },

      // Check if admin has specific permission
      hasPermission: function(permission) {
        const userPermissions = rolePermissions[this.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
      },

      // Get safe object without password
      toSafeObject: function() {
        return {
          id: this.id,
          email: this.email,
          role: this.role,
          status: this.status,
          created_at: this.created_at,
          updated_at: this.updated_at
        };
      },

      // JSON serialization without password
      toJSON: function () {
        return this.toSafeObject();
      },

      // Update admin data
      update: async function(updateData) {
        const pool = db_backoffice.getPool();
        let setClause = [];
        let params = [];

        if (updateData.email) {
          setClause.push('email = ?');
          params.push(updateData.email);
        }
        if (updateData.role) {
          setClause.push('role = ?');
          params.push(updateData.role);
        }
        if (updateData.password) {
          const hashedPassword = await bcrypt.hash(updateData.password, 10);
          setClause.push('password = ?');
          params.push(hashedPassword);
        }

        setClause.push('updated_at = NOW()');
        params.push(this.id);

        const query = `UPDATE admins SET ${setClause.join(', ')} WHERE id = ?`;

        try {
          await pool.execute(query, params);
          return await AdminModel.findOne({ id: this.id });
        } catch (error) {
          console.error('Error updating admin:', error);
          throw error;
        }
      }
    };
  }
}

module.exports = AdminModel;
