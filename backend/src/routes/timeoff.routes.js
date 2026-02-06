const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Get time off requests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, userId } = req.query;

    let whereClause = {};

    // Empleados solo ven sus propias solicitudes
    if (req.user.role === 'EMPLOYEE') {
      whereClause.userId = req.user.id;
    } else if (userId) {
      whereClause.userId = userId;
    } else if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      // Managers/supervisors ven solicitudes de sus ubicaciones
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      whereClause.user = {
        userLocations: {
          some: { locationId: { in: userLocationIds } }
        }
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const requests = await prisma.timeOffRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            userLocations: {
              include: { location: { select: { id: true, name: true } } },
              where: { isPrimary: true }
            }
          }
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(requests);
  } catch (error) {
    console.error('Get time off requests error:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Get pending requests count
router.get('/pending-count', authMiddleware, async (req, res) => {
  try {
    let whereClause = { status: 'PENDING' };

    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      whereClause.user = {
        userLocations: {
          some: { locationId: { in: userLocationIds } }
        }
      };
    }

    const count = await prisma.timeOffRequest.count({
      where: whereClause
    });

    res.json({ count });
  } catch (error) {
    console.error('Get pending count error:', error);
    res.status(500).json({ error: 'Error al obtener conteo' });
  }
});

// Create time off request
router.post('/', authMiddleware, [
  body('type').notEmpty().withMessage('Tipo de solicitud requerido'),
  body('startDate').notEmpty().withMessage('Fecha de inicio requerida'),
  body('endDate').notEmpty().withMessage('Fecha de fin requerida'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, startDate, endDate, reason } = req.body;

    // Validar que la fecha de fin no sea antes que la de inicio
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });
    }

    // Verificar si hay conflictos con turnos existentes
    const conflictingShifts = await prisma.shift.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });

    const request = await prisma.timeOffRequest.create({
      data: {
        userId: req.user.id,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    res.status(201).json({
      ...request,
      hasConflicts: conflictingShifts.length > 0,
      conflictingShiftsCount: conflictingShifts.length
    });
  } catch (error) {
    console.error('Create time off request error:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

// Approve request
router.post('/:id/approve', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
  try {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          include: {
            userLocations: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Solo se pueden aprobar solicitudes pendientes' });
    }

    // Verificar que el usuario puede aprobar (tiene acceso a la ubicacion)
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      const requestUserLocationIds = request.user.userLocations.map(ul => ul.locationId);

      const hasAccess = requestUserLocationIds.some(id => userLocationIds.includes(id));
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes permiso para aprobar esta solicitud' });
      }
    }

    const updated = await prisma.timeOffRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.id,
        approvedAt: new Date()
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Cancelar turnos en el rango de fechas
    await prisma.shift.updateMany({
      where: {
        userId: request.userId,
        date: {
          gte: request.startDate,
          lte: request.endDate
        }
      },
      data: { status: 'CANCELLED' }
    });

    res.json(updated);
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
});

// Reject request
router.post('/:id/reject', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
  try {
    const { reason } = req.body;

    const request = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Solo se pueden rechazar solicitudes pendientes' });
    }

    const updated = await prisma.timeOffRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
});

// Cancel own request
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (request.userId !== req.user.id) {
      return res.status(403).json({ error: 'Solo puedes cancelar tus propias solicitudes' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Solo se pueden cancelar solicitudes pendientes' });
    }

    const updated = await prisma.timeOffRequest.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    res.json(updated);
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
});

module.exports = router;
