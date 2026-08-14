/**
 * Seed Script - Populate initial categories and sample data
 * 
 * Run: npx tsx scripts/seed.ts
 * (Install tsx first: npm install -D tsx)
 */

import connectDB from '../lib/mongodb';
import Category from '../models/Category';
import Municipality from '../models/Municipality';

const categories = [
  { 
    name: 'Potholes', 
    icon: '🕳️', 
    color: '#ef4444',
    description: 'Road damage, potholes, and craters'
  },
  { 
    name: 'Street Lights', 
    icon: '💡', 
    color: '#f59e0b',
    description: 'Broken or non-functional street lights'
  },
  { 
    name: 'Water Supply', 
    icon: '💧', 
    color: '#3b82f6',
    description: 'Water leaks, shortage, or quality issues'
  },
  { 
    name: 'Drainage', 
    icon: '🚰', 
    color: '#06b6d4',
    description: 'Clogged drains, flooding, sewage issues'
  },
  { 
    name: 'Garbage Collection', 
    icon: '🗑️', 
    color: '#10b981',
    description: 'Waste management and garbage disposal'
  },
  { 
    name: 'Roads & Pavements', 
    icon: '🛣️', 
    color: '#8b5cf6',
    description: 'Road surface, sidewalks, and pedestrian paths'
  },
  { 
    name: 'Parks & Gardens', 
    icon: '🌳', 
    color: '#22c55e',
    description: 'Public parks, green spaces, and gardens'
  },
  { 
    name: 'Public Transport', 
    icon: '🚌', 
    color: '#f97316',
    description: 'Bus stops, shelters, and transport facilities'
  },
  { 
    name: 'Traffic Signals', 
    icon: '🚦', 
    color: '#eab308',
    description: 'Traffic lights and road signs'
  },
  { 
    name: 'Public Buildings', 
    icon: '🏢', 
    color: '#64748b',
    description: 'Government buildings and public facilities'
  },
];

const sampleMunicipalities = [
  {
    name: 'Bangalore Municipal Corporation',
    code: 'BMC',
    state: 'Karnataka',
    country: 'India',
    areas: ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5'],
    contactEmail: 'contact@bmc.gov.in',
    contactPhone: '+91-80-12345678',
  },
  {
    name: 'Delhi Municipal Corporation',
    code: 'DMC',
    state: 'Delhi',
    country: 'India',
    areas: ['Zone A', 'Zone B', 'Zone C', 'Zone D'],
    contactEmail: 'contact@dmc.gov.in',
    contactPhone: '+91-11-12345678',
  },
];

async function seed() {
  try {
    console.log('🌱 Starting seed process...\n');
    
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    // Seed Categories
    console.log('📋 Seeding categories...');
    let categoryCount = 0;
    for (const cat of categories) {
      const result = await Category.findOneAndUpdate(
        { name: cat.name },
        cat,
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${cat.icon} ${cat.name}`);
      categoryCount++;
    }
    console.log(`✅ Seeded ${categoryCount} categories\n`);
    
    // Seed Municipalities
    console.log('🏛️ Seeding municipalities...');
    let municipalityCount = 0;
    for (const muni of sampleMunicipalities) {
      const result = await Municipality.findOneAndUpdate(
        { code: muni.code },
        muni,
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${muni.name} (${muni.code})`);
      municipalityCount++;
    }
    console.log(`✅ Seeded ${municipalityCount} municipalities\n`);
    
    console.log('🎉 Seed completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Sign up as a user');
    console.log('  3. Start reporting issues!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed
seed();
