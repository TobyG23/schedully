const express = require('express');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Get timesheets
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { locationId, userId, startDate, endDate, status } = req.query;

    let whereClause = {};

    if (locationId) {
      whereClause.locationId = locationId;
    } else if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      whereClause.locationId = { in: userLocationIds };
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (status) {
      whereClause.status = status;
    }

    const timesheets = await prisma.timesheet.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        location: {
          select: { id: true, name: true }
        },
        shift: {
          include: {
            position: { select: { id: true, name: true, color: true } }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { clockIn: 'desc' }
      ]
    });

    res.json(timesheets);
  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({ error: 'Error al obtener registros de tiempo' });
  }
});

// Clock in
router.post('/clock-in', authMiddleware, async (req, res) => {
  try {
    const { locationId, shiftId } = req.body;

    // Verificar acceso a la ubicacion
    const hasAccess = req.user.userLocations.some(ul => ul.locationId === locationId);
    if (!hasAccess && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
    }

    // Verificar si ya hay un clock-in activo
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId: req.user.id,
        clockOut: null
      }
    });

    if (activeTimesheet) {
      return res.status(400).json({ error: 'Ya tienes un turno activo. Debes hacer clock-out primero.' });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const timesheet = await prisma.timesheet.create({
      data: {
        userId: req.user.id,
        locationId,
        shiftId: shiftId || null,
        date: today,
        clockIn: now,
        status: 'PENDING'
      },
      include: {
        location: { select: { id: true, name: true } },
        shift: {
          include: {
            position: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Actualizar estado del turno si existe
    if (shiftId) {
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.status(201).json(timesheet);
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Error al registrar entrada' });
  }
});

// Clock out
router.post('/clock-out', authMiddleware, async (req, res) => {
  try {
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId: req.user.id,
        clockOut: null
      }
    });

    if (!activeTimesheet) {
      return res.status(400).json({ error: 'No tienes un turno activo' });
    }

    const now = new Date();
    const clockIn = new Date(activeTimesheet.clockIn);
    const totalMinutes = Math.floor((now - clockIn) / (1000 * 60));

    const timesheet = await prisma.timesheet.update({
      where: { id: activeTimesheet.id },
      data: {
        clockOut: now,
        totalMinutes,
        status: 'SUBMITTED'
      },
      include: {
        location: { select: { id: true, name: true } },
        shift: {
          include: {
            position: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Actualizar estado del turno si existe
    if (activeTimesheet.shiftId) {
      await prisma.shift.update({
        where: { id: activeTimesheet.shiftId },
        data: { status: 'COMPLETED' }
      });
    }

    res.json(timesheet);
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Error al registrar salida' });
  }
});

// Start break
router.post('/break/start', authMiddleware, async (req, res) => {
  try {
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId: req.user.id,
        clockOut: null
      }
    });

    if (!activeTimesheet) {
      return res.status(400).json({ error: 'No tienes un turno activo' });
    }

    if (activeTimesheet.breakStart && !activeTimesheet.breakEnd) {
      return res.status(400).json({ error: 'Ya estas en descanso' });
    }

    const timesheet = await prisma.timesheet.update({
      where: { id: activeTimesheet.id },
      data: {
        breakStart: new Date(),
        breakEnd: null
      }
    });

    res.json(timesheet);
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({ error: 'Error al iniciar descanso' });
  }
});

// End break
router.post('/break/end', authMiddleware, async (req, res) => {
  try {
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId: req.user.id,
        clockOut: null,
        breakStart: { not: null },
        breakEnd: null
      }
    });

    if (!activeTimesheet) {
      return res.status(400).json({ error: 'No tienes un descanso activo' });
    }

    const timesheet = await prisma.timesheet.update({
      where: { id: activeTimesheet.id },
      data: {
        breakEnd: new Date()
      }
    });

    res.json(timesheet);
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({ error: 'Error al terminar descanso' });
  }
});

// Get current status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const activeTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId: req.user.id,
        clockOut: null
      },
      include: {
        location: { select: { id: true, name: true } },
        shift: {
          include: {
            position: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!activeTimesheet) {
      return res.json({ status: 'NOT_CLOCKED_IN', timesheet: null });
    }

    let status = 'CLOCKED_IN';
    if (activeTimesheet.breakStart && !activeTimesheet.breakEnd) {
      status = 'ON_BREAK';
    }

    res.json({ status, timesheet: activeTimesheet });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
});

// Approve timesheet
router.post('/:id/approve', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: req.params.id }
    });

    if (!timesheet) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const updated = await prisma.timesheet.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Approve timesheet error:', error);
    res.status(500).json({ error: 'Error al aprobar registro' });
  }
});

// Reject timesheet
router.post('/:id/reject', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
  try {
    const { reason } = req.body;

    const timesheet = await prisma.timesheet.findUnique({
      where: { id: req.params.id }
    });

    if (!timesheet) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const updated = await prisma.timesheet.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        notes: reason
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Reject timesheet error:', error);
    res.status(500).json({ error: 'Error al rechazar registro' });
  }
});

module.exports = router;
