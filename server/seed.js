/**
 * Database Seeder Script
 * Run: node seed.js
 * Creates default Admin, Professor, and Student accounts for testing
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';

dotenv.config();

const SEED_USERS = [
  {
    name: 'Dr. Admin CSE',
    email: 'admin@cse.edu',
    password: 'admin123',
    role: 'Admin',
    identifier: 'ADM001',
    department: 'CSE',
  },
  {
    name: 'Prof. Rajesh Kumar',
    email: 'prof@cse.edu',
    password: 'prof123',
    role: 'Professor',
    identifier: 'EMP101',
    department: 'CSE',
  },
  {
    name: 'Priya Sharma',
    email: 'student@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2022001',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Aarav Patel',
    email: 'aarav@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2022002',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Sneha Desai',
    email: 'sneha@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2022003',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Prof. Anita Joshi',
    email: 'anita@cse.edu',
    password: 'prof123',
    role: 'Professor',
    identifier: 'EMP102',
    department: 'CSE',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Create seed users
    for (const userData of SEED_USERS) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created ${userData.role}: ${userData.name} (${userData.email})`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('  Admin    : admin@cse.edu / admin123');
    console.log('  Professor: prof@cse.edu / prof123');
    console.log('  Student  : student@cse.edu / student123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seed();
