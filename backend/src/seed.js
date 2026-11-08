require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Equipment, Reservation } = require('./models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Clear existing seed data
    await Reservation.destroy({ where: {}, force: true });
    await Equipment.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });
    console.log('🗑️  Cleared existing data');

    // Create users
    const adminPass = await bcrypt.hash('admin123', 12);
    const ownerPass = await bcrypt.hash('owner123', 12);
    const farmerPass = await bcrypt.hash('farmer123', 12);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@agrirent.com',
      password: adminPass,
      role: 'admin',
      phone: '09000000001',
      address: 'Cagayan de Oro City',
    }, { hooks: false }); // skip hash hook since already hashed

    const owner = await User.create({
      name: 'Juan dela Cruz',
      email: 'owner@agrirent.com',
      password: ownerPass,
      role: 'owner',
      phone: '09000000002',
      address: 'Bukidnon, Philippines',
    }, { hooks: false });

    const farmer = await User.create({
      name: 'Maria Santos',
      email: 'farmer@agrirent.com',
      password: farmerPass,
      role: 'farmer',
      phone: '09000000003',
      address: 'Misamis Oriental, Philippines',
    }, { hooks: false });

    console.log('👥 Users created');

    // Create equipment
    await Equipment.bulkCreate([
      {
        ownerId: owner.id,
        name: 'John Deere Tractor 5075E',
        category: 'tractor',
        description: 'Powerful 75HP tractor suitable for rice and corn fields. Well maintained with complete attachments.',
        dailyRate: 2500.00,
        images: [],
        specifications: { horsepower: '75HP', fuelType: 'Diesel', year: 2020 },
        status: 'available',
        location: 'Bukidnon, Philippines',
      },
      {
        ownerId: owner.id,
        name: 'Kubota L3408 Cultivator',
        category: 'cultivator',
        description: 'Compact cultivator ideal for small to medium farms. Great for soil preparation.',
        dailyRate: 1500.00,
        images: [],
        specifications: { horsepower: '34HP', fuelType: 'Diesel', year: 2019 },
        status: 'available',
        location: 'Cagayan de Oro, Philippines',
      },
      {
        ownerId: owner.id,
        name: 'Yanmar Combine Harvester',
        category: 'harvester',
        description: 'Efficient rice harvester with minimal grain loss. Suitable for wet and dry conditions.',
        dailyRate: 4000.00,
        images: [],
        specifications: { capacity: '1.5 ha/day', fuelType: 'Diesel', year: 2021 },
        status: 'available',
        location: 'Bukidnon, Philippines',
      },
      {
        ownerId: owner.id,
        name: 'Honda Power Sprayer',
        category: 'sprayer',
        description: 'High-pressure sprayer for pesticides and fertilizers. Covers large areas quickly.',
        dailyRate: 800.00,
        images: [],
        specifications: { tankCapacity: '200L', engine: 'Honda 5.5HP', year: 2022 },
        status: 'available',
        location: 'Misamis Oriental, Philippines',
      },
      {
        ownerId: owner.id,
        name: 'Rice Transplanter 6-Row',
        category: 'planter',
        description: '6-row rice transplanter that reduces labor costs significantly.',
        dailyRate: 3000.00,
        images: [],
        specifications: { rows: 6, fuelType: 'Gasoline', year: 2020 },
        status: 'available',
        location: 'Bukidnon, Philippines',
      },
    ]);

    console.log('🚜 Equipment created');
    console.log('\n✅ Seed complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Demo Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ADMIN   → admin@agrirent.com  / admin123');
    console.log('  OWNER   → owner@agrirent.com  / owner123');
    console.log('  FARMER  → farmer@agrirent.com / farmer123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
