const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Crear la empresa (panaderia)
  const company = await prisma.company.create({
    data: {
      name: 'Panaderia El Buen Pan',
      address: 'Av. Principal #123, Ciudad',
      phone: '+52 555 123 4567',
      email: 'contacto@elbuenpan.com',
      timezone: 'America/Mexico_City',
      currency: 'MXN',
    },
  });

  console.log('Company created:', company.name);

  // Crear las 9 sucursales (1 central + 8 sucursales)
  const locationsData = [
    { name: 'Central', address: 'Av. Principal #123', isHeadquarters: true },
    { name: 'Sucursal Norte', address: 'Calle Norte #456' },
    { name: 'Sucursal Sur', address: 'Calle Sur #789' },
    { name: 'Sucursal Este', address: 'Calle Este #101' },
    { name: 'Sucursal Oeste', address: 'Calle Oeste #202' },
    { name: 'Sucursal Centro', address: 'Calle Centro #303' },
    { name: 'Sucursal Plaza', address: 'Plaza Comercial #404' },
    { name: 'Sucursal Mall', address: 'Centro Comercial #505' },
    { name: 'Sucursal Express', address: 'Terminal #606' },
  ];

  const locations = [];
  for (const loc of locationsData) {
    const location = await prisma.location.create({
      data: {
        companyId: company.id,
        name: loc.name,
        address: loc.address,
        phone: '+52 555 000 0000',
        isHeadquarters: loc.isHeadquarters || false,
      },
    });
    locations.push(location);
    console.log('Location created:', location.name);
  }

  // Crear posiciones
  const positionsData = [
    { name: 'Panadero', color: '#EF4444', hourlyRate: 150 },
    { name: 'Cajero', color: '#3B82F6', hourlyRate: 120 },
    { name: 'Atención al Cliente', color: '#10B981', hourlyRate: 110 },
    { name: 'Limpieza', color: '#F59E0B', hourlyRate: 100 },
    { name: 'Supervisor', color: '#8B5CF6', hourlyRate: 200 },
    { name: 'Repartidor', color: '#EC4899', hourlyRate: 130 },
  ];

  const positions = [];
  for (const pos of positionsData) {
    const position = await prisma.position.create({
      data: {
        companyId: company.id,
        name: pos.name,
        color: pos.color,
        hourlyRate: pos.hourlyRate,
      },
    });
    positions.push(position);
    console.log('Position created:', position.name);
  }

  // Crear usuario Super Admin (puede ver todo)
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@elbuenpan.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Principal',
      phone: '+52 555 111 1111',
      role: 'SUPER_ADMIN',
      canViewAll: true,
    },
  });

  // Asignar super admin a la central
  await prisma.userLocation.create({
    data: {
      userId: superAdmin.id,
      locationId: locations[0].id, // Central
      isPrimary: true,
    },
  });

  console.log('Super Admin created:', superAdmin.email);

  // Crear managers para cada sucursal
  for (let i = 0; i < locations.length; i++) {
    const manager = await prisma.user.create({
      data: {
        companyId: company.id,
        email: `manager.${locations[i].name.toLowerCase().replace(/\s+/g, '')}@elbuenpan.com`,
        password: hashedPassword,
        firstName: `Manager`,
        lastName: locations[i].name,
        role: 'MANAGER',
        canViewAll: locations[i].isHeadquarters, // Solo central puede ver todo
      },
    });

    await prisma.userLocation.create({
      data: {
        userId: manager.id,
        locationId: locations[i].id,
        isPrimary: true,
      },
    });

    // Asignar posicion de supervisor
    await prisma.userPosition.create({
      data: {
        userId: manager.id,
        positionId: positions[4].id, // Supervisor
      },
    });

    console.log('Manager created for:', locations[i].name);
  }

  // Crear algunos empleados de ejemplo para cada sucursal
  const employeeNames = [
    { firstName: 'Juan', lastName: 'Perez' },
    { firstName: 'Maria', lastName: 'Garcia' },
    { firstName: 'Carlos', lastName: 'Lopez' },
    { firstName: 'Ana', lastName: 'Martinez' },
    { firstName: 'Pedro', lastName: 'Sanchez' },
  ];

  for (const location of locations) {
    for (let i = 0; i < 3; i++) {
      const empName = employeeNames[i % employeeNames.length];
      const employee = await prisma.user.create({
        data: {
          companyId: company.id,
          email: `${empName.firstName.toLowerCase()}.${empName.lastName.toLowerCase()}.${location.name.toLowerCase().replace(/\s+/g, '')}@elbuenpan.com`,
          password: hashedPassword,
          firstName: empName.firstName,
          lastName: empName.lastName,
          role: 'EMPLOYEE',
        },
      });

      await prisma.userLocation.create({
        data: {
          userId: employee.id,
          locationId: location.id,
          isPrimary: true,
        },
      });

      // Asignar posicion aleatoria
      await prisma.userPosition.create({
        data: {
          userId: employee.id,
          positionId: positions[i % 4].id,
        },
      });
    }
    console.log('Employees created for:', location.name);
  }

  // Crear algunos turnos de ejemplo para la semana actual
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Domingo

  for (const location of locations.slice(0, 3)) { // Solo primeras 3 sucursales para demo
    const locationUsers = await prisma.userLocation.findMany({
      where: { locationId: location.id },
      include: { user: { include: { userPositions: true } } },
    });

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const shiftDate = new Date(startOfWeek);
      shiftDate.setDate(startOfWeek.getDate() + dayOffset);

      for (const ul of locationUsers.slice(0, 2)) {
        if (ul.user.userPositions.length > 0) {
          await prisma.shift.create({
            data: {
              locationId: location.id,
              userId: ul.userId,
              positionId: ul.user.userPositions[0].positionId,
              date: shiftDate,
              startTime: new Date('1970-01-01T08:00:00'),
              endTime: new Date('1970-01-01T16:00:00'),
              breakMinutes: 60,
              status: 'SCHEDULED',
              isPublished: true,
            },
          });
        }
      }
    }
    console.log('Shifts created for:', location.name);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
