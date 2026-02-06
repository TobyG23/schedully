const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/setup - Inicializar base de datos (ELIMINAR DESPUES DE USAR)
router.get('/', async (req, res) => {
  try {
    // Verificar si ya existe data
    const existingCompany = await prisma.company.findFirst();
    if (existingCompany) {
      return res.json({
        message: 'La base de datos ya está inicializada',
        admin: 'admin@schedully.online'
      });
    }

    // Crear empresa
    const company = await prisma.company.create({
      data: {
        name: 'Mi Empresa',
        email: 'admin@schedully.online',
        timezone: 'America/Mexico_City'
      }
    });

    // Crear sucursal principal
    const location = await prisma.location.create({
      data: {
        companyId: company.id,
        name: 'Sucursal Principal',
        isHeadquarters: true,
        timezone: 'America/Mexico_City'
      }
    });

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        companyId: company.id,
        email: 'admin@schedully.online',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Sistema',
        role: 'SUPER_ADMIN',
        canViewAll: true,
        userLocations: {
          create: {
            locationId: location.id,
            isPrimary: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      data: {
        company: company.name,
        location: location.name,
        admin: {
          email: 'admin@schedully.online',
          password: 'admin123'
        }
      },
      warning: 'IMPORTANTE: Elimina el archivo setup.routes.js despues de usar!'
    });

  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      error: 'Error durante la configuracion',
      details: error.message
    });
  }
});

module.exports = router;
