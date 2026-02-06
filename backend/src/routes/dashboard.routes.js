const express = require('express');
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Dashboard principal - Vista para la central
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Determinar que ubicaciones puede ver el usuario
    let locationFilter = { companyId: req.companyId, isActive: true };

    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      locationFilter.id = { in: userLocationIds };
    }

    // Obtener todas las ubicaciones con estadisticas
    const locations = await prisma.location.findMany({
      where: locationFilter,
      include: {
        _count: {
          select: { userLocations: true }
        }
      },
      orderBy: [
        { isHeadquarters: 'desc' },
        { name: 'asc' }
      ]
    });

    // Obtener estadisticas por ubicacion
    const locationStats = await Promise.all(
      locations.map(async (location) => {
        // Turnos de hoy
        const todayShifts = await prisma.shift.count({
          where: {
            locationId: location.id,
            date: {
              gte: today,
              lt: tomorrow
            }
          }
        });

        // Empleados trabajando ahora
        const clockedIn = await prisma.timesheet.count({
          where: {
            locationId: location.id,
            date: {
              gte: today,
              lt: tomorrow
            },
            clockIn: { not: null },
            clockOut: null
          }
        });

        // Solicitudes pendientes
        const pendingRequests = await prisma.timeOffRequest.count({
          where: {
            user: {
              userLocations: {
                some: { locationId: location.id }
              }
            },
            status: 'PENDING'
          }
        });

        // Turnos sin asignar
        const openShifts = await prisma.shift.count({
          where: {
            locationId: location.id,
            isOpenShift: true,
            date: { gte: today }
          }
        });

        // Alertas (turnos sin confirmar para manana)
        const tomorrowStart = new Date(tomorrow);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

        const unconfirmedShifts = await prisma.shift.count({
          where: {
            locationId: location.id,
            date: {
              gte: tomorrowStart,
              lt: tomorrowEnd
            },
            status: 'SCHEDULED',
            isPublished: true
          }
        });

        return {
          ...location,
          stats: {
            totalEmployees: location._count.userLocations,
            todayShifts,
            clockedIn,
            pendingRequests,
            openShifts,
            alerts: unconfirmedShifts > 0 ? unconfirmedShifts : 0
          }
        };
      })
    );

    // Totales generales
    const totals = locationStats.reduce(
      (acc, loc) => ({
        totalEmployees: acc.totalEmployees + loc.stats.totalEmployees,
        todayShifts: acc.todayShifts + loc.stats.todayShifts,
        clockedIn: acc.clockedIn + loc.stats.clockedIn,
        pendingRequests: acc.pendingRequests + loc.stats.pendingRequests,
        openShifts: acc.openShifts + loc.stats.openShifts,
        alerts: acc.alerts + loc.stats.alerts
      }),
      { totalEmployees: 0, todayShifts: 0, clockedIn: 0, pendingRequests: 0, openShifts: 0, alerts: 0 }
    );

    res.json({
      locations: locationStats,
      totals,
      canViewAll: req.user.role === 'SUPER_ADMIN' || req.user.canViewAll
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard' });
  }
});

// Stats para una ubicacion especifica
router.get('/location/:locationId/stats', authMiddleware, async (req, res) => {
  try {
    const { locationId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Verificar acceso
    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const hasAccess = req.user.userLocations.some(ul => ul.locationId === locationId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a esta sucursal' });
      }
    }

    // Horas programadas
    const shifts = await prisma.shift.findMany({
      where: {
        locationId,
        date: { gte: start, lte: end }
      }
    });

    let scheduledHours = 0;
    shifts.forEach(shift => {
      const startTime = new Date(shift.startTime);
      const endTime = new Date(shift.endTime);
      const hours = (endTime - startTime) / (1000 * 60 * 60);
      scheduledHours += hours - (shift.breakMinutes / 60);
    });

    // Horas trabajadas
    const timesheets = await prisma.timesheet.findMany({
      where: {
        locationId,
        date: { gte: start, lte: end },
        totalMinutes: { not: null }
      }
    });

    const workedHours = timesheets.reduce((acc, ts) => acc + (ts.totalMinutes / 60), 0);

    // Empleados por posicion
    const employeesByPosition = await prisma.userPosition.groupBy({
      by: ['positionId'],
      where: {
        user: {
          userLocations: {
            some: { locationId }
          },
          isActive: true
        }
      },
      _count: true
    });

    const positions = await prisma.position.findMany({
      where: {
        companyId: req.companyId,
        isActive: true
      }
    });

    const positionStats = positions.map(pos => ({
      ...pos,
      employeeCount: employeesByPosition.find(e => e.positionId === pos.id)?._count || 0
    }));

    res.json({
      scheduledHours: Math.round(scheduledHours * 100) / 100,
      workedHours: Math.round(workedHours * 100) / 100,
      variance: Math.round((workedHours - scheduledHours) * 100) / 100,
      totalShifts: shifts.length,
      positionStats
    });
  } catch (error) {
    console.error('Location stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadisticas' });
  }
});

// Obtener turnos de hoy para todas las ubicaciones (vista central)
router.get('/today-shifts', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let locationFilter = {};

    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      locationFilter.locationId = { in: userLocationIds };
    }

    const shifts = await prisma.shift.findMany({
      where: {
        ...locationFilter,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        location: { select: { id: true, name: true, isHeadquarters: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        position: { select: { id: true, name: true, color: true } }
      },
      orderBy: [
        { location: { name: 'asc' } },
        { startTime: 'asc' }
      ]
    });

    // Agrupar por ubicacion
    const shiftsByLocation = shifts.reduce((acc, shift) => {
      const locId = shift.locationId;
      if (!acc[locId]) {
        acc[locId] = {
          location: shift.location,
          shifts: []
        };
      }
      acc[locId].shifts.push(shift);
      return acc;
    }, {});

    res.json(Object.values(shiftsByLocation));
  } catch (error) {
    console.error('Today shifts error:', error);
    res.status(500).json({ error: 'Error al obtener turnos de hoy' });
  }
});

// Alertas y notificaciones
router.get('/alerts', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let locationFilter = {};

    if (req.user.role !== 'SUPER_ADMIN' && !req.user.canViewAll) {
      const userLocationIds = req.user.userLocations.map(ul => ul.locationId);
      locationFilter.locationId = { in: userLocationIds };
    }

    const alerts = [];

    // Turnos sin asignar para los proximos 7 dias
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const openShifts = await prisma.shift.findMany({
      where: {
        ...locationFilter,
        isOpenShift: true,
        date: { gte: today, lte: nextWeek }
      },
      include: {
        location: { select: { name: true } },
        position: { select: { name: true } }
      }
    });

    openShifts.forEach(shift => {
      alerts.push({
        type: 'OPEN_SHIFT',
        severity: 'warning',
        message: `Turno sin asignar en ${shift.location.name} (${shift.position.name})`,
        date: shift.date,
        locationId: shift.locationId
      });
    });

    // Solicitudes pendientes
    const pendingRequests = await prisma.timeOffRequest.findMany({
      where: {
        status: 'PENDING',
        user: {
          userLocations: {
            some: locationFilter.locationId ? { locationId: locationFilter.locationId } : {}
          }
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            userLocations: {
              include: { location: { select: { name: true } } },
              where: { isPrimary: true }
            }
          }
        }
      }
    });

    pendingRequests.forEach(req => {
      const location = req.user.userLocations[0]?.location?.name || 'Sin asignar';
      alerts.push({
        type: 'PENDING_REQUEST',
        severity: 'info',
        message: `Solicitud pendiente de ${req.user.firstName} ${req.user.lastName} (${location})`,
        date: req.createdAt,
        requestId: req.id
      });
    });

    res.json(alerts.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

module.exports = router;
