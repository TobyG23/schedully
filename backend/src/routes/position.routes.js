const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Get all positions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const positions = await prisma.position.findMany({
      where: {
        companyId: req.companyId,
        isActive: true
      },
      include: {
        _count: {
          select: { userPositions: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(positions);
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ error: 'Error al obtener posiciones' });
  }
});

// Get single position
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const position = await prisma.position.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      },
      include: {
        userPositions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!position) {
      return res.status(404).json({ error: 'Posicion no encontrada' });
    }

    res.json(position);
  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({ error: 'Error al obtener posicion' });
  }
});

// Create position
router.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), [
  body('name').notEmpty().withMessage('Nombre requerido'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, color, hourlyRate } = req.body;

    const position = await prisma.position.create({
      data: {
        companyId: req.companyId,
        name,
        description,
        color: color || '#3B82F6',
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null
      }
    });

    res.status(201).json(position);
  } catch (error) {
    console.error('Create position error:', error);
    res.status(500).json({ error: 'Error al crear posicion' });
  }
});

// Update position
router.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name, description, color, hourlyRate, isActive } = req.body;

    const existingPosition = await prisma.position.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      }
    });

    if (!existingPosition) {
      return res.status(404).json({ error: 'Posicion no encontrada' });
    }

    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        color,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        isActive
      }
    });

    res.json(position);
  } catch (error) {
    console.error('Update position error:', error);
    res.status(500).json({ error: 'Error al actualizar posicion' });
  }
});

// Delete position
router.delete('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const existingPosition = await prisma.position.findFirst({
      where: {
        id: req.params.id,
        companyId: req.companyId
      }
    });

    if (!existingPosition) {
      return res.status(404).json({ error: 'Posicion no encontrada' });
    }

    // Soft delete
    await prisma.position.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'Posicion desactivada correctamente' });
  } catch (error) {
    console.error('Delete position error:', error);
    res.status(500).json({ error: 'Error al eliminar posicion' });
  }
});

module.exports = router;
