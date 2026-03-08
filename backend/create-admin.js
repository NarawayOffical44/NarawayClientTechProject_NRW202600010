/**
 * Script to create admin user in MongoDB
 * Run: node create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');

async function createAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✓ Connected to MongoDB');

    // Check if admin exists
    const existing = await User.findOne({ email: 'admin@test.com' });
    if (existing) {
      console.log('✗ Admin already exists');
      process.exit(0);
    }

    // Hash password
    const password = 'Test@123456';
    const hashed = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await User.create({
      user_id: 'usr_admin_master_001',
      name: 'Admin User',
      email: 'admin@test.com',
      password: hashed,
      role: 'admin',
      company: 'Renergizr Admin',
      is_active: true,
    });

    console.log('✓ Admin user created successfully');
    console.log('  Email: admin@test.com');
    console.log('  Password: Test@123456');
    console.log('  Role: admin');

    process.exit(0);
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
