const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { authMiddleware, requireRole, requireLocationAccess } = require('../middleware/auth.middleware');

const router = express.Router();

// Helper para parsear fechas sin problemas de timezone
// MySQL DATE espera formato YYYY-MM-DD, Prisma lo acepta como string
const parseLocalDate = (dateStr, forQuery = false) => {
  // Validar formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  if (forQuery) {
    // Para queries (filtros gte/lte): usar inicio del día UTC para incluir todos los registros del día
    return new Date(`${dateStr}T00:00:00.000Z`);
  }
  // Para guardar datos: usar mediodía UTC para evitar problemas de timezone
  return new Date(`${dateStr}T12:00:00.000Z`);
};

// Get shifts (with filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { locationId, userId, startDate, endDate, status, isPublished } = req.query;

    let whereClause = {};

    // Filtrar por ubicacion
    if (locationId) {
      whereClause.locationId = locationId;
    } else if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      // Si no es super admin, solo ver turnos de sus ubicaciones
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      whereClause.locationId = { in: userLocationIds };
    }

    // Filtrar por usuario
    if (userId) {
      whereClause.userId = userId;
    }

    // Filtrar por rango de fechas (usar forQuery=true para incluir todos los registros del día)
    if (startDate && endDate) {
      whereClause.date = {
        gte: parseLocalDate(startDate, true),
        lte: new Date(`${endDate}T23:59:59.999Z`) // Fin del día para incluir todo
      };
    } else if (startDate) {
      whereClause.date = { gte: parseLocalDate(startDate, true) };
    } else if (endDate) {
      whereClause.date = { lte: new Date(`${endDate}T23:59:59.999Z`) };
    }

    // Filtrar por estado
    if (status) {
      whereClause.status = status;
    }

    // Filtrar por publicado
    if (isPublished !== undefined) {
      whereClause.isPublished = isPublished === 'true';
    }

    const shifts = await prisma.shift.findMany({
      where: whereClause,
      include: {
        location: {
          select: { id: true, name: true }
        },
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        },
        position: {
          select: { id: true, name: true, color: true }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    res.json(shifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
});

// Get single shift
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
        },
        position: true,
        timesheet: true
      }
    });

    if (!shift) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    res.json(shift);
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({ error: 'Error al obtener turno' });
  }
});

// Create shift
router.post('/', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), [
  body('locationId').notEmpty().withMessage('Sucursal requerida'),
  body('date').notEmpty().withMessage('Fecha requerida'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      locationId, userId, positionId, date, startTime, endTime,
      breakMinutes, notes, isOpenShift, isDayOff, dayOffType, isPaid
    } = req.body;

    // Verificar que el usuario tiene acceso a la ubicacion
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const hasAccess = req.user.userLocations.some(ul => ul.locationId === locationId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
      }
    }

    // Preparar datos segun si es dia libre o turno normal
    const shiftData = {
      locationId,
      userId: isOpenShift ? null : userId,
      date: parseLocalDate(date),
      notes,
      isDayOff: isDayOff || false,
      isPaid: isPaid !== undefined ? isPaid : true,
    };

    if (isDayOff) {
      // Es dia libre - no necesita posicion ni horarios
      shiftData.positionId = null;
      shiftData.startTime = null;
      shiftData.endTime = null;
      shiftData.breakMinutes = 0;
      shiftData.isOpenShift = false;
      shiftData.dayOffType = dayOffType || 'DAY_OFF';
    } else {
      // Es turno normal
      shiftData.positionId = positionId;
      shiftData.startTime = new Date(`1970-01-01T${startTime}`);
      shiftData.endTime = new Date(`1970-01-01T${endTime}`);
      shiftData.breakMinutes = breakMinutes || 0;
      shiftData.isOpenShift = isOpenShift || false;
      shiftData.dayOffType = null;
    }

    const shift = await prisma.shift.create({
      data: shiftData,
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        position: { select: { id: true, name: true, color: true } }
      }
    });

    res.status(201).json(shift);
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({ error: 'Error al crear turno' });
  }
});

// Bulk create shifts
router.post('/bulk', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { shifts } = req.body;

    if (!Array.isArray(shifts) || shifts.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de turnos' });
    }

    const createdShifts = await prisma.$transaction(
      shifts.map(shift => prisma.shift.create({
        data: {
          locationId: shift.locationId,
          userId: shift.isOpenShift ? null : shift.userId,
          positionId: shift.positionId,
          date: parseLocalDate(shift.date),
          startTime: new Date(`1970-01-01T${shift.startTime}`),
          endTime: new Date(`1970-01-01T${shift.endTime}`),
          breakMinutes: shift.breakMinutes || 0,
          notes: shift.notes,
          isOpenShift: shift.isOpenShift || false
        }
      }))
    );

    res.status(201).json({ count: createdShifts.length, shifts: createdShifts });
  } catch (error) {
    console.error('Bulk create shifts error:', error);
    res.status(500).json({ error: 'Error al crear turnos' });
  }
});

// Copy week
router.post('/copy-week', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { locationId, sourceStartDate, targetStartDate } = req.body;

    const sourceStart = parseLocalDate(sourceStartDate, true); // forQuery=true
    const sourceEnd = new Date(`${sourceStartDate}T23:59:59.999Z`);
    sourceEnd.setDate(sourceEnd.getDate() + 6);

    const targetStart = parseLocalDate(targetStartDate);
    const dayDiff = Math.floor((targetStart - sourceStart) / (1000 * 60 * 60 * 24));

    // Obtener turnos de la semana origen
    const sourceShifts = await prisma.shift.findMany({
      where: {
        locationId,
        date: {
          gte: sourceStart,
          lte: sourceEnd
        }
      }
    });

    if (sourceShifts.length === 0) {
      return res.status(400).json({ error: 'No hay turnos en la semana origen' });
    }

    // Crear turnos para la semana destino
    const newShifts = await prisma.$transaction(
      sourceShifts.map(shift => {
        const newDate = new Date(shift.date);
        newDate.setDate(newDate.getDate() + dayDiff);

        return prisma.shift.create({
          data: {
            locationId: shift.locationId,
            userId: shift.userId,
            positionId: shift.positionId,
            date: newDate,
            startTime: shift.startTime,
            endTime: shift.endTime,
            breakMinutes: shift.breakMinutes,
            notes: shift.notes,
            isOpenShift: shift.isOpenShift,
            isPublished: false
          }
        });
      })
    );

    res.status(201).json({ count: newShifts.length, message: 'Semana copiada exitosamente' });
  } catch (error) {
    console.error('Copy week error:', error);
    res.status(500).json({ error: 'Error al copiar semana' });
  }
});

// Update shift
router.put('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
  try {
    const {
      userId, positionId, date, startTime, endTime, breakMinutes,
      notes, status, isOpenShift, isPublished, isDayOff, dayOffType, isPaid
    } = req.body;

    const existingShift = await prisma.shift.findUnique({
      where: { id: req.params.id }
    });

    if (!existingShift) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const updateData = {};

    // Manejar dia libre vs turno normal
    if (isDayOff !== undefined) {
      updateData.isDayOff = isDayOff;

      if (isDayOff) {
        // Es dia libre - limpiar campos de turno
        updateData.positionId = null;
        updateData.startTime = null;
        updateData.endTime = null;
        updateData.breakMinutes = 0;
        updateData.isOpenShift = false;
        updateData.dayOffType = dayOffType || 'DAY_OFF';
      } else {
        // Es turno normal
        updateData.dayOffType = null;
      }
    }

    if (userId !== undefined) updateData.userId = isOpenShift ? null : userId;
    if (!isDayOff && positionId) updateData.positionId = positionId;
    if (date) updateData.date = parseLocalDate(date);
    if (!isDayOff && startTime) updateData.startTime = new Date(`1970-01-01T${startTime}`);
    if (!isDayOff && endTime) updateData.endTime = new Date(`1970-01-01T${endTime}`);
    if (!isDayOff && breakMinutes !== undefined) updateData.breakMinutes = breakMinutes;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;
    if (!isDayOff && isOpenShift !== undefined) updateData.isOpenShift = isOpenShift;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (isPaid !== undefined) updateData.isPaid = isPaid;
    if (dayOffType !== undefined) updateData.dayOffType = dayOffType;

    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        location: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        position: { select: { id: true, name: true, color: true } }
      }
    });

    res.json(shift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Error al actualizar turno' });
  }
});

// Publish shifts
router.post('/publish', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { locationId, startDate, endDate } = req.body;

    const result = await prisma.shift.updateMany({
      where: {
        locationId,
        date: {
          gte: parseLocalDate(startDate, true),
          lte: new Date(`${endDate}T23:59:59.999Z`)
        },
        isPublished: false
      },
      data: { isPublished: true }
    });

    res.json({ count: result.count, message: 'Turnos publicados exitosamente' });
  } catch (error) {
    console.error('Publish shifts error:', error);
    res.status(500).json({ error: 'Error al publicar turnos' });
  }
});

// Delete shift
router.delete('/:id', authMiddleware, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR'), async (req, res) => {
  try {
    const existingShift = await prisma.shift.findUnique({
      where: { id: req.params.id }
    });

    if (!existingShift) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    await prisma.shift.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Turno eliminado correctamente' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Error al eliminar turno' });
  }
});

// Claim open shift (employee)
router.post('/:id/claim', authMiddleware, async (req, res) => {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id }
    });

    if (!shift) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (!shift.isOpenShift) {
      return res.status(400).json({ error: 'Este turno no esta disponible para tomar' });
    }

    if (shift.userId) {
      return res.status(400).json({ error: 'Este turno ya fue tomado' });
    }

    // Verificar que el usuario tiene acceso a la ubicacion
    const hasAccess = req.user.userLocations.some(ul => ul.locationId === shift.locationId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
    }

    const updatedShift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        userId: req.user.id,
        isOpenShift: false,
        status: 'CONFIRMED'
      },
      include: {
        location: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, color: true } }
      }
    });

    res.json(updatedShift);
  } catch (error) {
    console.error('Claim shift error:', error);
    res.status(500).json({ error: 'Error al tomar turno' });
  }
});

module.exports = router;
