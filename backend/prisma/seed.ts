import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample courts in Evanston
  const courts = await Promise.all([
    prisma.court.create({
      data: {
        name: 'Burnham Shores Park',
        address: '1300 E. Lake Shore Drive, Evanston, IL',
        latitude: new Prisma.Decimal(42.0447),
        longitude: new Prisma.Decimal(-87.6774),
        description: 'Lakefront park with basketball and pickleball courts',
        basketballCourts: 2,
        pickleballCourts: 4,
        hasLighting: true,
        restroomsAvailable: true,
        parkingAvailable: true,
        operatingHoursStart: '06:00',
        operatingHoursEnd: '22:00',
        permitRequired: true,
        contactPhone: '(847) 448-8250',
        evastonParksUrl: 'https://www.cityofevanston.org/government/departments/parks-recreation',
      },
    }),
    prisma.court.create({
      data: {
        name: 'Dawes Park',
        address: '1475 Ashland Avenue, Evanston, IL',
        latitude: new Prisma.Decimal(42.0337),
        longitude: new Prisma.Decimal(-87.6895),
        description: 'Community park with pickleball courts',
        basketballCourts: 1,
        pickleballCourts: 3,
        hasLighting: false,
        restroomsAvailable: true,
        parkingAvailable: true,
        operatingHoursStart: '07:00',
        operatingHoursEnd: '20:00',
        permitRequired: true,
        contactPhone: '(847) 448-8250',
      },
    }),
    prisma.court.create({
      data: {
        name: 'Lee Street Park',
        address: '1500 Lee Street, Evanston, IL',
        latitude: new Prisma.Decimal(42.0285),
        longitude: new Prisma.Decimal(-87.7012),
        description: 'Neighborhood park with basketball courts',
        basketballCourts: 3,
        pickleballCourts: 0,
        hasLighting: true,
        restroomsAvailable: false,
        parkingAvailable: true,
        operatingHoursStart: '08:00',
        operatingHoursEnd: '21:00',
        permitRequired: true,
        contactPhone: '(847) 448-8250',
      },
    }),
  ]);

  console.log(`Created ${courts.length} courts`);

  // Create sample users
  const hashedPassword = await import('bcryptjs').then((bcrypt) =>
    bcrypt.hash('password123', 10)
  );

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        username: 'alice_baller',
        passwordHash: hashedPassword,
        fullName: 'Alice Johnson',
        skillLevel: 'advanced',
        bio: 'Loves basketball and pickleball',
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        username: 'bob_hoops',
        passwordHash: hashedPassword,
        fullName: 'Bob Smith',
        skillLevel: 'intermediate',
        bio: 'Just getting into pickup games',
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  console.log('Seed completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
