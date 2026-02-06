const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all locations
router.get('/', authMiddleware, async (req, res) => {
  try {
    let whereClause = {
      companyId: req.companyId
    };

    // Si no es super admin y no puede ver todo, filtrar por ubicaciones asignadas
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      whereClause.id = { in: userLocationIds };
    }

    const locations = await prisma.location.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            userLocations: true,
            shifts: true
          }
        }
      },
      orderBy: [
        { isHeadquarters: 'desc' },
        { name: 'asc' }
      ]
    });

    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
});

// Get single location with stats
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const location = await prisma.location.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      },
      include: {
        userLocations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true
              }
            }
          }
        },
        _count: {
          select: {
            shifts: true,
            timesheets: true
          }
        }
      }
    });

    if (!location) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Error al obtener sucursal' });
  }
});

// Create location
router.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), [
  body('name').notEmpty().withMessage('Nombre requerido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, phone, email, timezone, isHeadquarters } = req.body;

    // Si se marca como central, desmarcar otras
    if (isHeadquarters) {
      await prisma.location.updateMany({
        where: { companyId: req.companyId },
        data: { isHeadquarters: false }
      });
    }

    const location = await prisma.location.create({
      data: {
        companyId: req.companyId,
        name,
        address,
        phone,
        email,
        timezone: timezone || 'America/Mexico_City',
        isHeadquarters: isHeadquarters || false
      }
    });

    res.status(201).json(location);
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Error al crear sucursal' });
  }
});

// Update location
router.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, address, phone, email, timezone, isHeadquarters, isActive } = req.body;

    const existingLocation = await prisma.location.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      }
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    // Si se marca como central, desmarcar otras
    if (isHeadquarters) {
      await prisma.location.updateMany({
        where: {
          companyId: req.companyId,
          id: { not: req.params.id }
        },
        data: { isHeadquarters: false }
      });
    }

    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        phone,
        email,
        timezone,
        isHeadquarters,
        isActive
      }
    });

    res.json(location);
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Error al actualizar sucursal' });
  }
});

// Delete location
router.delete('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const existingLocation = await prisma.location.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      }
    });

    if (!existingLocation) {
      return res.status(404).json({ error: 'Sucursal no encontrada' });
    }

    if (existingLocation.isHeadquarters) {
      return res.status(400).json({ error: 'No puedes eliminar la sucursal central' });
    }

    // Soft delete
    await prisma.location.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Sucursal desactivada correctamente' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Error al eliminar sucursal' });
  }
});

module.exports = router;
