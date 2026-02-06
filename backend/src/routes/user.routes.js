const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all users (filtered by location access)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { locationId, role, isActive } = req.query;

    let whereClause = {
      companyId: req.companyId
    };

    // Filtrar por rol
    if (role) {
      whereClause.role = role;
    }

    // Filtrar por estado
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    // Si no es super admin o no puede ver todo, filtrar por ubicaciones
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      whereClause.userLocations = {
        some: {
          locationId: { in: userLocationIds }
        }
      };
    }

    // Filtrar por ubicacion especifica
    if (locationId) {
      whereClause.userLocations = {
        some: { locationId }
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        userLocations: {
          include: { location: true }
        },
        userPositions: {
          include: { position: true }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    // Remover passwords
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);

    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Get single user
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      },
      include: {
        userLocations: {
          include: { location: true }
        },
        userPositions: {
          include: { position: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Create user
router.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), [
  body('email').isEmail().withMessage('Email invalido'),
  body('firstName').notEmpty().withMessage('Nombre requerido'),
  body('lastName').notEmpty().withMessage('Apellido requerido'),
  body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
  body('locationIds').isArray({ min: 1 }).withMessage('Debe asignar al menos una sucursal')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstName, lastName, password, phone, pin, role, locationIds, positionIds, canViewAll } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El email ya esta registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Determinar el rol permitido basado en quien crea
    let allowedRole = role || 'EMPLOYEE';
    if (req.user.role === 'MANAGER') {
      // Managers solo pueden crear empleados y supervisores
      if (!['EMPLOYEE', 'SUPERVISOR'].includes(allowedRole)) {
        allowedRole = 'EMPLOYEE';
      }
    }

    const user = await prisma.user.create({
      data: {
        companyId: req.companyId,
        email,
        firstName,
        lastName,
        password: hashedPassword,
        phone,
        pin: pin || null,
        role: allowedRole,
        canViewAll: canViewAll && req.user.role === 'SUPER_ADMIN',
        userLocations: {
          create: locationIds.map((locationId, index) => ({
            locationId,
            isPrimary: index === 0
          }))
        },
        userPositions: positionIds ? {
          create: positionIds.map(positionId => ({ positionId }))
        } : undefined
      },
      include: {
        userLocations: {
          include: { location: true }
        },
        userPositions: {
          include: { position: true }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Update user
router.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { firstName, lastName, phone, pin, role, isActive, locationIds, positionIds, canViewAll } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar usuario
    const updateData = {
      firstName,
      lastName,
      phone,
      isActive,
      pin: pin !== undefined ? (pin || null) : undefined
    };

    // Solo super admin puede cambiar roles y canViewAll
    if (req.user.role === 'SUPER_ADMIN') {
      if (role) updateData.role = role;
      if (canViewAll !== undefined) updateData.canViewAll = canViewAll;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        userLocations: {
          include: { location: true }
        },
        userPositions: {
          include: { position: true }
        }
      }
    });

    // Actualizar ubicaciones si se proporcionaron
    if (locationIds) {
      await prisma.userLocation.deleteMany({
        where: { userId: req.params.id }
      });

      await prisma.userLocation.createMany({
        data: locationIds.map((locationId, index) => ({
          userId: req.params.id,
          locationId,
          isPrimary: index === 0
        }))
      });
    }

    // Actualizar posiciones si se proporcionaron
    if (positionIds) {
      await prisma.userPosition.deleteMany({
        where: { userId: req.params.id }
      });

      await prisma.userPosition.createMany({
        data: positionIds.map(positionId => ({
          userId: req.params.id,
          positionId
        }))
      });
    }

    // Obtener usuario actualizado con relaciones
    const updatedUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        userLocations: {
          include: { location: true }
        },
        userPositions: {
          include: { position: true }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Delete user (soft delete - set inactive)
router.delete('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir eliminarse a si mismo
    if (existingUser.id === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
