require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infrareport';

if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI is not set in environment variables. Falling back to default: mongodb://localhost:27017/infrareport');
}

// User Schema (simplified for script)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Admin details
    const adminEmail = 'admin@infrareport.com';
    const adminPassword = 'admin123';
    const adminName = 'System Admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', adminEmail);
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isApproved: true,
      isActive: true,
    });

    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Role:', admin.role);
    console.log('\n⚠️  Please change the password after first login!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating admin user:', error);
    await mongoose.disconnect();
  }
}

createAdminUser();
