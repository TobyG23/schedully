const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Helper function para obtener el rango de fechas de hoy en UTC
const getTodayRange = () => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return { today, tomorrow };
};

// Middleware para validar token de ubicacion
const validateLocationToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const location = await prisma.location.findFirst({
      where: {
        clockToken: token,
        isActive: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            timezone: true
          }
        }
      }
    });

    if (!location) {
      return res.status(404).json({ error: 'Ubicacion no encontrada o token invalido' });
    }

    req.location = location;
    next();
  } catch (error) {
    console.error('Error validando token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /api/timeclock/:token/info - Obtener info de la sucursal
router.get('/:token/info', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;

    res.json({
      id: location.id,
      name: location.name,
      companyName: location.company.name,
      timezone: location.timezone || location.company.timezone
    });
  } catch (error) {
    console.error('Error obteniendo info:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/timeclock/:token/employees - Listar empleados de la sucursal
router.get('/:token/employees', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;

    const employees = await prisma.user.findMany({
      where: {
        companyId: location.companyId,
        isActive: true,
        userLocations: {
          some: {
            locationId: location.id
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        pin: true // Incluir pin para saber si tiene uno asignado
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Devolver empleados con indicador de si tienen PIN (pero no el PIN real)
    const employeesWithPinIndicator = employees.map(emp => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      avatar: emp.avatar,
      hasPin: !!emp.pin
    }));

    res.json(employeesWithPinIndicator);
  } catch (error) {
    console.error('Error listando empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/timeclock/:token/verify-pin - Verificar PIN del empleado
router.post('/:token/verify-pin', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;
    const { employeeId, pin } = req.body;

    if (!employeeId || !pin) {
      return res.status(400).json({ error: 'employeeId y pin son requeridos' });
    }

    // Buscar el empleado
    const user = await prisma.user.findFirst({
      where: {
        id: employeeId,
        companyId: location.companyId,
        isActive: true,
        userLocations: {
          some: {
            locationId: location.id
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pin: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Si el empleado no tiene PIN configurado, permitir acceso
    if (!user.pin) {
      return res.json({ valid: true, message: 'Empleado sin PIN configurado' });
    }

    // Verificar PIN
    if (user.pin !== pin) {
      return res.status(401).json({ valid: false, error: 'PIN incorrecto' });
    }

    res.json({ valid: true, message: 'PIN verificado correctamente' });
  } catch (error) {
    console.error('Error verificando PIN:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/timeclock/:token/status/:employeeId - Estado actual del empleado
router.get('/:token/status/:employeeId', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;
    const { employeeId } = req.params;

    // Verificar que el empleado pertenece a esta ubicacion
    const userLocation = await prisma.userLocation.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id
      }
    });

    if (!userLocation) {
      return res.status(403).json({ error: 'Empleado no pertenece a esta sucursal' });
    }

    // Buscar timesheet de hoy
    const { today, tomorrow } = getTodayRange();

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!timesheet) {
      return res.json({ status: 'NOT_CLOCKED_IN', timesheet: null, canClockIn: true });
    }

    let status = 'NOT_CLOCKED_IN';
    let canClockIn = true;

    if (timesheet.clockIn && !timesheet.clockOut) {
      // Tiene entrada activa sin salida
      if (timesheet.breakStart && !timesheet.breakEnd) {
        status = 'ON_BREAK';
      } else {
        status = 'CLOCKED_IN';
      }
      canClockIn = false;
    } else if (timesheet.clockOut) {
      // Ya marcó salida - puede volver a marcar entrada (turno fraccionado)
      status = 'NOT_CLOCKED_IN';
      canClockIn = true;
    }

    res.json({
      status,
      canClockIn,
      timesheet: {
        id: timesheet.id,
        clockIn: timesheet.clockIn,
        clockOut: timesheet.clockOut,
        breakStart: timesheet.breakStart,
        breakEnd: timesheet.breakEnd
      }
    });
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/timeclock/:token/clock-in - Marcar entrada
router.post('/:token/clock-in', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId es requerido' });
    }

    // Verificar que el empleado pertenece a esta ubicacion
    const userLocation = await prisma.userLocation.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!userLocation) {
      return res.status(403).json({ error: 'Empleado no pertenece a esta sucursal' });
    }

    // Verificar que no tenga ya un clock-in activo hoy
    const { today, tomorrow } = getTodayRange();

    const existingTimesheet = await prisma.timesheet.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        clockOut: null
      }
    });

    if (existingTimesheet) {
      return res.status(400).json({ error: 'Ya tiene una entrada registrada hoy sin salida' });
    }

    // Crear timesheet
    const now = new Date();
    const timesheet = await prisma.timesheet.create({
      data: {
        locationId: location.id,
        userId: employeeId,
        date: today,
        clockIn: now,
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: 'Entrada registrada',
      timesheet: {
        id: timesheet.id,
        clockIn: timesheet.clockIn
      },
      employee: {
        firstName: userLocation.user.firstName,
        lastName: userLocation.user.lastName
      }
    });
  } catch (error) {
    console.error('Error en clock-in:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/timeclock/:token/clock-out - Marcar salida
router.post('/:token/clock-out', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId es requerido' });
    }

    // Buscar timesheet activo de hoy
    const { today, tomorrow } = getTodayRange();

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        clockIn: { not: null },
        clockOut: null
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!timesheet) {
      return res.status(400).json({ error: 'No tiene una entrada registrada hoy' });
    }

    // Si esta en break, cerrar el break primero
    const now = new Date();
    let breakEnd = timesheet.breakEnd;

    if (timesheet.breakStart && !timesheet.breakEnd) {
      breakEnd = now;
    }

    // Calcular minutos totales trabajados
    const clockInTime = new Date(timesheet.clockIn);
    let totalMinutes = Math.floor((now - clockInTime) / (1000 * 60));

    // Restar tiempo de break si existe
    if (timesheet.breakStart) {
      const breakStartTime = new Date(timesheet.breakStart);
      const breakEndTime = breakEnd ? new Date(breakEnd) : now;
      const breakMinutes = Math.floor((breakEndTime - breakStartTime) / (1000 * 60));
      totalMinutes -= breakMinutes;
    }

    // Actualizar timesheet
    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: {
        clockOut: now,
        breakEnd: breakEnd,
        totalMinutes: Math.max(0, totalMinutes),
        status: 'SUBMITTED'
      }
    });

    res.json({
      success: true,
      message: 'Salida registrada',
      timesheet: {
        id: updated.id,
        clockIn: updated.clockIn,
        clockOut: updated.clockOut,
        totalMinutes: updated.totalMinutes
      },
      employee: {
        firstName: timesheet.user.firstName,
        lastName: timesheet.user.lastName
      }
    });
  } catch (error) {
    console.error('Error en clock-out:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/timeclock/:token/break-start - Iniciar descanso
router.post('/:token/break-start', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId es requerido' });
    }

    // Buscar timesheet activo de hoy
    const { today, tomorrow } = getTodayRange();

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        clockIn: { not: null },
        clockOut: null
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!timesheet) {
      return res.status(400).json({ error: 'Debe marcar entrada primero' });
    }

    if (timesheet.breakStart && !timesheet.breakEnd) {
      return res.status(400).json({ error: 'Ya tiene un descanso en curso' });
    }

    // Actualizar timesheet
    const now = new Date();
    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: {
        breakStart: now,
        breakEnd: null
      }
    });

    res.json({
      success: true,
      message: 'Descanso iniciado',
      timesheet: {
        id: updated.id,
        breakStart: updated.breakStart
      },
      employee: {
        firstName: timesheet.user.firstName,
        lastName: timesheet.user.lastName
      }
    });
  } catch (error) {
    console.error('Error en break-start:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/timeclock/:token/break-end - Terminar descanso
router.post('/:token/break-end', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId es requerido' });
    }

    // Buscar timesheet activo de hoy
    const { today, tomorrow } = getTodayRange();

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        userId: employeeId,
        locationId: location.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        clockIn: { not: null },
        clockOut: null,
        breakStart: { not: null },
        breakEnd: null
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!timesheet) {
      return res.status(400).json({ error: 'No tiene un descanso en curso' });
    }

    // Actualizar timesheet
    const now = new Date();
    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: {
        breakEnd: now
      }
    });

    // Calcular duracion del break
    const breakMinutes = Math.floor((now - new Date(timesheet.breakStart)) / (1000 * 60));

    res.json({
      success: true,
      message: 'Descanso finalizado',
      timesheet: {
        id: updated.id,
        breakStart: updated.breakStart,
        breakEnd: updated.breakEnd,
        breakMinutes
      },
      employee: {
        firstName: timesheet.user.firstName,
        lastName: timesheet.user.lastName
      }
    });
  } catch (error) {
    console.error('Error en break-end:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/timeclock/:token/today - Registros del dia
router.get('/:token/today', validateLocationToken, async (req, res) => {
  try {
    const { location } = req;

    const { today, tomorrow } = getTodayRange();

    const timesheets = await prisma.timesheet.findMany({
      where: {
        locationId: location.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        clockIn: 'desc'
      },
      take: 20
    });

    res.json(timesheets.map(t => ({
      id: t.id,
      employee: t.user,
      clockIn: t.clockIn,
      clockOut: t.clockOut,
      breakStart: t.breakStart,
      breakEnd: t.breakEnd,
      totalMinutes: t.totalMinutes
    })));
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
